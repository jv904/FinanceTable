package com.financetable.backend.transaction.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SummaryResponse(BigDecimal balance, BigDecimal income, BigDecimal expense, BigDecimal result,
		List<CategoryAmount> expensesByCategory, List<MonthAmount> monthlyExpenses,
		List<TransactionResponse> recent) {

	public record CategoryAmount(UUID categoryId, String name, BigDecimal amount) {
	}

	/** {@code month} no formato AAAA-MM. */
	public record MonthAmount(String month, BigDecimal amount) {
	}

}
