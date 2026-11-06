package com.financetable.backend.goal;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "goals")
public class Goal {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private UUID userId;

	@Column(nullable = false, length = 150)
	private String name;

	@Column(name = "target_amount", nullable = false, precision = 14, scale = 2)
	private BigDecimal targetAmount;

	@Column(name = "saved_amount", nullable = false, precision = 14, scale = 2)
	private BigDecimal savedAmount;

	@Column(name = "target_date", nullable = false)
	private LocalDate targetDate;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Goal() {
	}

	public Goal(UUID userId, String name, BigDecimal targetAmount, BigDecimal savedAmount, LocalDate targetDate) {
		this.id = UUID.randomUUID();
		this.userId = userId;
		this.name = name;
		this.targetAmount = targetAmount;
		this.savedAmount = savedAmount;
		this.targetDate = targetDate;
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

	public void update(String name, BigDecimal targetAmount, BigDecimal savedAmount, LocalDate targetDate) {
		this.name = name;
		this.targetAmount = targetAmount;
		this.savedAmount = savedAmount;
		this.targetDate = targetDate;
	}

	public void setSavedAmount(BigDecimal savedAmount) {
		this.savedAmount = savedAmount;
	}

	public UUID getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public BigDecimal getTargetAmount() {
		return targetAmount;
	}

	public BigDecimal getSavedAmount() {
		return savedAmount;
	}

	public LocalDate getTargetDate() {
		return targetDate;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

}
