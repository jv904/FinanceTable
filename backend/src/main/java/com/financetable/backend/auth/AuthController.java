package com.financetable.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.financetable.backend.auth.dto.ForgotPasswordRequest;
import com.financetable.backend.auth.dto.LoginRequest;
import com.financetable.backend.auth.dto.MessageResponse;
import com.financetable.backend.auth.dto.RegisterRequest;
import com.financetable.backend.auth.dto.ResetPasswordRequest;
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

	AuthController(AuthenticationManager authenticationManager, SecurityContextRepository contextRepository,
			AuthService authService, PasswordResetService resetService,
			PasswordResetRequestHandler resetRequestHandler) {
		this.authenticationManager = authenticationManager;
		this.contextRepository = contextRepository;
		this.authService = authService;
		this.resetService = resetService;
		this.resetRequestHandler = resetRequestHandler;
	}

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	MessageResponse register(@Valid @RequestBody RegisterRequest request) {
		authService.register(request);
		return new MessageResponse("Conta criada com sucesso!");
	}

	@PostMapping("/login")
	UserResponse login(@Valid @RequestBody LoginRequest login, HttpServletRequest request,
			HttpServletResponse response) {
		Authentication authentication = authenticationManager.authenticate(
				UsernamePasswordAuthenticationToken.unauthenticated(login.email(), login.password()));

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

	@PostMapping("/forgot-password")
	MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
		resetRequestHandler.handle(request.email());
		return new MessageResponse("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
	}

	@PostMapping("/reset-password")
	MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
		resetService.reset(request);
		return new MessageResponse("Senha redefinida com sucesso!");
	}

}
