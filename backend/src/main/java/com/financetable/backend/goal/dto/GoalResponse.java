package com.financetable.backend.goal.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

import com.financetable.backend.goal.Goal;

public record GoalResponse(UUID id, String name, BigDecimal targetAmount, BigDecimal savedAmount,
		BigDecimal remainingAmount, int progressPercent, LocalDate targetDate) {

	private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

	public static GoalResponse from(Goal goal) {
		BigDecimal target = goal.getTargetAmount();
		BigDecimal saved = goal.getSavedAmount();
		return new GoalResponse(goal.getId(), goal.getName(), target, saved,
				target.subtract(saved).max(BigDecimal.ZERO), progressPercent(saved, target), goal.getTargetDate());
	}

	/** Arredonda para baixo: a tela só diz 100% quando a meta foi mesmo alcançada. */
	private static int progressPercent(BigDecimal saved, BigDecimal target) {
		return saved.multiply(HUNDRED).divide(target, 0, RoundingMode.DOWN).min(HUNDRED).intValue();
	}

}
