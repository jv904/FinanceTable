package com.financetable.backend.goal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

interface GoalRepository extends JpaRepository<Goal, UUID> {

	List<Goal> findByUserId(UUID userId, Sort sort);

	Optional<Goal> findByIdAndUserId(UUID id, UUID userId);

	/** Trava a linha até o fim da transação: dois registros simultâneos somam um depois do outro. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select g from Goal g where g.id = :id and g.userId = :userId")
	Optional<Goal> findForUpdate(UUID id, UUID userId);

}
