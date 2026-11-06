package com.financetable.backend.auth;

import java.util.Locale;

final class EmailNormalizer {

	private EmailNormalizer() {
	}

	static String normalize(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

}
