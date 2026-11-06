package com.financetable.backend.goal;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.financetable.backend.goal.dto.ContributionRequest;
import com.financetable.backend.goal.dto.GoalRequest;
import com.financetable.backend.goal.dto.GoalResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/goals")
class GoalController {

	private final GoalService service;

	GoalController(GoalService service) {
		this.service = service;
	}

	@GetMapping
	List<GoalResponse> list(Authentication authentication) {
		return service.list(userId(authentication)).stream().map(GoalResponse::from).toList();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	GoalResponse create(@Valid @RequestBody GoalRequest request, Authentication authentication) {
		return GoalResponse.from(service.create(userId(authentication), request));
	}

	@PutMapping("/{id}")
	GoalResponse update(@PathVariable UUID id, @Valid @RequestBody GoalRequest request,
			Authentication authentication) {
		return GoalResponse.from(service.update(userId(authentication), id, request));
	}

	@PostMapping("/{id}/contributions")
	GoalResponse addContribution(@PathVariable UUID id, @Valid @RequestBody ContributionRequest request,
			Authentication authentication) {
		return GoalResponse.from(service.addContribution(userId(authentication), id, request.amount()));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@PathVariable UUID id, Authentication authentication) {
		service.delete(userId(authentication), id);
	}

	private static UUID userId(Authentication authentication) {
		return UUID.fromString(authentication.getName());
	}

}
