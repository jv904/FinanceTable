package com.financetable.backend.transaction;

import java.time.YearMonth;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.financetable.backend.transaction.dto.SummaryResponse;

@RestController
@RequestMapping("/api/summary")
class SummaryController {

	private final SummaryService service;

	SummaryController(SummaryService service) {
		this.service = service;
	}

	@GetMapping
	SummaryResponse summary(@RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
			Authentication authentication) {
		return service.summarize(UUID.fromString(authentication.getName()), month);
	}

}
