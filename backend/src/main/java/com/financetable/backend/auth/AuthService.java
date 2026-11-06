package com.financetable.backend.auth;

import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.financetable.backend.auth.AttemptLimiter.Rule;
import com.financetable.backend.auth.dto.ChangePasswordRequest;
import com.financetable.backend.auth.dto.RegisterRequest;
import com.financetable.backend.category.CategoryService;
import com.financetable.backend.common.ApiException;
import com.financetable.backend.user.User;
import com.financetable.backend.user.UserRepository;

@Service
public class AuthService {

	private static final String EMAIL_TAKEN = "Este e-mail já está cadastrado.";

	private final UserRepository users;
	private final PasswordEncoder passwordEncoder;
	private final CategoryService categories;
	private final AttemptLimiter limiter;
	private final FindByIndexNameSessionRepository<? extends Session> sessions;

	AuthService(UserRepository users, PasswordEncoder passwordEncoder, CategoryService categories,
			AttemptLimiter limiter, FindByIndexNameSessionRepository<? extends Session> sessions) {
		this.limiter = limiter;
		this.sessions = sessions;
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.categories = categories;
	}

	@Transactional
	public void register(RegisterRequest request) {
		PasswordPolicy.validate(request.password(), request.confirmPassword());

		String email = EmailNormalizer.normalize(request.email());
		if (users.existsByEmail(email)) {
			throw new ApiException(HttpStatus.CONFLICT, EMAIL_TAKEN);
		}
		User user;
		try {
			user = users.saveAndFlush(new User(request.name().trim(), email, passwordEncoder.encode(request.password())));
		}
		catch (DataIntegrityViolationException ex) {
			// Dois cadastros simultâneos com o mesmo e-mail: a restrição do banco decide.
			throw new ApiException(HttpStatus.CONFLICT, EMAIL_TAKEN);
		}
		categories.createDefaults(user.getId());
	}

	@Transactional(readOnly = true)
	public User currentUser(Authentication authentication) {
		return users.findById(UUID.fromString(authentication.getName()))
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Faça login para continuar."));
	}

	@Transactional
	public User changeName(Authentication authentication, String name) {
		User user = currentUser(authentication);
		user.changeName(name);
		return user;
	}

	/** Troca a senha e encerra as outras sessões da conta. Quem fez a troca continua conectado. */
	@Transactional
	public void changePassword(Authentication authentication, ChangePasswordRequest request, String currentSessionId) {
		User user = currentUser(authentication);
		String key = user.getId().toString();

		// Uma sessão esquecida aberta não pode servir para adivinhar a senha atual.
		limiter.requireAllowed(Rule.PASSWORD_CHANGE, key);
		if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
			limiter.record(Rule.PASSWORD_CHANGE, key);
			throw new ApiException(HttpStatus.BAD_REQUEST, "A senha atual está incorreta.");
		}
		PasswordPolicy.validate(request.password(), request.confirmPassword());

		user.changePasswordHash(passwordEncoder.encode(request.password()));
		limiter.clear(Rule.PASSWORD_CHANGE, key);

		sessions.findByPrincipalName(key).keySet().stream()
				.filter(id -> !id.equals(currentSessionId))
				.forEach(sessions::deleteById);
	}

}
