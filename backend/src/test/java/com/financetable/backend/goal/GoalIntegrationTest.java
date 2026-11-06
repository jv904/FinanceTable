package com.financetable.backend.goal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

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

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class GoalIntegrationTest {

	private static final String API = "/api/goals";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcTemplate jdbc;

	private UUID maria;
	private UUID joao;

	@BeforeEach
	void createAccounts() throws Exception {
		jdbc.update("delete from users");
		maria = registerAccount("maria@example.com");
		joao = registerAccount("joao@example.com");
	}

	// Criar e calcular

	@Test
	void manualExample() throws Exception {
		create(maria, "Comprar um notebook", "5000.00", "2000.00", "2027-06-30")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").isNotEmpty())
				.andExpect(jsonPath("$.name").value("Comprar um notebook"))
				.andExpect(jsonPath("$.targetAmount").value(5000.0))
				.andExpect(jsonPath("$.savedAmount").value(2000.0))
				.andExpect(jsonPath("$.remainingAmount").value(3000.0))
				.andExpect(jsonPath("$.progressPercent").value(40))
				.andExpect(jsonPath("$.targetDate").value("2027-06-30"));
	}

	@Test
	void createTrimsTheNameAndAcceptsZeroSaved() throws Exception {
		create(maria, "  Viagem ", "1000", "0", "2027-01-01")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.name").value("Viagem"))
				.andExpect(jsonPath("$.progressPercent").value(0));
	}

	@Test
	void progressRoundsDownAndNeverPassesOneHundred() throws Exception {
		create(maria, "Quase", "100.00", "99.99", "2027-01-01")
				.andExpect(jsonPath("$.progressPercent").value(99))
				.andExpect(jsonPath("$.remainingAmount").value(0.01));
		create(maria, "Exata", "100.00", "100.00", "2027-01-01")
				.andExpect(jsonPath("$.progressPercent").value(100))
				.andExpect(jsonPath("$.remainingAmount").value(0));
		create(maria, "Passou", "100.00", "250.00", "2027-01-01")
				.andExpect(jsonPath("$.progressPercent").value(100))
				.andExpect(jsonPath("$.remainingAmount").value(0));
		create(maria, "Centavo em meta grande", "999999999999.99", "0.01", "2027-01-01")
				.andExpect(jsonPath("$.progressPercent").value(0));
	}

	@Test
	void createRejectsInvalidValues() throws Exception {
		for (String target : new String[] { "0", "-1" }) {
			create(maria, "Meta", target, "0", "2027-01-01")
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.detail").value("Informe um valor maior que zero."));
		}
		create(maria, "Meta", "100", "-1", "2027-01-01")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("O valor guardado não pode ser negativo."));
		create(maria, "Meta", "10.123", "0", "2027-01-01").andExpect(status().isBadRequest());
		create(maria, "Meta", "100", "1.234", "2027-01-01").andExpect(status().isBadRequest());
		create(maria, "Meta", "1000000000000", "0", "2027-01-01").andExpect(status().isBadRequest());
		create(maria, "Meta", "100", "0", "2027-02-30").andExpect(status().isBadRequest());
		assertThat(countGoals()).isZero();
	}

	@Test
	void createRejectsMissingFieldsAndLongName() throws Exception {
		mvc.perform(post(API).with(user(maria.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Preencha todos os campos obrigatórios."));

		create(maria, "   ", "100", "0", "2027-01-01")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Preencha todos os campos obrigatórios."));
		create(maria, "a".repeat(151), "100", "0", "2027-01-01")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("O nome deve ter no máximo 150 caracteres."));
		create(maria, "a".repeat(150), "100", "0", "2027-01-01").andExpect(status().isCreated());
	}

	@Test
	void pastDateAndRepeatedNameAreAccepted() throws Exception {
		create(maria, "Antiga", "100", "0", "2020-01-01").andExpect(status().isCreated());
		create(maria, "Antiga", "100", "0", "2020-01-01").andExpect(status().isCreated());
	}

	// Lista

	@Test
	void listIsOrderedByTheNearestDate() throws Exception {
		create(maria, "Distante", "100", "0", "2030-01-01");
		create(maria, "Próxima", "100", "0", "2027-01-01");
		create(maria, "Próxima, depois", "100", "0", "2027-01-01");
		create(maria, "Meio", "100", "0", "2028-01-01");

		list(maria)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[*].name", contains("Próxima", "Próxima, depois", "Meio", "Distante")));
	}

	// Editar

	@Test
	void updateChangesEveryField() throws Exception {
		UUID id = goal(maria, "Original", "100.00", "10.00", "2027-01-01");

		update(maria, id, "  Editada ", "400.00", "100.00", "2028-02-03")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Editada"))
				.andExpect(jsonPath("$.targetAmount").value(400.0))
				.andExpect(jsonPath("$.savedAmount").value(100.0))
				.andExpect(jsonPath("$.remainingAmount").value(300.0))
				.andExpect(jsonPath("$.progressPercent").value(25))
				.andExpect(jsonPath("$.targetDate").value("2028-02-03"));

		list(maria).andExpect(jsonPath("$[0].name").value("Editada"));
	}

	@Test
	void updateCanLowerTheSavedAmountToCorrectAMistake() throws Exception {
		UUID id = goal(maria, "Meta", "100.00", "80.00", "2027-01-01");

		update(maria, id, "Meta", "100.00", "30.00", "2027-01-01")
				.andExpect(jsonPath("$.progressPercent").value(30));
	}

	@Test
	void updateAppliesTheSameRulesAsCreate() throws Exception {
		UUID id = goal(maria, "Original", "100.00", "10.00", "2027-01-01");

		update(maria, id, "Editada", "0", "10", "2027-01-01").andExpect(status().isBadRequest());
		update(maria, id, "Editada", "100", "-1", "2027-01-01").andExpect(status().isBadRequest());

		assertThat(jdbc.queryForObject("select name from goals", String.class)).isEqualTo("Original");
	}

	@Test
	void updateRespondsNotFoundForUnknownGoal() throws Exception {
		update(maria, UUID.randomUUID(), "Meta", "100", "0", "2027-01-01")
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.detail").value("Meta não encontrada."));
	}

	// Registrar valor

	@Test
	void contributionAddsToTheSavedAmountExactly() throws Exception {
		UUID id = goal(maria, "Meta", "1.00", "0.10", "2027-01-01");

		contribute(maria, id, "0.20")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.savedAmount").value(0.3))
				.andExpect(jsonPath("$.remainingAmount").value(0.7))
				.andExpect(jsonPath("$.progressPercent").value(30));

		assertThat(jdbc.queryForObject("select saved_amount from goals", BigDecimal.class))
				.isEqualByComparingTo("0.30");
	}

	@Test
	void contributionRejectsInvalidValues() throws Exception {
		UUID id = goal(maria, "Meta", "100", "0", "2027-01-01");

		for (String amount : new String[] { "0", "-5" }) {
			contribute(maria, id, amount)
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.detail").value("Informe um valor maior que zero."));
		}
		contribute(maria, id, "1.234").andExpect(status().isBadRequest());
		assertThat(jdbc.queryForObject("select saved_amount from goals", BigDecimal.class))
				.isEqualByComparingTo("0");
	}

	@Test
	void contributionIsAcceptedAfterTheGoalIsReached() throws Exception {
		UUID id = goal(maria, "Meta", "100", "100", "2027-01-01");

		contribute(maria, id, "50")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.savedAmount").value(150.0))
				.andExpect(jsonPath("$.progressPercent").value(100));
	}

	@Test
	void contributionOverTheColumnLimitIsRejectedWithAMessage() throws Exception {
		UUID id = goal(maria, "Meta", "100", "999999999999.99", "2027-01-01");

		contribute(maria, id, "0.01")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("O valor guardado ultrapassa o limite permitido."));
	}

	@Test
	void simultaneousContributionsAreNotLost() throws Exception {
		UUID id = goal(maria, "Meta", "1000", "0", "2027-01-01");
		int requests = 8;

		List<Callable<Integer>> calls = new ArrayList<>();
		for (int i = 0; i < requests; i++) {
			calls.add(() -> contribute(maria, id, "10").andReturn().getResponse().getStatus());
		}
		try (ExecutorService pool = Executors.newFixedThreadPool(requests)) {
			for (Future<Integer> result : pool.invokeAll(calls)) {
				assertThat(result.get()).isEqualTo(200);
			}
		}

		assertThat(jdbc.queryForObject("select saved_amount from goals", BigDecimal.class))
				.isEqualByComparingTo("80");
	}

	// Excluir

	@Test
	void deleteRemovesTheGoal() throws Exception {
		UUID id = goal(maria, "Meta", "100", "0", "2027-01-01");

		remove(maria, id).andExpect(status().isNoContent());

		assertThat(countGoals()).isZero();
		remove(maria, id).andExpect(status().isNotFound());
	}

	// A regra mais importante do manual

	@Test
	void goalsNeverChangeTheBalance() throws Exception {
		UUID salary = categoryId(maria, "Salário");
		mvc.perform(post("/api/transactions").with(user(maria.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"description":"Pagamento","amount":1000,"type":"INCOME","categoryId":"%s","occurredOn":"2026-03-05"}
						""".formatted(salary)))
				.andExpect(status().isCreated());
		assertBalanceIs1000();

		UUID id = goal(maria, "Meta", "500", "200", "2027-01-01");
		assertBalanceIs1000();

		contribute(maria, id, "100").andExpect(status().isOk());
		assertBalanceIs1000();

		update(maria, id, "Meta", "900", "800", "2027-01-01").andExpect(status().isOk());
		assertBalanceIs1000();

		remove(maria, id).andExpect(status().isNoContent());
		assertBalanceIs1000();
		assertThat(jdbc.queryForObject("select count(*) from transactions", Long.class)).isEqualTo(1);
	}

	// Cada usuário vê apenas o que é seu

	@Test
	void anotherAccountCanNotSeeEditContributeOrDeleteTheGoal() throws Exception {
		UUID id = goal(maria, "Da Maria", "100", "10", "2027-01-01");

		list(joao).andExpect(jsonPath("$").isEmpty());
		update(joao, id, "Invadida", "1", "1", "2027-01-01").andExpect(status().isNotFound());
		contribute(joao, id, "50").andExpect(status().isNotFound());
		remove(joao, id).andExpect(status().isNotFound());

		list(maria)
				.andExpect(jsonPath("$[0].name").value("Da Maria"))
				.andExpect(jsonPath("$[0].savedAmount").value(10.0));
	}

	// Proteção da API

	@Test
	void requiresLogin() throws Exception {
		mvc.perform(get(API)).andExpect(status().isUnauthorized());
	}

	@Test
	void changesRequireCsrfToken() throws Exception {
		UUID id = goal(maria, "Meta", "100", "0", "2027-01-01");

		mvc.perform(post(API + "/" + id + "/contributions").with(user(maria.toString()))
				.contentType(MediaType.APPLICATION_JSON).content("{\"amount\":10}"))
				.andExpect(status().isForbidden());
		mvc.perform(delete(API + "/" + id).with(user(maria.toString()))).andExpect(status().isForbidden());
	}

	// Apoio

	private void assertBalanceIs1000() throws Exception {
		mvc.perform(get("/api/summary").param("month", "2026-03").with(user(maria.toString())))
				.andExpect(jsonPath("$.balance").value(1000.0));
	}

	private UUID registerAccount(String email) throws Exception {
		mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"Teste","email":"%s","password":"senha-segura-1","confirmPassword":"senha-segura-1"}
						""".formatted(email)))
				.andExpect(status().isCreated());
		return jdbc.queryForObject("select id from users where email = ?", UUID.class, email);
	}

	private UUID categoryId(UUID userId, String name) {
		return jdbc.queryForObject("select id from categories where user_id = ? and name = ?", UUID.class, userId,
				name);
	}

	private long countGoals() {
		return jdbc.queryForObject("select count(*) from goals", Long.class);
	}

	private static String json(String name, String target, String saved, String date) {
		return """
				{"name":"%s","targetAmount":%s,"savedAmount":%s,"targetDate":"%s"}
				""".formatted(name, target, saved, date);
	}

	private ResultActions create(UUID userId, String name, String target, String saved, String date)
			throws Exception {
		return mvc.perform(post(API).with(user(userId.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content(json(name, target, saved, date)));
	}

	private UUID goal(UUID userId, String name, String target, String saved, String date) throws Exception {
		create(userId, name, target, saved, date).andExpect(status().isCreated());
		return jdbc.queryForObject("select id from goals where name = ?", UUID.class, name);
	}

	private ResultActions update(UUID userId, UUID id, String name, String target, String saved, String date)
			throws Exception {
		return mvc.perform(put(API + "/" + id).with(user(userId.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content(json(name, target, saved, date)));
	}

	private ResultActions contribute(UUID userId, UUID id, String amount) throws Exception {
		return mvc.perform(post(API + "/" + id + "/contributions").with(user(userId.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content("{\"amount\":%s}".formatted(amount)));
	}

	private ResultActions remove(UUID userId, UUID id) throws Exception {
		return mvc.perform(delete(API + "/" + id).with(user(userId.toString())).with(csrf()));
	}

	private ResultActions list(UUID userId) throws Exception {
		return mvc.perform(get(API).with(user(userId.toString())));
	}

}
