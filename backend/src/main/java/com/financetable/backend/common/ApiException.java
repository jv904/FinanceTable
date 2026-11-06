package com.financetable.backend.common;

import org.springframework.http.HttpStatus;

/** Erro de regra de negócio, com uma mensagem que pode ser mostrada ao usuário. */
public class ApiException extends RuntimeException {

	private final HttpStatus status;

	public ApiException(HttpStatus status, String message) {
		super(message);
		this.status = status;
	}

	public HttpStatus getStatus() {
		return status;
	}

}
