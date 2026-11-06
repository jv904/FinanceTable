package com.financetable.backend.transaction;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.financetable.backend.transaction.dto.ReportResponse;

@RestController
@RequestMapping("/api/reports")
class ReportController {

	private static final MediaType CSV = new MediaType("text", "csv", StandardCharsets.UTF_8);

	private final ReportService service;

	ReportController(ReportService service) {
		this.service = service;
	}

	@GetMapping
	ReportResponse report(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
			Authentication authentication) {
		return service.report(userId(authentication), from, to);
	}

	@GetMapping("/export")
	ResponseEntity<byte[]> export(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
			Authentication authentication) {
		byte[] csv = service.exportCsv(userId(authentication), from, to);
		String fileName = "movimentacoes-%s-a-%s.csv".formatted(from, to);
		return ResponseEntity.ok()
				.contentType(CSV)
				.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
				.body(csv);
	}

	private static UUID userId(Authentication authentication) {
		return UUID.fromString(authentication.getName());
	}

}
