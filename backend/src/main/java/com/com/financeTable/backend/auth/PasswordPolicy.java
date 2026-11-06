package com.com.financeTable.backend.auth;

import java.nio.charset.StandardCharsets;

import org.springframework.http.HttpStatus;

import com.com.financeTable.backend.common.ApiException;

final class PasswordPolicy {

	private static final int MIN_LENGTH = 8;
	/** O BCrypt aceita até 72 bytes; caracteres acentuados ocupam mais de um byte. */
	private static final int MAX_BYTES = 72;

	private PasswordPolicy() {
	}

	static void validate(String password, String confirmPassword) {
		if (password.length() < MIN_LENGTH || password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "A senha deve ter entre 8 e 72 caracteres.");
		}
		if (!password.equals(confirmPassword)) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "As senhas informadas não são iguais.");
		}
	}

}
