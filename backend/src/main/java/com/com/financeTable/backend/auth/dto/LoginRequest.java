package com.com.financeTable.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		String email,

		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		String password) {
}
