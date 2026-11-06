package com.financetable.backend.goal;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.financetable.backend.common.ApiException;
import com.financetable.backend.goal.dto.GoalRequest;

/** Metas não tocam nas movimentações: guardar um valor não altera o saldo (seção 8 do manual). */
@Service
class GoalService {

	private static final BigDecimal MAX_AMOUNT = new BigDecimal("999999999999.99");
	private static final Sort NEAREST_FIRST = Sort.<Goal>by(Sort.Direction.ASC, Goal::getTargetDate,
			Goal::getCreatedAt, Goal::getId);
	private static final String NOT_FOUND = "Meta não encontrada.";

	private final GoalRepository goals;

	GoalService(GoalRepository goals) {
		this.goals = goals;
	}

	@Transactional(readOnly = true)
	List<Goal> list(UUID userId) {
		return goals.findByUserId(userId, NEAREST_FIRST);
	}

	@Transactional
	Goal create(UUID userId, GoalRequest request) {
		return goals.save(new Goal(userId, request.name(), request.targetAmount(), request.savedAmount(),
				request.targetDate()));
	}

	@Transactional
	Goal update(UUID userId, UUID id, GoalRequest request) {
		Goal goal = goals.findByIdAndUserId(id, userId).orElseThrow(GoalService::notFound);
		goal.update(request.name(), request.targetAmount(), request.savedAmount(), request.targetDate());
		return goal;
	}

	@Transactional
	Goal addContribution(UUID userId, UUID id, BigDecimal amount) {
		Goal goal = goals.findForUpdate(id, userId).orElseThrow(GoalService::notFound);
		BigDecimal saved = goal.getSavedAmount().add(amount);
		if (saved.compareTo(MAX_AMOUNT) > 0) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "O valor guardado ultrapassa o limite permitido.");
		}
		goal.setSavedAmount(saved);
		return goal;
	}

	@Transactional
	void delete(UUID userId, UUID id) {
		goals.delete(goals.findByIdAndUserId(id, userId).orElseThrow(GoalService::notFound));
	}

	/** Meta de outra conta responde como inexistente, para não revelar que ela existe. */
	private static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND);
	}

}
