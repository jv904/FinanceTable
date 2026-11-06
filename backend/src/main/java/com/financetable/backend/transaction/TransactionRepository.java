package com.financetable.backend.transaction;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

interface TransactionRepository extends JpaRepository<Transaction, UUID>, JpaSpecificationExecutor<Transaction> {

	@EntityGraph(attributePaths = "category")
	Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

	/** Traz a categoria junto, para não fazer uma consulta por linha da lista. */
	@Override
	@EntityGraph(attributePaths = "category")
	Page<Transaction> findAll(Specification<Transaction> specification, Pageable pageable);

}
