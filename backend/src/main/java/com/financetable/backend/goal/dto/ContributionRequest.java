package com.financetable.backend.goal.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ContributionRequest(
		@NotNull(message = "Preencha todos os campos obrigatórios.")
		@Positive(message = "Informe um valor maior que zero.")
		@Digits(integer = 12, fraction = 2, message = "Informe um valor com até 12 dígitos e 2 casas decimais.")
		BigDecimal amount) {
}
