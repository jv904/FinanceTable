package com.financetable.backend.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.financetable.backend.transaction.dto.SummaryResponse.CategoryAmount;

public record ReportResponse(LocalDate from, LocalDate to, BigDecimal income, BigDecimal expense, BigDecimal result,
		List<CategoryAmount> expensesByCategory, List<MonthResult> months) {

	/** {@code month} no formato AAAA-MM. Em mês parcial, soma só os dias dentro do período. */
	public record MonthResult(String month, BigDecimal income, BigDecimal expense, BigDecimal result) {
	}

}
