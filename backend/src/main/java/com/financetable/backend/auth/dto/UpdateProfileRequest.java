package com.financetable.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		@Size(max = 150, message = "O nome deve ter no máximo 150 caracteres.")
		String name) {

	public UpdateProfileRequest {
		name = name == null ? null : name.trim();
	}

}
