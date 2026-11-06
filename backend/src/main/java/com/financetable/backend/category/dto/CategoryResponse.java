package com.financetable.backend.category.dto;

import java.util.UUID;

import com.financetable.backend.category.Category;
import com.financetable.backend.category.CategoryType;

public record CategoryResponse(UUID id, String name, CategoryType type) {

	public static CategoryResponse from(Category category) {
		return new CategoryResponse(category.getId(), category.getName(), category.getType());
	}

}
