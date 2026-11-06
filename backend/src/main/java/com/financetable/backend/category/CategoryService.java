package com.financetable.backend.category;

import java.text.Collator;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.financetable.backend.common.ApiException;

@Service
public class CategoryService {

	private static final String NAME_TAKEN = "Já existe uma categoria com este nome.";
	private static final String NOT_FOUND = "Categoria não encontrada.";
	private static final String IN_USE = "Esta categoria possui movimentações vinculadas.";
	private static final Locale PT_BR = Locale.of("pt", "BR");

	private final CategoryRepository categories;

	CategoryService(CategoryRepository categories) {
		this.categories = categories;
	}

	@Transactional
	public void createDefaults(UUID userId) {
		categories.saveAll(DefaultCategories.forUser(userId));
	}

	@Transactional(readOnly = true)
	List<Category> list(UUID userId) {
		Comparator<Category> byName = Comparator.comparing(Category::getName, Collator.getInstance(PT_BR));
		return categories.findByUserId(userId).stream().sorted(byName).toList();
	}

	@Transactional
	Category create(UUID userId, String name, CategoryType type) {
		return saveCheckingName(new Category(userId, name, type));
	}

	@Transactional
	Category rename(UUID userId, UUID id, String name) {
		Category category = findOwned(userId, id);
		category.rename(name);
		return saveCheckingName(category);
	}

	/** A chave estrangeira das movimentações decide se a categoria está em uso, inclusive em pedidos simultâneos. */
	@Transactional
	void delete(UUID userId, UUID id) {
		Category category = findOwned(userId, id);
		try {
			categories.delete(category);
			categories.flush();
		}
		catch (DataIntegrityViolationException ex) {
			throw new ApiException(HttpStatus.CONFLICT, IN_USE);
		}
	}

	/**
	 * Categoria de outra conta responde como inexistente, para não revelar que ela existe. Deve ser chamado
	 * dentro de uma transação.
	 */
	public Category findOwned(UUID userId, UUID id) {
		return categories.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND));
	}

	/** O índice único do banco decide sobre nomes repetidos, inclusive em pedidos simultâneos. */
	private Category saveCheckingName(Category category) {
		try {
			return categories.saveAndFlush(category);
		}
		catch (DataIntegrityViolationException ex) {
			throw new ApiException(HttpStatus.CONFLICT, NAME_TAKEN);
		}
	}

}
