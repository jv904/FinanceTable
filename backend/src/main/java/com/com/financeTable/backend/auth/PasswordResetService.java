package com.com.financeTable.backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.com.financeTable.backend.auth.dto.ResetPasswordRequest;
import com.com.financeTable.backend.common.ApiException;
import com.com.financeTable.backend.config.AppProperties;
import com.com.financeTable.backend.user.User;
import com.com.financeTable.backend.user.UserRepository;

@Service
class PasswordResetService {

	/** Dados necessários para enviar o e-mail depois que o link já foi salvo. */
	record IssuedToken(String recipientName, String recipientEmail, String rawToken) {
	}

	private static final int TOKEN_BYTES = 32;
	private static final String INVALID_LINK = "Este link é inválido ou expirou. Solicite um novo.";

	private final SecureRandom random = new SecureRandom();
	private final UserRepository users;
	private final PasswordResetTokenRepository tokens;
	private final PasswordEncoder passwordEncoder;
	private final FindByIndexNameSessionRepository<? extends Session> sessions;
	private final AppProperties properties;

	PasswordResetService(UserRepository users, PasswordResetTokenRepository tokens, PasswordEncoder passwordEncoder,
			FindByIndexNameSessionRepository<? extends Session> sessions, AppProperties properties) {
		this.users = users;
		this.tokens = tokens;
		this.passwordEncoder = passwordEncoder;
		this.sessions = sessions;
		this.properties = properties;
	}

	/** Gera um novo link e invalida os anteriores. Vazio se o e-mail não estiver cadastrado. */
	@Transactional
	public Optional<IssuedToken> issue(String email) {
		return users.findByEmail(EmailNormalizer.normalize(email)).map(user -> {
			Instant now = Instant.now();
			tokens.invalidateAllForUser(user.getId(), now);

			byte[] bytes = new byte[TOKEN_BYTES];
			random.nextBytes(bytes);
			String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

			tokens.save(new PasswordResetToken(user.getId(), sha256(rawToken),
					now.plus(properties.passwordResetValidity())));
			return new IssuedToken(user.getName(), user.getEmail(), rawToken);
		});
	}

	/** Troca a senha, consome o link e encerra todas as sessões do usuário. */
	@Transactional
	public void reset(ResetPasswordRequest request) {
		PasswordPolicy.validate(request.password(), request.confirmPassword());

		Instant now = Instant.now();
		PasswordResetToken token = tokens.findByTokenHash(sha256(request.token()))
				.filter(found -> found.isUsable(now))
				.orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, INVALID_LINK));
		User user = users.findById(token.getUserId())
				.orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, INVALID_LINK));

		user.changePasswordHash(passwordEncoder.encode(request.password()));
		tokens.invalidateAllForUser(user.getId(), now);

		sessions.findByPrincipalName(user.getId().toString()).keySet().forEach(sessions::deleteById);
	}

	private static String sha256(String value) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 indisponível", ex);
		}
	}

}
