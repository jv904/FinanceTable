package com.com.financeTable.backend.category.dto;

import com.com.financeTable.backend.category.CategoryType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(
		@NotBlank(message = "Preencha todos os campos obrigatórios.")
		@Size(max = 60, message = "O nome deve ter no máximo 60 caracteres.")
		String name,

		@NotNull(message = "Preencha todos os campos obrigatórios.")
		CategoryType type) {

	public CreateCategoryRequest {
		name = name == null ? null : name.trim();
	}

}
