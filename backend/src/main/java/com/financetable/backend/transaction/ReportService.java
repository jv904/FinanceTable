package com.financetable.backend.transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.financetable.backend.category.CategoryType;
import com.financetable.backend.common.ApiException;
import com.financetable.backend.transaction.dto.ReportResponse;
import com.financetable.backend.transaction.dto.ReportResponse.MonthResult;
import com.financetable.backend.transaction.dto.SummaryResponse.CategoryAmount;

@Service
class ReportService {

	/** Limita a lista de meses e a exportação, que é montada em memória. */
	private static final int MAX_MONTHS = 60;

	private final TransactionRepository transactions;

	ReportService(TransactionRepository transactions) {
		this.transactions = transactions;
	}

	@Transactional(readOnly = true)
	ReportResponse report(UUID userId, LocalDate from, LocalDate to) {
		requireValidPeriod(from, to);
		Map<CategoryType, BigDecimal> totals = SummaryService.byType(transactions.sumByTypeBetween(userId, from, to));
		BigDecimal income = SummaryService.total(totals, CategoryType.INCOME);
		BigDecimal expense = SummaryService.total(totals, CategoryType.EXPENSE);

		return new ReportResponse(from, to, income, expense, income.subtract(expense),
				expensesByCategory(userId, from, to), months(userId, from, to));
	}

	@Transactional(readOnly = true)
	byte[] exportCsv(UUID userId, LocalDate from, LocalDate to) {
		requireValidPeriod(from, to);
		TransactionFilter inPeriod = new TransactionFilter(null, from, to, null, null);
		return TransactionCsv.write(transactions.findAll(inPeriod.toSpecification(userId), TransactionService.NEWEST_FIRST));
	}

	private List<CategoryAmount> expensesByCategory(UUID userId, LocalDate from, LocalDate to) {
		return transactions.sumByCategoryBetween(userId, CategoryType.EXPENSE, from, to).stream()
				.map(row -> new CategoryAmount(row.getCategoryId(), row.getName(), row.getTotal()))
				.toList();
	}

	/** Meses sem movimentação não vêm do banco, mas precisam aparecer como zero. */
	private List<MonthResult> months(UUID userId, LocalDate from, LocalDate to) {
		Map<YearMonth, BigDecimal> incomes = monthTotals(userId, CategoryType.INCOME, from, to);
		Map<YearMonth, BigDecimal> expenses = monthTotals(userId, CategoryType.EXPENSE, from, to);
		YearMonth first = YearMonth.from(from);

		return Stream.iterate(first, month -> month.plusMonths(1))
				.limit(ChronoUnit.MONTHS.between(first, YearMonth.from(to)) + 1)
				.map(month -> {
					BigDecimal income = incomes.getOrDefault(month, BigDecimal.ZERO);
					BigDecimal expense = expenses.getOrDefault(month, BigDecimal.ZERO);
					return new MonthResult(month.toString(), income, expense, income.subtract(expense));
				})
				.toList();
	}

	private Map<YearMonth, BigDecimal> monthTotals(UUID userId, CategoryType type, LocalDate from, LocalDate to) {
		Map<YearMonth, BigDecimal> totals = new HashMap<>();
		transactions.sumByMonthBetween(userId, type, from, to)
				.forEach(row -> totals.put(YearMonth.of(row.getYearNumber(), row.getMonthNumber()), row.getTotal()));
		return totals;
	}

	private static void requireValidPeriod(LocalDate from, LocalDate to) {
		if (from.isAfter(to)) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "A data inicial não pode ser posterior à data final.");
		}
		if (ChronoUnit.MONTHS.between(YearMonth.from(from), YearMonth.from(to)) >= MAX_MONTHS) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Escolha um período de até 5 anos.");
		}
	}

}
