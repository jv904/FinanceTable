package com.financetable.backend.category;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.financetable.backend.category.dto.CategoryResponse;
import com.financetable.backend.category.dto.CreateCategoryRequest;
import com.financetable.backend.category.dto.RenameCategoryRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/categories")
class CategoryController {

	private final CategoryService service;

	CategoryController(CategoryService service) {
		this.service = service;
	}

	@GetMapping
	List<CategoryResponse> list(Authentication authentication) {
		return service.list(userId(authentication)).stream().map(CategoryResponse::from).toList();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	CategoryResponse create(@Valid @RequestBody CreateCategoryRequest request, Authentication authentication) {
		return CategoryResponse.from(service.create(userId(authentication), request.name(), request.type()));
	}

	@PutMapping("/{id}")
	CategoryResponse rename(@PathVariable UUID id, @Valid @RequestBody RenameCategoryRequest request,
			Authentication authentication) {
		return CategoryResponse.from(service.rename(userId(authentication), id, request.name()));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@PathVariable UUID id, Authentication authentication) {
		service.delete(userId(authentication), id);
	}

	private static UUID userId(Authentication authentication) {
		return UUID.fromString(authentication.getName());
	}

}
