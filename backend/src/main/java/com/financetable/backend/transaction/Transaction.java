package com.financetable.backend.transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.financetable.backend.category.Category;
import com.financetable.backend.category.CategoryType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "transactions")
public class Transaction {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private UUID userId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "category_id", nullable = false)
	private Category category;

	@Column(nullable = false, length = 150)
	private String description;

	@Column(nullable = false, precision = 14, scale = 2)
	private BigDecimal amount;

	@Column(name = "occurred_on", nullable = false)
	private LocalDate occurredOn;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Transaction() {
	}

	public Transaction(UUID userId, Category category, String description, BigDecimal amount, LocalDate occurredOn) {
		this.id = UUID.randomUUID();
		this.userId = userId;
		this.category = category;
		this.description = description;
		this.amount = amount;
		this.occurredOn = occurredOn;
	}

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
		updatedAt = createdAt;
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	public void update(Category category, String description, BigDecimal amount, LocalDate occurredOn) {
		this.category = category;
		this.description = description;
		this.amount = amount;
		this.occurredOn = occurredOn;
	}

	public UUID getId() {
		return id;
	}

	public Category getCategory() {
		return category;
	}

	/** O tipo vem sempre da categoria, para os dois nunca divergirem. */
	public CategoryType getType() {
		return category.getType();
	}

	public String getDescription() {
		return description;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public LocalDate getOccurredOn() {
		return occurredOn;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

}
