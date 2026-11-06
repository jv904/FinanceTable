package com.com.financeTable.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		@Size(max = 150, message = "O nome deve ter no máximo 150 caracteres.")
		String name,

		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		@Email(message = "Informe um e-mail válido.")
		@Size(max = 254, message = "Informe um e-mail válido.")
		String email,

		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		String password,

		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		String confirmPassword) {

	public RegisterRequest {
		// Antes da validação: o preenchimento automático costuma incluir espaços nas pontas.
		email = email == null ? null : email.trim();
	}

}
