package com.financetable.backend.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

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
class SummaryIntegrationTest {

	private static final String TRANSACTIONS = "/api/transactions";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcTemplate jdbc;

	private UUID maria;
	private UUID joao;
	private UUID salary;
	private UUID food;
	private UUID leisure;
	private UUID transport;

	@BeforeEach
	void createAccounts() throws Exception {
		jdbc.update("delete from users");
		maria = registerAccount("maria@example.com");
		joao = registerAccount("joao@example.com");
		salary = categoryId(maria, "Salário");
		food = categoryId(maria, "Alimentação");
		leisure = categoryId(maria, "Lazer");
		transport = categoryId(maria, "Transporte");
	}

	@Test
	void manualExample() throws Exception {
		add(maria, "Pagamento", "2000.00", "INCOME", salary, "2026-03-05");
		add(maria, "Mercado", "500.00", "EXPENSE", food, "2026-03-10");

		summary(maria, "2026-03")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.balance").value(1500.0))
				.andExpect(jsonPath("$.income").value(2000.0))
				.andExpect(jsonPath("$.expense").value(500.0))
				.andExpect(jsonPath("$.result").value(1500.0));
	}

	@Test
	void emptyAccountRespondsWithZeros() throws Exception {
		summary(maria, "2026-03")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.balance").value(0))
				.andExpect(jsonPath("$.income").value(0))
				.andExpect(jsonPath("$.expense").value(0))
				.andExpect(jsonPath("$.result").value(0))
				.andExpect(jsonPath("$.expensesByCategory").isEmpty())
				.andExpect(jsonPath("$.monthlyExpenses", hasSize(6)))
				.andExpect(jsonPath("$.recent").isEmpty());
	}

	@Test
	void balanceSumsEverythingAndDoesNotDependOnTheMonth() throws Exception {
		add(maria, "Antiga", "100.00", "INCOME", salary, "2020-01-15");
		add(maria, "Futura", "30.00", "EXPENSE", food, "2030-01-15");
		add(maria, "No mês", "20.00", "EXPENSE", food, "2026-03-15");

		for (String month : new String[] { "2019-01", "2026-03", "2031-01" }) {
			summary(maria, month).andExpect(jsonPath("$.balance").value(50.0));
		}
	}

	@Test
	void balanceAndResultCanBeNegative() throws Exception {
		add(maria, "Pagamento", "100.00", "INCOME", salary, "2026-03-05");
		add(maria, "Mercado", "150.25", "EXPENSE", food, "2026-03-10");

		summary(maria, "2026-03")
				.andExpect(jsonPath("$.balance").value(-50.25))
				.andExpect(jsonPath("$.result").value(-50.25));
	}

	@Test
	void monthIncludesItsFirstAndLastDayOnly() throws Exception {
		add(maria, "Antes", "1.00", "EXPENSE", food, "2028-01-31");
		add(maria, "Primeiro dia", "2.00", "EXPENSE", food, "2028-02-01");
		add(maria, "Último dia de bissexto", "4.00", "EXPENSE", food, "2028-02-29");
		add(maria, "Depois", "8.00", "EXPENSE", food, "2028-03-01");

		summary(maria, "2028-02")
				.andExpect(jsonPath("$.expense").value(6.0))
				.andExpect(jsonPath("$.recent[*].description", contains("Último dia de bissexto", "Primeiro dia")));
	}

	@Test
	void totalsAreExactInCents() throws Exception {
		add(maria, "A", "0.10", "EXPENSE", food, "2026-03-01");
		add(maria, "B", "0.20", "EXPENSE", food, "2026-03-02");

		// Em ponto flutuante, 0.1 + 0.2 daria 0.30000000000000004.
		mvc.perform(get("/api/summary").param("month", "2026-03").with(user(maria.toString())))
				.andExpect(result -> assertThat(result.getResponse().getContentAsString())
						.contains("\"expense\":0.30"));
	}

	@Test
	void expensesByCategoryAreOrderedAndIgnoreIncome() throws Exception {
		add(maria, "Pagamento", "9999.00", "INCOME", salary, "2026-03-01");
		add(maria, "Ônibus", "50.00", "EXPENSE", transport, "2026-03-01");
		add(maria, "Mercado", "100.00", "EXPENSE", food, "2026-03-01");
		add(maria, "Feira", "50.00", "EXPENSE", food, "2026-03-02");
		add(maria, "Cinema", "50.00", "EXPENSE", leisure, "2026-03-03");
		add(maria, "Fora do mês", "500.00", "EXPENSE", transport, "2026-04-03");

		summary(maria, "2026-03")
				.andExpect(jsonPath("$.expensesByCategory[*].name", contains("Alimentação", "Lazer", "Transporte")))
				.andExpect(jsonPath("$.expensesByCategory[0].amount").value(150.0))
				.andExpect(jsonPath("$.expensesByCategory[0].categoryId").value(food.toString()));
	}

	@Test
	void monthlyExpensesFillGapsAcrossTheNewYearAndIgnoreIncome() throws Exception {
		add(maria, "Fora, antes", "1.00", "EXPENSE", food, "2026-09-30");
		add(maria, "Outubro", "10.00", "EXPENSE", food, "2026-10-15");
		add(maria, "Outubro também", "5.50", "EXPENSE", leisure, "2026-10-20");
		add(maria, "Janeiro", "20.00", "EXPENSE", food, "2027-01-01");
		add(maria, "Receita não entra", "99.00", "INCOME", salary, "2026-12-01");
		add(maria, "Março, último", "30.00", "EXPENSE", food, "2027-03-31");
		add(maria, "Fora, depois", "1.00", "EXPENSE", food, "2027-04-01");

		summary(maria, "2027-03")
				.andExpect(jsonPath("$.monthlyExpenses[*].month",
						contains("2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03")))
				.andExpect(jsonPath("$.monthlyExpenses[*].amount",
						contains(15.5, 0, 0, 20.0, 0, 30.0)));
	}

	@Test
	void recentIsLimitedToFiveAndNewestFirst() throws Exception {
		for (int day = 1; day <= 7; day++) {
			add(maria, "Dia " + day, "1.00", "EXPENSE", food, "2026-03-0" + day);
		}
		add(maria, "Outro mês", "1.00", "EXPENSE", food, "2026-04-01");

		summary(maria, "2026-03")
				.andExpect(jsonPath("$.recent[*].description", contains("Dia 7", "Dia 6", "Dia 5", "Dia 4", "Dia 3")))
				.andExpect(jsonPath("$.recent[0].categoryName").value("Alimentação"))
				.andExpect(jsonPath("$.recent[0].type").value("EXPENSE"));
	}

	@Test
	void editingAndDeletingChangeTheValues() throws Exception {
		add(maria, "Mercado", "100.00", "EXPENSE", food, "2026-03-10");
		UUID id = jdbc.queryForObject("select id from transactions", UUID.class);

		mvc.perform(put(TRANSACTIONS + "/" + id).with(user(maria.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(json("Mercado", "250.00", "EXPENSE", food, "2026-03-10")))
				.andExpect(status().isOk());
		summary(maria, "2026-03")
				.andExpect(jsonPath("$.balance").value(-250.0))
				.andExpect(jsonPath("$.expense").value(250.0));

		mvc.perform(delete(TRANSACTIONS + "/" + id).with(user(maria.toString())).with(csrf()))
				.andExpect(status().isNoContent());
		summary(maria, "2026-03")
				.andExpect(jsonPath("$.balance").value(0))
				.andExpect(jsonPath("$.expense").value(0))
				.andExpect(jsonPath("$.recent").isEmpty());
	}

	@Test
	void eachAccountSeesOnlyItsOwnValues() throws Exception {
		add(maria, "Pagamento", "2000.00", "INCOME", salary, "2026-03-05");
		add(maria, "Mercado", "500.00", "EXPENSE", food, "2026-03-10");

		summary(joao, "2026-03")
				.andExpect(jsonPath("$.balance").value(0))
				.andExpect(jsonPath("$.income").value(0))
				.andExpect(jsonPath("$.expense").value(0))
				.andExpect(jsonPath("$.expensesByCategory").isEmpty())
				.andExpect(jsonPath("$.monthlyExpenses[5].amount").value(0))
				.andExpect(jsonPath("$.recent").isEmpty());
	}

	@Test
	void requiresLogin() throws Exception {
		mvc.perform(get("/api/summary").param("month", "2026-03")).andExpect(status().isUnauthorized());
	}

	@Test
	void missingOrInvalidMonthIsRejectedInPortuguese() throws Exception {
		for (String query : new String[] { "", "?month=2026-13", "?month=março", "?month=2026-03-01" }) {
			mvc.perform(get("/api/summary" + query).with(user(maria.toString())))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.detail").value("Não foi possível ler os dados enviados."));
		}
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

	private static String json(String description, String amount, String type, UUID categoryId, String date) {
		return """
				{"description":"%s","amount":%s,"type":"%s","categoryId":"%s","occurredOn":"%s"}
				""".formatted(description, amount, type, categoryId, date);
	}

	private void add(UUID userId, String description, String amount, String type, UUID categoryId, String date)
			throws Exception {
		mvc.perform(post(TRANSACTIONS).with(user(userId.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content(json(description, amount, type, categoryId, date)))
				.andExpect(status().isCreated());
	}

	private ResultActions summary(UUID userId, String month) throws Exception {
		return mvc.perform(get("/api/summary").param("month", month).with(user(userId.toString())));
	}

}
