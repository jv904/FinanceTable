package com.financetable.backend.transaction;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.financetable.backend.category.CategoryType;
import com.financetable.backend.transaction.dto.TransactionPageResponse;
import com.financetable.backend.transaction.dto.TransactionRequest;
import com.financetable.backend.transaction.dto.TransactionResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/transactions")
class TransactionController {

	private final TransactionService service;

	TransactionController(TransactionService service) {
		this.service = service;
	}

	@GetMapping
	TransactionPageResponse list(@RequestParam(required = false) String search,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
			@RequestParam(required = false) UUID categoryId,
			@RequestParam(required = false) CategoryType type,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			Authentication authentication) {
		TransactionFilter filter = new TransactionFilter(search, from, to, categoryId, type);
		return service.list(userId(authentication), filter, page, size);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	TransactionResponse create(@Valid @RequestBody TransactionRequest request, Authentication authentication) {
		return service.create(userId(authentication), request);
	}

	@PutMapping("/{id}")
	TransactionResponse update(@PathVariable UUID id, @Valid @RequestBody TransactionRequest request,
			Authentication authentication) {
		return service.update(userId(authentication), id, request);
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
