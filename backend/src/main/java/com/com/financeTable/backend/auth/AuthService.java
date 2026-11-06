package com.com.financeTable.backend.auth;

import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.com.financeTable.backend.auth.dto.RegisterRequest;
import com.com.financeTable.backend.common.ApiException;
import com.com.financeTable.backend.user.User;
import com.com.financeTable.backend.user.UserRepository;

@Service
public class AuthService {

	private static final String EMAIL_TAKEN = "Este e-mail já está cadastrado.";

	private final UserRepository users;
	private final PasswordEncoder passwordEncoder;

	AuthService(UserRepository users, PasswordEncoder passwordEncoder) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional
	public void register(RegisterRequest request) {
		PasswordPolicy.validate(request.password(), request.confirmPassword());

		String email = EmailNormalizer.normalize(request.email());
		if (users.existsByEmail(email)) {
			throw new ApiException(HttpStatus.CONFLICT, EMAIL_TAKEN);
		}
		try {
			users.saveAndFlush(new User(request.name().trim(), email, passwordEncoder.encode(request.password())));
		}
		catch (DataIntegrityViolationException ex) {
			// Dois cadastros simultâneos com o mesmo e-mail: a restrição do banco decide.
			throw new ApiException(HttpStatus.CONFLICT, EMAIL_TAKEN);
		}
	}

	@Transactional(readOnly = true)
	public User currentUser(Authentication authentication) {
		return users.findById(UUID.fromString(authentication.getName()))
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Faça login para continuar."));
	}

}
