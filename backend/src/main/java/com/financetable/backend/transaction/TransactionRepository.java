package com.financetable.backend.transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.financetable.backend.category.CategoryType;

interface TransactionRepository extends JpaRepository<Transaction, UUID>, JpaSpecificationExecutor<Transaction> {

	interface TypeTotal {

		CategoryType getType();

		BigDecimal getTotal();

	}

	interface CategoryTotal {

		UUID getCategoryId();

		String getName();

		BigDecimal getTotal();

	}

	interface MonthTotal {

		int getYearNumber();

		int getMonthNumber();

		BigDecimal getTotal();

	}

	@Query("""
			select t.category.type as type, sum(t.amount) as total
			from Transaction t
			where t.userId = :userId
			group by t.category.type
			""")
	List<TypeTotal> sumByType(UUID userId);

	@Query("""
			select t.category.type as type, sum(t.amount) as total
			from Transaction t
			where t.userId = :userId and t.occurredOn between :from and :to
			group by t.category.type
			""")
	List<TypeTotal> sumByTypeBetween(UUID userId, LocalDate from, LocalDate to);

	@Query("""
			select t.category.id as categoryId, t.category.name as name, sum(t.amount) as total
			from Transaction t
			where t.userId = :userId and t.category.type = :type and t.occurredOn between :from and :to
			group by t.category.id, t.category.name
			order by sum(t.amount) desc, t.category.name
			""")
	List<CategoryTotal> sumByCategoryBetween(UUID userId, CategoryType type, LocalDate from, LocalDate to);

	@Query("""
			select year(t.occurredOn) as yearNumber, month(t.occurredOn) as monthNumber, sum(t.amount) as total
			from Transaction t
			where t.userId = :userId and t.category.type = :type and t.occurredOn between :from and :to
			group by year(t.occurredOn), month(t.occurredOn)
			""")
	List<MonthTotal> sumByMonthBetween(UUID userId, CategoryType type, LocalDate from, LocalDate to);

	@EntityGraph(attributePaths = "category")
	Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

	/** Traz a categoria junto, para não fazer uma consulta por linha da lista. */
	@Override
	@EntityGraph(attributePaths = "category")
	Page<Transaction> findAll(Specification<Transaction> specification, Pageable pageable);

}
