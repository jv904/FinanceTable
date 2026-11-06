package com.com.financeTable.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import com.com.financeTable.backend.TestcontainersConfig;

/**
 * Exercita cookies e CSRF com servidor e HTTP reais, como o navegador faz. O MockMvc não serve para
 * isto: o {@code csrf()} dele troca o repositório de tokens do filtro, e o ambiente simulado não
 * aplica a configuração de cookies do servidor.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfig.class)
class AuthHttpFlowIntegrationTest {

	private static final String REGISTER_JSON = """
			{"name":"Maria","email":"maria@example.com","password":"senha-segura-1","confirmPassword":"senha-segura-1"}
			""";
	private static final String LOGIN_JSON = """
			{"email":"maria@example.com","password":"senha-segura-1"}
			""";

	@LocalServerPort
	private int port;

	@Autowired
	private JdbcTemplate jdbc;

	private final HttpClient http = HttpClient.newHttpClient();
	private final Map<String, String> cookieJar = new HashMap<>();

	@BeforeEach
	void cleanDatabase() {
		jdbc.update("delete from users");
		jdbc.update("delete from spring_session");
	}

	@Test
	void anonymousRequestSendsCsrfCookieButCreatesNoSession() throws Exception {
		HttpResponse<String> response = get("/api/auth/me");

		assertThat(response.statusCode()).isEqualTo(401);
		assertThat(setCookie(response, "XSRF-TOKEN")).isNotNull().doesNotContain("HttpOnly");
		assertThat(setCookie(response, "SESSION")).isNull();
		assertThat(jdbc.queryForObject("select count(*) from spring_session", Long.class)).isZero();
	}

	@Test
	void postWithoutCsrfHeaderIsRejected() throws Exception {
		get("/api/auth/me");

		HttpResponse<String> response = send(jsonPost("/api/auth/login", LOGIN_JSON));

		assertThat(response.statusCode()).isEqualTo(403);
	}

	@Test
	void completeBrowserFlowWithCookiesAndCsrf() throws Exception {
		get("/api/auth/me");
		assertThat(postWithCsrf("/api/auth/register", REGISTER_JSON).statusCode()).isEqualTo(201);

		String tokenBeforeLogin = cookieJar.get("XSRF-TOKEN");
		HttpResponse<String> login = postWithCsrf("/api/auth/login", LOGIN_JSON);

		assertThat(login.statusCode()).isEqualTo(200);
		assertThat(setCookie(login, "SESSION")).contains("HttpOnly").contains("SameSite=Lax");
		assertThat(cookieJar.get("XSRF-TOKEN")).isNotEqualTo(tokenBeforeLogin);
		assertThat(get("/api/auth/me").statusCode()).isEqualTo(200);

		// A primeira ação após o login pode ser um POST, sem nenhum GET antes dele.
		assertThat(postWithCsrf("/api/auth/logout", "").statusCode()).isEqualTo(204);
		assertThat(get("/api/auth/me").statusCode()).isEqualTo(401);

		// Depois de sair, o GET acima devolve um novo token e o login volta a funcionar.
		assertThat(postWithCsrf("/api/auth/login", LOGIN_JSON).statusCode()).isEqualTo(200);
	}

	private HttpResponse<String> get(String path) throws IOException, InterruptedException {
		return send(request(path).GET());
	}

	private HttpResponse<String> postWithCsrf(String path, String json) throws IOException, InterruptedException {
		return send(jsonPost(path, json).header("X-XSRF-TOKEN", cookieJar.get("XSRF-TOKEN")));
	}

	private HttpRequest.Builder jsonPost(String path, String json) {
		return request(path).header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(json));
	}

	private HttpRequest.Builder request(String path) {
		return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
	}

	private HttpResponse<String> send(HttpRequest.Builder builder) throws IOException, InterruptedException {
		if (!cookieJar.isEmpty()) {
			builder.header("Cookie", cookieJar.entrySet().stream()
					.map(cookie -> cookie.getKey() + "=" + cookie.getValue())
					.collect(Collectors.joining("; ")));
		}
		HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
		storeCookies(response);
		return response;
	}

	/** Age como o navegador: guarda os cookies recebidos e descarta os que vierem vencidos. */
	private void storeCookies(HttpResponse<String> response) {
		for (String header : setCookieHeaders(response)) {
			String[] nameAndValue = header.split(";", 2)[0].split("=", 2);
			String value = nameAndValue.length > 1 ? nameAndValue[1] : "";
			if (value.isEmpty() || header.contains("Max-Age=0")) {
				cookieJar.remove(nameAndValue[0]);
			}
			else {
				cookieJar.put(nameAndValue[0], value);
			}
		}
	}

	private static String setCookie(HttpResponse<String> response, String name) {
		return setCookieHeaders(response).stream()
				.filter(header -> header.startsWith(name + "="))
				.findFirst()
				.orElse(null);
	}

	private static List<String> setCookieHeaders(HttpResponse<String> response) {
		return response.headers().allValues("Set-Cookie");
	}

}
