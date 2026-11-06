package com.financetable.backend.transaction;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.jpa.domain.Specification;

import com.financetable.backend.category.CategoryType;

import jakarta.persistence.criteria.Predicate;

/** Filtros opcionais da lista. Campo nulo ou pesquisa em branco não filtra. */
record TransactionFilter(String search, LocalDate from, LocalDate to, UUID categoryId, CategoryType type) {

	private static final char LIKE_ESCAPE = '\\';

	Specification<Transaction> toSpecification(UUID userId) {
		return (root, query, builder) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(builder.equal(root.get("userId"), userId));
			if (search != null && !search.isBlank()) {
				predicates.add(builder.like(builder.lower(root.get("description")), likePattern(search), LIKE_ESCAPE));
			}
			if (from != null) {
				predicates.add(builder.greaterThanOrEqualTo(root.get("occurredOn"), from));
			}
			if (to != null) {
				predicates.add(builder.lessThanOrEqualTo(root.get("occurredOn"), to));
			}
			if (categoryId != null) {
				predicates.add(builder.equal(root.get("category").get("id"), categoryId));
			}
			if (type != null) {
				predicates.add(builder.equal(root.get("category").get("type"), type));
			}
			return builder.and(predicates.toArray(Predicate[]::new));
		};
	}

	/** Trata "%" e "_" digitados pelo usuário como texto comum. */
	private static String likePattern(String search) {
		String escaped = search.trim().toLowerCase(Locale.ROOT)
				.replace("\\", "\\\\")
				.replace("%", "\\%")
				.replace("_", "\\_");
		return "%" + escaped + "%";
	}

}
