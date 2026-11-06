package com.financetable.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.financetable.backend.TestcontainersConfig;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthIntegrationTest {

	private static final String EMAIL = "maria@example.com";
	private static final String PASSWORD = "senha-segura-1";
	private static final Pattern TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoBean
	private JavaMailSender mailSender;

	@BeforeEach
	void cleanDatabase() {
		jdbc.update("delete from password_reset_tokens");
		jdbc.update("delete from users");
		jdbc.update("delete from spring_session");
		reset(mailSender);
	}

	// Cadastro

	@Test
	void registerCreatesAccountStoringOnlyAPasswordHash() throws Exception {
		register("Maria", EMAIL, PASSWORD, PASSWORD)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.message").value("Conta criada com sucesso!"));

		String hash = jdbc.queryForObject("select password_hash from users where email = ?", String.class, EMAIL);
		assertThat(hash).startsWith("$2").doesNotContain(PASSWORD);
	}

	@Test
	void registerDoesNotLogTheUserIn() throws Exception {
		register("Maria", EMAIL, PASSWORD, PASSWORD).andExpect(cookie().doesNotExist("SESSION"));
	}

	@Test
	void registerRejectsDuplicateEmailIgnoringCase() throws Exception {
		createAccount();

		register("Outra", "  MARIA@example.com ", PASSWORD, PASSWORD)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("Este e-mail já está cadastrado."));
	}

	@Test
	void registerRejectsBlankFields() throws Exception {
		register("", EMAIL, PASSWORD, PASSWORD)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Preencha todos os campos obrigatórios."));
	}

	@Test
	void registerRejectsInvalidEmail() throws Exception {
		register("Maria", "nao-e-email", PASSWORD, PASSWORD)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Informe um e-mail válido."));
	}

	@Test
	void registerRejectsDifferentPasswords() throws Exception {
		register("Maria", EMAIL, PASSWORD, "outra-senha-1")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("As senhas informadas não são iguais."));
	}

	@Test
	void registerRejectsShortPassword() throws Exception {
		register("Maria", EMAIL, "curta", "curta").andExpect(status().isBadRequest());
	}

	@Test
	void registerRejectsPasswordOver72BytesEvenWith72Characters() throws Exception {
		String accented = "á".repeat(72);
		register("Maria", EMAIL, accented, accented)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("A senha deve ter entre 8 e 72 caracteres."));
	}

	// Login, sessão e logout

	@Test
	void loginStartsSessionThatSurvivesAcrossRequests() throws Exception {
		createAccount();

		Cookie session = login(EMAIL, PASSWORD);

		mvc.perform(get("/api/auth/me").cookie(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Maria"))
				.andExpect(jsonPath("$.email").value(EMAIL));
	}

	@Test
	void loginIgnoresEmailCase() throws Exception {
		createAccount();

		login("MARIA@Example.com", PASSWORD);
	}

	@Test
	void loginRejectsWrongPasswordAndUnknownEmailWithTheSameMessage() throws Exception {
		createAccount();

		postLogin(EMAIL, "senha-errada-1")
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("E-mail ou senha inválidos."));
		postLogin("ninguem@example.com", PASSWORD)
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("E-mail ou senha inválidos."));
	}

	@Test
	void loginRejectsVeryLongPasswordWithoutError() throws Exception {
		createAccount();

		postLogin(EMAIL, "x".repeat(500)).andExpect(status().isUnauthorized());
	}

	@Test
	void meRequiresLogin() throws Exception {
		mvc.perform(get("/api/auth/me"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("Faça login para continuar."));
	}

	@Test
	void otherApiRoutesRequireLogin() throws Exception {
		mvc.perform(get("/api/qualquer-coisa")).andExpect(status().isUnauthorized());
	}

	@Test
	void logoutEndsTheSession() throws Exception {
		createAccount();
		Cookie session = login(EMAIL, PASSWORD);

		mvc.perform(post("/api/auth/logout").with(csrf()).cookie(session)).andExpect(status().isNoContent());

		mvc.perform(get("/api/auth/me").cookie(session)).andExpect(status().isUnauthorized());
	}

	// Recuperação de senha

	@Test
	void forgotPasswordAnswersTheSameForKnownAndUnknownEmails() throws Exception {
		createAccount();

		String known = forgot(EMAIL).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		String unknown = forgot("ninguem@example.com").andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();

		assertThat(known).isEqualTo(unknown);
		verify(mailSender, timeout(5000)).send(any(SimpleMailMessage.class));
	}

	@Test
	void forgotPasswordSendsNoEmailForUnknownAddress() throws Exception {
		forgot("ninguem@example.com").andExpect(status().isOk());

		verify(mailSender, after(500).never()).send(any(SimpleMailMessage.class));
	}

	@Test
	void resetTokenIsStoredOnlyAsHash() throws Exception {
		createAccount();

		String token = requestResetToken();

		String stored = jdbc.queryForObject("select token_hash from password_reset_tokens", String.class);
		assertThat(stored).hasSize(64).isNotEqualTo(token);
	}

	@Test
	void resetChangesPasswordAndEndsAllSessions() throws Exception {
		createAccount();
		Cookie session = login(EMAIL, PASSWORD);
		String token = requestResetToken();

		resetPassword(token, "nova-senha-123", "nova-senha-123").andExpect(status().isOk());

		mvc.perform(get("/api/auth/me").cookie(session)).andExpect(status().isUnauthorized());
		postLogin(EMAIL, PASSWORD).andExpect(status().isUnauthorized());
		login(EMAIL, "nova-senha-123");
	}

	@Test
	void resetLinkCannotBeUsedTwice() throws Exception {
		createAccount();
		String token = requestResetToken();

		resetPassword(token, "nova-senha-123", "nova-senha-123").andExpect(status().isOk());

		resetPassword(token, "outra-senha-456", "outra-senha-456")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail", containsString("inválido ou expirou")));
		login(EMAIL, "nova-senha-123");
	}

	@Test
	void expiredResetLinkIsRejected() throws Exception {
		createAccount();
		String token = requestResetToken();
		jdbc.update("update password_reset_tokens set expires_at = now() - interval '1 minute'");

		resetPassword(token, "nova-senha-123", "nova-senha-123").andExpect(status().isBadRequest());

		login(EMAIL, PASSWORD);
	}

	@Test
	void unknownResetLinkIsRejected() throws Exception {
		resetPassword("token-que-nao-existe", "nova-senha-123", "nova-senha-123")
				.andExpect(status().isBadRequest());
	}

	@Test
	void resetWithInvalidPasswordKeepsTheLinkUsable() throws Exception {
		createAccount();
		String token = requestResetToken();

		resetPassword(token, "curta", "curta").andExpect(status().isBadRequest());

		resetPassword(token, "nova-senha-123", "nova-senha-123").andExpect(status().isOk());
	}

	@Test
	void newResetRequestInvalidatesThePreviousLink() throws Exception {
		createAccount();
		String first = requestResetToken();
		reset(mailSender);
		requestResetToken();

		resetPassword(first, "nova-senha-123", "nova-senha-123").andExpect(status().isBadRequest());
	}

	// Apoio

	private ResultActions register(String name, String email, String password, String confirm) throws Exception {
		return mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"%s","email":"%s","password":"%s","confirmPassword":"%s"}
						""".formatted(name, email, password, confirm)));
	}

	private void createAccount() throws Exception {
		register("Maria", EMAIL, PASSWORD, PASSWORD).andExpect(status().isCreated());
	}

	private ResultActions postLogin(String email, String password) throws Exception {
		return mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content(loginJson(email, password)));
	}

	private Cookie login(String email, String password) throws Exception {
		Cookie session = postLogin(email, password).andExpect(status().isOk())
				.andReturn().getResponse().getCookie("SESSION");
		assertThat(session).isNotNull();
		return session;
	}

	private static String loginJson(String email, String password) {
		return """
				{"email":"%s","password":"%s"}
				""".formatted(email, password);
	}

	private ResultActions forgot(String email) throws Exception {
		return mvc.perform(post("/api/auth/forgot-password").with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"%s"}
						""".formatted(email)));
	}

	private String requestResetToken() throws Exception {
		forgot(EMAIL).andExpect(status().isOk());
		ArgumentCaptor<SimpleMailMessage> mail = ArgumentCaptor.forClass(SimpleMailMessage.class);
		verify(mailSender, timeout(5000)).send(mail.capture());
		Matcher matcher = TOKEN.matcher(mail.getValue().getText());
		assertThat(matcher.find()).isTrue();
		return matcher.group(1);
	}

	private ResultActions resetPassword(String token, String password, String confirm) throws Exception {
		return mvc.perform(post("/api/auth/reset-password").with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"token":"%s","password":"%s","confirmPassword":"%s"}
						""".formatted(token, password, confirm)));
	}

}
