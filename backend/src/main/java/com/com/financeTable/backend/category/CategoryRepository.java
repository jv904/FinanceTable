package com.com.financeTable.backend.category;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface CategoryRepository extends JpaRepository<Category, UUID> {

	List<Category> findByUserId(UUID userId);

	Optional<Category> findByIdAndUserId(UUID id, UUID userId);

}
