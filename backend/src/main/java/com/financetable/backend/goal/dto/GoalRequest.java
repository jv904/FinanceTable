package com.financetable.backend.goal.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record GoalRequest(
		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		@Size(max = 150, message = "O nome deve ter no máximo 150 caracteres.")
		String name,

		@NotNull(message = "Preencha todos os campos obrigatórios.")
		@Positive(message = "Informe um valor maior que zero.")
		@Digits(integer = 12, fraction = 2, message = "Informe um valor com até 12 dígitos e 2 casas decimais.")
		BigDecimal targetAmount,

		@NotNull(message = "Preencha todos os campos obrigatórios.")
		@PositiveOrZero(message = "O valor guardado não pode ser negativo.")
		@Digits(integer = 12, fraction = 2, message = "Informe um valor com até 12 dígitos e 2 casas decimais.")
		BigDecimal savedAmount,

		@NotNull(message = "Preencha todos os campos obrigatórios.")
		LocalDate targetDate) {

	public GoalRequest {
		name = name == null ? null : name.trim();
	}

}
