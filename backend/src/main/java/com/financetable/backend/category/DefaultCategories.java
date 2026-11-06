package com.financetable.backend.category;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

/** Categorias da seção 7 do manual. A migração V3 traz a mesma lista para as contas já existentes. */
final class DefaultCategories {

	private static final List<String> INCOME = List.of("Salário", "Investimentos", "Vendas", "Outros recebimentos");

	private static final List<String> EXPENSE = List.of("Alimentação", "Moradia", "Transporte", "Saúde", "Educação",
			"Lazer", "Compras", "Contas", "Outros gastos");

	private DefaultCategories() {
	}

	static List<Category> forUser(UUID userId) {
		return Stream.concat(
				INCOME.stream().map(name -> new Category(userId, name, CategoryType.INCOME)),
				EXPENSE.stream().map(name -> new Category(userId, name, CategoryType.EXPENSE)))
				.toList();
	}

}
