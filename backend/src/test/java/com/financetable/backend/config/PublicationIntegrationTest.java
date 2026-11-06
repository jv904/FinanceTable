package com.financetable.backend.config;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.financetable.backend.TestcontainersConfig;

/** A aplicação publicada serve o Angular e a API na mesma origem. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class PublicationIntegrationTest {

	private static final String ANGULAR = "Angular de teste";

	@Autowired
	private MockMvc mvc;

	@Test
	void reloadingAnAngularRouteDeliversTheApplication() throws Exception {
		for (String route : new String[] { "/relatorios", "/redefinir-senha?token=abc", "/rota/interna" }) {
			mvc.perform(get(route))
					.andExpect(status().isOk())
					.andExpect(content().string(containsString(ANGULAR)));
		}
	}

	/** A raiz é encaminhada pelo Spring, e o MockMvc não segue encaminhamentos. */
	@Test
	void rootForwardsToTheApplication() throws Exception {
		mvc.perform(get("/"))
				.andExpect(status().isOk())
				.andExpect(forwardedUrl("index.html"));
	}

	@Test
	void missingFileIsNotReplacedByTheApplication() throws Exception {
		mvc.perform(get("/nao-existe.js")).andExpect(status().isNotFound());
	}

	@Test
	void apiStaysProtected() throws Exception {
		mvc.perform(get("/api/transactions")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/inexistente")).andExpect(status().isUnauthorized());
	}

	@Test
	@WithMockUser
	void unknownApiRouteIsNotReplacedByTheApplication() throws Exception {
		mvc.perform(get("/api/inexistente")).andExpect(status().isNotFound());
	}

	@Test
	void securityHeadersProtectTheResetLink() throws Exception {
		mvc.perform(get("/redefinir-senha?token=abc"))
				.andExpect(header().string("Referrer-Policy", "same-origin"))
				.andExpect(header().string("Content-Security-Policy", containsString("script-src 'self'")))
				.andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'none'")));
	}

	@Test
	void healthIsPublicWithoutDetailsAndIgnoresTheMailServer() throws Exception {
		mvc.perform(get("/actuator/health"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("UP"))
				.andExpect(jsonPath("$.components").doesNotExist());
	}

	@Test
	void otherActuatorEndpointsAreNotExposed() throws Exception {
		mvc.perform(get("/actuator/env")).andExpect(status().isNotFound());
		mvc.perform(get("/actuator/beans")).andExpect(status().isNotFound());
	}

}
