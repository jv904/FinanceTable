package com.com.financeTable.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ResetPasswordRequest(
		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		String token,

		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		String password,

		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		String confirmPassword) {
}
