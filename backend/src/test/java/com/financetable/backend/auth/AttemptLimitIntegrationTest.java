package com.financetable.backend.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.financetable.backend.TestcontainersConfig;

import jakarta.servlet.http.Cookie;

@SpringBootTest(properties = {
		"app.limits.login-account.max=3",
		"app.limits.login-ip.max=6",
		"app.limits.password-change.max=2",
		"app.limits.password-reset-ip.max=2",
		"app.limits.register-ip.max=2",
		"app.limits.forgot-email.max=2",
		"app.limits.forgot-ip.max=4" })
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AttemptLimitIntegrationTest {

	private static final String PASSWORD = "senha-segura-1";
	private static final String TOO_MANY = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
	/** Os contadores vivem durante todo o contexto: cada teste usa o próprio endereço. */
	private static final AtomicInteger NEXT_IP = new AtomicInteger(1);

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private PasswordEncoder passwords;

	@MockitoBean
	private JavaMailSender mailSender;

	private String ip;

	@BeforeEach
	void setUp() {
		jdbc.update("delete from password_reset_tokens");
		jdbc.update("delete from users");
		jdbc.update("delete from spring_session");
		ip = "203.0.113." + NEXT_IP.getAndIncrement();
	}

	@Test
	void loginBlocksAfterFailuresEvenWithTheRightPassword() throws Exception {
		createUser("maria@example.com");

		for (int i = 0; i < 3; i++) {
			login("maria@example.com", "senha-errada", ip).andExpect(status().isUnauthorized());
		}

		login("maria@example.com", PASSWORD, ip)
				.andExpect(status().isTooManyRequests())
				.andExpect(jsonPath("$.detail").value(TOO_MANY));
	}

	@Test
	void successfulLoginClearsTheFailureCount() throws Exception {
		createUser("maria@example.com");

		for (int round = 0; round < 2; round++) {
			login("maria@example.com", "senha-errada", ip).andExpect(status().isUnauthorized());
			login("maria@example.com", "senha-errada", ip).andExpect(status().isUnauthorized());
			login("maria@example.com", PASSWORD, ip).andExpect(status().isOk());
		}
	}

	@Test
	void failuresFromAnotherAddressDoNotBlockTheAccountOwner() throws Exception {
		createUser("maria@example.com");

		for (int i = 0; i < 3; i++) {
			login("maria@example.com", "senha-errada", ip).andExpect(status().isUnauthorized());
		}

		login("maria@example.com", PASSWORD, "203.0.113.250").andExpect(status().isOk());
	}

	@Test
	void differentCaseInTheEmailCountsAsTheSameAccount() throws Exception {
		createUser("maria@example.com");

		login("maria@example.com", "senha-errada", ip).andExpect(status().isUnauthorized());
		login("MARIA@example.com", "senha-errada", ip).andExpect(status().isUnauthorized());
		login("Maria@Example.com", "senha-errada", ip).andExpect(status().isUnauthorized());

		login("maria@example.com", PASSWORD, ip).andExpect(status().isTooManyRequests());
	}

	@Test
	void oneAddressCannotTryManyAccounts() throws Exception {
		for (int i = 0; i < 6; i++) {
			login("conta" + i + "@example.com", "senha-errada", ip).andExpect(status().isUnauthorized());
		}

		login("outra@example.com", "senha-errada", ip).andExpect(status().isTooManyRequests());
	}

	@Test
	void registerIsLimitedByAddress() throws Exception {
		register("a@example.com", ip).andExpect(status().isCreated());
		register("b@example.com", ip).andExpect(status().isCreated());

		register("c@example.com", ip).andExpect(status().isTooManyRequests());
		register("c@example.com", "203.0.113.251").andExpect(status().isCreated());
	}

	@Test
	void forgotPasswordStopsSendingEmailButAnswersTheSameAboveTheEmailLimit() throws Exception {
		createUser("maria@example.com");

		for (int i = 0; i < 3; i++) {
			forgot("maria@example.com", ip)
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.message").value(
							"Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha."));
		}

		verify(mailSender, timeout(5000).times(2)).send(any(SimpleMailMessage.class));
		verify(mailSender, after(300).times(2)).send(any(SimpleMailMessage.class));
	}

	@Test
	void forgotPasswordIsLimitedByAddress() throws Exception {
		for (int i = 0; i < 4; i++) {
			forgot("pessoa" + i + "@example.com", ip).andExpect(status().isOk());
		}

		forgot("outra@example.com", ip).andExpect(status().isTooManyRequests());
	}

	@Test
	void resetPasswordIsLimitedByAddress() throws Exception {
		String body = """
				{"token":"invalido","password":"senha-segura-2","confirmPassword":"senha-segura-2"}
				""";
		for (int i = 0; i < 2; i++) {
			postJson("/api/auth/reset-password", body, ip).andExpect(status().isBadRequest());
		}

		postJson("/api/auth/reset-password", body, ip).andExpect(status().isTooManyRequests());
	}

	@Test
	void changePasswordBlocksAfterWrongCurrentPasswords() throws Exception {
		createUser("maria@example.com");
		Cookie session = session("maria@example.com");

		changePassword(session, "senha-errada").andExpect(status().isBadRequest());
		changePassword(session, "senha-errada").andExpect(status().isBadRequest());

		changePassword(session, PASSWORD)
				.andExpect(status().isTooManyRequests())
				.andExpect(jsonPath("$.detail").value(TOO_MANY));
	}

	private void createUser(String email) {
		jdbc.update("""
				insert into users (id, name, email, password_hash, created_at, updated_at)
				values (gen_random_uuid(), 'Maria', ?, ?, now(), now())
				""", email, passwords.encode(PASSWORD));
	}

	private Cookie session(String email) throws Exception {
		return login(email, PASSWORD, "203.0.113.252")
				.andExpect(status().isOk())
				.andReturn().getResponse().getCookie("SESSION");
	}

	private ResultActions login(String email, String password, String address) throws Exception {
		return postJson("/api/auth/login", """
				{"email":"%s","password":"%s"}
				""".formatted(email, password), address);
	}

	private ResultActions register(String email, String address) throws Exception {
		return postJson("/api/auth/register", """
				{"name":"Maria","email":"%s","password":"%s","confirmPassword":"%s"}
				""".formatted(email, PASSWORD, PASSWORD), address);
	}

	private ResultActions forgot(String email, String address) throws Exception {
		return postJson("/api/auth/forgot-password", """
				{"email":"%s"}
				""".formatted(email), address);
	}

	private ResultActions changePassword(Cookie session, String current) throws Exception {
		return mvc.perform(post("/api/auth/change-password").cookie(session).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"currentPassword":"%s","password":"senha-segura-2","confirmPassword":"senha-segura-2"}
						""".formatted(current)));
	}

	private ResultActions postJson(String path, String body, String address) throws Exception {
		return mvc.perform(post(path).with(csrf())
				.with(request -> {
					request.setRemoteAddr(address);
					return request;
				})
				.contentType(MediaType.APPLICATION_JSON)
				.content(body));
	}

}
