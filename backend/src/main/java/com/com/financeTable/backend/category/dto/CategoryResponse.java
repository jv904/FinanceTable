package com.com.financeTable.backend.category.dto;

import java.util.UUID;

import com.com.financeTable.backend.category.Category;
import com.com.financeTable.backend.category.CategoryType;

public record CategoryResponse(UUID id, String name, CategoryType type) {

	public static CategoryResponse from(Category category) {
		return new CategoryResponse(category.getId(), category.getName(), category.getType());
	}

}
