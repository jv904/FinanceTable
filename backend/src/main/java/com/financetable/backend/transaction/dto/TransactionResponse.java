package com.financetable.backend.transaction.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.financetable.backend.category.CategoryType;
import com.financetable.backend.transaction.Transaction;

public record TransactionResponse(UUID id, String description, BigDecimal amount, CategoryType type, UUID categoryId,
		String categoryName, LocalDate occurredOn, Instant createdAt) {

	public static TransactionResponse from(Transaction transaction) {
		return new TransactionResponse(transaction.getId(), transaction.getDescription(), transaction.getAmount(),
				transaction.getType(), transaction.getCategory().getId(), transaction.getCategory().getName(),
				transaction.getOccurredOn(), transaction.getCreatedAt());
	}

}
