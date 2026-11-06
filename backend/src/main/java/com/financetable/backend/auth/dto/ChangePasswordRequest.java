package com.financetable.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		String currentPassword,

		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		String password,

		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		String confirmPassword) {
}
