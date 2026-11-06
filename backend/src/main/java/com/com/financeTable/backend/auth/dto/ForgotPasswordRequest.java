package com.com.financeTable.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		@Email(message = "Informe um e-mail válido.")
		String email) {

	public ForgotPasswordRequest {
		// Antes da validação: o preenchimento automático costuma incluir espaços nas pontas.
		email = email == null ? null : email.trim();
	}

}
