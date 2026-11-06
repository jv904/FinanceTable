package com.com.financeTable.backend.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameCategoryRequest(
		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		@Size(max = 60, message = "O nome deve ter no máximo 60 caracteres.")
		String name) {

	public RenameCategoryRequest {
		name = name == null ? null : name.trim();
	}

}
