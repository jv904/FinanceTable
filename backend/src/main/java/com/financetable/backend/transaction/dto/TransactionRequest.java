package com.financetable.backend.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import com.financetable.backend.category.CategoryType;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record TransactionRequest(
		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		@Size(max = 150, message = "A descrição deve ter no máximo 150 caracteres.")
		String description,

		@NotNull(message = "Preencha todos os campos obrigatórios.")
		@Positive(message = "Informe um valor maior que zero.")
		@Digits(integer = 12, fraction = 2, message = "Informe um valor com até 12 dígitos e 2 casas decimais.")
		BigDecimal amount,

		@NotNull(message = "Preencha todos os campos obrigatórios.")
		CategoryType type,

		@NotNull(message = "Preencha todos os campos obrigatórios.")
		UUID categoryId,

		@NotNull(message = "Preencha todos os campos obrigatórios.")
		LocalDate occurredOn) {

	public TransactionRequest {
		description = description == null ? null : description.trim();
	}

}
