package com.financetable.backend.transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.financetable.backend.category.CategoryType;
import com.financetable.backend.transaction.TransactionRepository.TypeTotal;
import com.financetable.backend.transaction.dto.SummaryResponse;
import com.financetable.backend.transaction.dto.SummaryResponse.CategoryAmount;
import com.financetable.backend.transaction.dto.SummaryResponse.MonthAmount;
import com.financetable.backend.transaction.dto.TransactionResponse;

@Service
class SummaryService {

	private static final int TREND_MONTHS = 6;
	private static final int RECENT_SIZE = 5;

	private final TransactionRepository transactions;

	SummaryService(TransactionRepository transactions) {
		this.transactions = transactions;
	}

	@Transactional(readOnly = true)
	SummaryResponse summarize(UUID userId, YearMonth month) {
		LocalDate from = month.atDay(1);
		LocalDate to = month.atEndOfMonth();

		Map<CategoryType, BigDecimal> allTime = byType(transactions.sumByType(userId));
		Map<CategoryType, BigDecimal> inMonth = byType(transactions.sumByTypeBetween(userId, from, to));
		BigDecimal income = total(inMonth, CategoryType.INCOME);
		BigDecimal expense = total(inMonth, CategoryType.EXPENSE);

		return new SummaryResponse(
				total(allTime, CategoryType.INCOME).subtract(total(allTime, CategoryType.EXPENSE)),
				income,
				expense,
				income.subtract(expense),
				expensesByCategory(userId, from, to),
				monthlyExpenses(userId, month),
				recent(userId, from, to));
	}

	private List<CategoryAmount> expensesByCategory(UUID userId, LocalDate from, LocalDate to) {
		return transactions.sumByCategoryBetween(userId, CategoryType.EXPENSE, from, to).stream()
				.map(row -> new CategoryAmount(row.getCategoryId(), row.getName(), row.getTotal()))
				.toList();
	}

	/** Meses sem despesa não vêm do banco, mas precisam aparecer como zero no gráfico. */
	private List<MonthAmount> monthlyExpenses(UUID userId, YearMonth last) {
		YearMonth first = last.minusMonths(TREND_MONTHS - 1L);
		Map<YearMonth, BigDecimal> totals = new HashMap<>();
		transactions.sumByMonthBetween(userId, CategoryType.EXPENSE, first.atDay(1), last.atEndOfMonth())
				.forEach(row -> totals.put(YearMonth.of(row.getYearNumber(), row.getMonthNumber()), row.getTotal()));

		return Stream.iterate(first, month -> month.plusMonths(1))
				.limit(TREND_MONTHS)
				.map(month -> new MonthAmount(month.toString(), totals.getOrDefault(month, BigDecimal.ZERO)))
				.toList();
	}

	private List<TransactionResponse> recent(UUID userId, LocalDate from, LocalDate to) {
		TransactionFilter inMonth = new TransactionFilter(null, from, to, null, null);
		PageRequest firstRows = PageRequest.of(0, RECENT_SIZE, TransactionService.NEWEST_FIRST);
		return transactions.findAll(inMonth.toSpecification(userId), firstRows)
				.map(TransactionResponse::from)
				.getContent();
	}

	private static Map<CategoryType, BigDecimal> byType(List<TypeTotal> rows) {
		Map<CategoryType, BigDecimal> totals = new HashMap<>();
		rows.forEach(row -> totals.put(row.getType(), row.getTotal()));
		return totals;
	}

	private static BigDecimal total(Map<CategoryType, BigDecimal> totals, CategoryType type) {
		return totals.getOrDefault(type, BigDecimal.ZERO);
	}

}
