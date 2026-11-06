package com.financetable.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.financetable.backend.TestcontainersConfig;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class ProfileIntegrationTest {

	private static final String EMAIL = "maria@example.com";
	private static final String PASSWORD = "senha-segura-1";
	private static final String NEW_PASSWORD = "senha-segura-2";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcTemplate jdbc;

	@BeforeEach
	void setUp() throws Exception {
		jdbc.update("delete from password_reset_tokens");
		jdbc.update("delete from users");
		jdbc.update("delete from spring_session");
		mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
				{"name":"Maria","email":"%s","password":"%s","confirmPassword":"%s"}
				""".formatted(EMAIL, PASSWORD, PASSWORD))).andExpect(status().isCreated());
	}

	// Nome

	@Test
	void changeNameKeepsTheEmailAndRemovesOuterSpaces() throws Exception {
		Cookie session = login(PASSWORD);

		changeName(session, "  Maria Silva  ")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Maria Silva"))
				.andExpect(jsonPath("$.email").value(EMAIL));

		mvc.perform(get("/api/auth/me").cookie(session)).andExpect(jsonPath("$.name").value("Maria Silva"));
	}

	@Test
	void changeNameRejectsBlankAndTooLong() throws Exception {
		Cookie session = login(PASSWORD);

		changeName(session, "   ")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Preencha todos os campos obrigatórios."));
		changeName(session, "a".repeat(151))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("O nome deve ter no máximo 150 caracteres."));

		mvc.perform(get("/api/auth/me").cookie(session)).andExpect(jsonPath("$.name").value("Maria"));
	}

	@Test
	void changeNameRequiresLogin() throws Exception {
		mvc.perform(patch("/api/auth/me").with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"Outra\"}")).andExpect(status().isUnauthorized());
	}

	@Test
	void changeNameOnlyAffectsTheLoggedInAccount() throws Exception {
		mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
				{"name":"Joana","email":"joana@example.com","password":"%s","confirmPassword":"%s"}
				""".formatted(PASSWORD, PASSWORD))).andExpect(status().isCreated());

		changeName(login(PASSWORD), "Maria Silva").andExpect(status().isOk());

		assertThat(jdbc.queryForObject("select name from users where email = 'joana@example.com'", String.class))
				.isEqualTo("Joana");
	}

	// Senha

	@Test
	void changePasswordReplacesTheOldOne() throws Exception {
		changePassword(login(PASSWORD), PASSWORD, NEW_PASSWORD, NEW_PASSWORD)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Senha alterada com sucesso!"));

		postLogin(PASSWORD).andExpect(status().isUnauthorized());
		postLogin(NEW_PASSWORD).andExpect(status().isOk());
	}

	@Test
	void changePasswordEndsOtherSessionsAndKeepsThisOneWithANewId() throws Exception {
		Cookie other = login(PASSWORD);
		Cookie current = login(PASSWORD);

		Cookie renewed = changePassword(current, PASSWORD, NEW_PASSWORD, NEW_PASSWORD)
				.andExpect(status().isOk())
				.andReturn().getResponse().getCookie("SESSION");

		assertThat(renewed).isNotNull();
		assertThat(renewed.getValue()).isNotEqualTo(current.getValue());
		mvc.perform(get("/api/auth/me").cookie(renewed)).andExpect(status().isOk());
		mvc.perform(get("/api/auth/me").cookie(current)).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/auth/me").cookie(other)).andExpect(status().isUnauthorized());
	}

	@Test
	void wrongCurrentPasswordChangesNothing() throws Exception {
		Cookie other = login(PASSWORD);

		changePassword(login(PASSWORD), "senha-errada", NEW_PASSWORD, NEW_PASSWORD)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("A senha atual está incorreta."));

		postLogin(PASSWORD).andExpect(status().isOk());
		mvc.perform(get("/api/auth/me").cookie(other)).andExpect(status().isOk());
	}

	@Test
	void newPasswordFollowsThePolicy() throws Exception {
		Cookie session = login(PASSWORD);

		changePassword(session, PASSWORD, "curta", "curta")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("A senha deve ter entre 8 e 72 caracteres."));
		changePassword(session, PASSWORD, NEW_PASSWORD, "senha-diferente")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("As senhas informadas não são iguais."));

		postLogin(PASSWORD).andExpect(status().isOk());
	}

	@Test
	void changePasswordRequiresLoginAndAllFields() throws Exception {
		mvc.perform(post("/api/auth/change-password").with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content(body(PASSWORD, NEW_PASSWORD, NEW_PASSWORD))).andExpect(status().isUnauthorized());

		changePassword(login(PASSWORD), "", NEW_PASSWORD, NEW_PASSWORD)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Preencha todos os campos obrigatórios."));
	}

	private ResultActions postLogin(String password) throws Exception {
		return mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
				{"email":"%s","password":"%s"}
				""".formatted(EMAIL, password)));
	}

	private Cookie login(String password) throws Exception {
		return postLogin(password).andExpect(status().isOk()).andReturn().getResponse().getCookie("SESSION");
	}

	private ResultActions changeName(Cookie session, String name) throws Exception {
		return mvc.perform(patch("/api/auth/me").cookie(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"%s\"}".formatted(name)));
	}

	private ResultActions changePassword(Cookie session, String current, String password, String confirm)
			throws Exception {
		return mvc.perform(post("/api/auth/change-password").cookie(session).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content(body(current, password, confirm)));
	}

	private static String body(String current, String password, String confirm) {
		return """
				{"currentPassword":"%s","password":"%s","confirmPassword":"%s"}
				""".formatted(current, password, confirm);
	}

}
