package com.financetable.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.financetable.backend.auth.AttemptLimiter.Rule;
import com.financetable.backend.auth.dto.ChangePasswordRequest;
import com.financetable.backend.auth.dto.ForgotPasswordRequest;
import com.financetable.backend.auth.dto.LoginRequest;
import com.financetable.backend.auth.dto.MessageResponse;
import com.financetable.backend.auth.dto.RegisterRequest;
import com.financetable.backend.auth.dto.ResetPasswordRequest;
import com.financetable.backend.auth.dto.UpdateProfileRequest;
import com.financetable.backend.auth.dto.UserResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
class AuthController {

	private final AuthenticationManager authenticationManager;
	private final SecurityContextRepository contextRepository;
	// O cookie CSRF precisa ser legível: o Angular lê o valor e o devolve no cabeçalho X-XSRF-TOKEN.
	// Quem protege a sessão é o cookie SESSION, que é HttpOnly.
	@SuppressWarnings("java:S3330")
	private final CsrfTokenRepository csrfTokens = CookieCsrfTokenRepository.withHttpOnlyFalse();
	private final AuthService authService;
	private final PasswordResetService resetService;
	private final PasswordResetRequestHandler resetRequestHandler;
	private final AttemptLimiter limiter;

	AuthController(AuthenticationManager authenticationManager, SecurityContextRepository contextRepository,
			AuthService authService, PasswordResetService resetService,
			PasswordResetRequestHandler resetRequestHandler, AttemptLimiter limiter) {
		this.limiter = limiter;
		this.authenticationManager = authenticationManager;
		this.contextRepository = contextRepository;
		this.authService = authService;
		this.resetService = resetService;
		this.resetRequestHandler = resetRequestHandler;
	}

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	MessageResponse register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request) {
		limiter.consume(Rule.REGISTER_IP, request.getRemoteAddr());
		authService.register(body);
		return new MessageResponse("Conta criada com sucesso!");
	}

	@PostMapping("/login")
	UserResponse login(@Valid @RequestBody LoginRequest login, HttpServletRequest request,
			HttpServletResponse response) {
		Authentication authentication = authenticate(login, request.getRemoteAddr());

		// Evita fixação de sessão: uma sessão anterior ao login não continua com o mesmo id.
		if (request.getSession(false) != null) {
			request.changeSessionId();
		}

		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authentication);
		SecurityContextHolder.setContext(context);
		contextRepository.saveContext(context, request, response);

		// Troca o token CSRF e já envia o novo cookie: a próxima ação pode ser um POST.
		csrfTokens.saveToken(csrfTokens.generateToken(request), request, response);

		return UserResponse.from(authService.currentUser(authentication));
	}

	@GetMapping("/me")
	UserResponse me(Authentication authentication) {
		return UserResponse.from(authService.currentUser(authentication));
	}

	@PatchMapping("/me")
	UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest body, Authentication authentication) {
		return UserResponse.from(authService.changeName(authentication, body.name()));
	}

	@PostMapping("/change-password")
	MessageResponse changePassword(@Valid @RequestBody ChangePasswordRequest body, Authentication authentication,
			HttpServletRequest request) {
		authService.changePassword(authentication, body, request.getSession().getId());
		request.changeSessionId();
		return new MessageResponse("Senha alterada com sucesso!");
	}

	@PostMapping("/forgot-password")
	MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest body, HttpServletRequest request) {
		limiter.consume(Rule.FORGOT_IP, request.getRemoteAddr());
		// Acima do limite por e-mail, a resposta é a mesma: um erro revelaria os pedidos feitos para o endereço.
		if (limiter.tryConsume(Rule.FORGOT_EMAIL, EmailNormalizer.normalize(body.email()))) {
			resetRequestHandler.handle(body.email());
		}
		return new MessageResponse("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
	}

	@PostMapping("/reset-password")
	MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest body, HttpServletRequest request) {
		limiter.consume(Rule.PASSWORD_RESET_IP, request.getRemoteAddr());
		resetService.reset(body);
		return new MessageResponse("Senha redefinida com sucesso!");
	}

	/**
	 * Conta só as falhas. A chave junta e-mail e IP para que ninguém consiga bloquear a conta de outra
	 * pessoa de propósito. O limite por IP não zera com um acerto: quem tem uma conta própria poderia
	 * usá-la para continuar tentando em outras.
	 */
	private Authentication authenticate(LoginRequest login, String ip) {
		String account = EmailNormalizer.normalize(login.email()) + "|" + ip;
		limiter.requireAllowed(Rule.LOGIN_ACCOUNT, account);
		limiter.requireAllowed(Rule.LOGIN_IP, ip);
		try {
			Authentication authentication = authenticationManager.authenticate(
					UsernamePasswordAuthenticationToken.unauthenticated(login.email(), login.password()));
			limiter.clear(Rule.LOGIN_ACCOUNT, account);
			return authentication;
		}
		catch (AuthenticationException ex) {
			limiter.record(Rule.LOGIN_ACCOUNT, account);
			limiter.record(Rule.LOGIN_IP, ip);
			throw ex;
		}
	}

}
