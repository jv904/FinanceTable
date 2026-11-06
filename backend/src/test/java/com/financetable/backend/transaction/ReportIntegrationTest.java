package com.financetable.backend.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.financetable.backend.TestcontainersConfig;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class ReportIntegrationTest {

	private static final String REPORTS = "/api/reports";
	private static final String EXPORT = "/api/reports/export";
	private static final String TRANSACTIONS = "/api/transactions";
	private static final String BOM = "﻿";
	private static final String CSV_HEADER = "Data;Descrição;Tipo;Categoria;Valor\r\n";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcTemplate jdbc;

	private UUID maria;
	private UUID joao;
	private UUID salary;
	private UUID food;
	private UUID leisure;

	@BeforeEach
	void createAccounts() throws Exception {
		jdbc.update("delete from users");
		maria = registerAccount("maria@example.com");
		joao = registerAccount("joao@example.com");
		salary = categoryId(maria, "Salário");
		food = categoryId(maria, "Alimentação");
		leisure = categoryId(maria, "Lazer");
	}

	@Test
	void sumsThePeriodAndOrdersCategoriesByLargestExpense() throws Exception {
		add("Pagamento", "2000.00", "INCOME", salary, "2026-03-05");
		add("Cinema", "100.00", "EXPENSE", leisure, "2026-03-10");
		add("Mercado", "500.00", "EXPENSE", food, "2026-03-11");

		report(maria, "2026-03-01", "2026-03-31")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.from").value("2026-03-01"))
				.andExpect(jsonPath("$.to").value("2026-03-31"))
				.andExpect(jsonPath("$.income").value(2000.0))
				.andExpect(jsonPath("$.expense").value(600.0))
				.andExpect(jsonPath("$.result").value(1400.0))
				.andExpect(jsonPath("$.expensesByCategory[*].name", contains("Alimentação", "Lazer")))
				.andExpect(jsonPath("$.expensesByCategory[0].amount").value(500.0));
	}

	@Test
	void monthsWithoutTransactionsAppearAsZero() throws Exception {
		add("Pagamento", "1000.00", "INCOME", salary, "2026-01-05");
		add("Mercado", "300.00", "EXPENSE", food, "2026-03-11");

		report(maria, "2026-01-01", "2026-03-31")
				.andExpect(jsonPath("$.months[*].month", contains("2026-01", "2026-02", "2026-03")))
				.andExpect(jsonPath("$.months[0].income").value(1000.0))
				.andExpect(jsonPath("$.months[0].result").value(1000.0))
				.andExpect(jsonPath("$.months[1].income").value(0))
				.andExpect(jsonPath("$.months[1].expense").value(0))
				.andExpect(jsonPath("$.months[1].result").value(0))
				.andExpect(jsonPath("$.months[2].expense").value(300.0))
				.andExpect(jsonPath("$.months[2].result").value(-300.0));
	}

	@Test
	void includesBothEndsOfThePeriodAndIgnoresDaysOutsideIt() throws Exception {
		add("Antes", "1.00", "EXPENSE", food, "2026-01-14");
		add("Primeiro dia", "10.00", "EXPENSE", food, "2026-01-15");
		add("Último dia", "20.00", "EXPENSE", food, "2026-02-10");
		add("Depois", "2.00", "EXPENSE", food, "2026-02-11");

		report(maria, "2026-01-15", "2026-02-10")
				.andExpect(jsonPath("$.expense").value(30.0))
				.andExpect(jsonPath("$.months", hasSize(2)))
				.andExpect(jsonPath("$.months[0].expense").value(10.0))
				.andExpect(jsonPath("$.months[1].expense").value(20.0));
	}

	@Test
	void singleDayPeriodIsValid() throws Exception {
		add("Mercado", "10.00", "EXPENSE", food, "2026-03-10");

		report(maria, "2026-03-10", "2026-03-10")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.expense").value(10.0))
				.andExpect(jsonPath("$.months", hasSize(1)));
	}

	@Test
	void emptyPeriodRespondsWithZeros() throws Exception {
		report(maria, "2026-03-01", "2026-03-31")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.income").value(0))
				.andExpect(jsonPath("$.expense").value(0))
				.andExpect(jsonPath("$.result").value(0))
				.andExpect(jsonPath("$.expensesByCategory").isEmpty())
				.andExpect(jsonPath("$.months", hasSize(1)));
	}

	@Test
	void eachAccountSeesOnlyItsOwnValues() throws Exception {
		add("Pagamento", "2000.00", "INCOME", salary, "2026-03-05");
		add("Mercado", "500.00", "EXPENSE", food, "2026-03-11");

		report(joao, "2026-03-01", "2026-03-31")
				.andExpect(jsonPath("$.income").value(0))
				.andExpect(jsonPath("$.expense").value(0))
				.andExpect(jsonPath("$.expensesByCategory").isEmpty())
				.andExpect(jsonPath("$.months[0].expense").value(0));
		assertThat(csv(joao, "2026-03-01", "2026-03-31")).isEqualTo(BOM + CSV_HEADER);
	}

	@Test
	void requiresLogin() throws Exception {
		mvc.perform(get(REPORTS).param("from", "2026-03-01").param("to", "2026-03-31"))
				.andExpect(status().isUnauthorized());
		mvc.perform(get(EXPORT).param("from", "2026-03-01").param("to", "2026-03-31"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void invertedPeriodIsRejected() throws Exception {
		for (String path : new String[] { REPORTS, EXPORT }) {
			request(path, maria, "2026-03-02", "2026-03-01")
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.detail").value("A data inicial não pode ser posterior à data final."));
		}
	}

	@Test
	void periodIsLimitedToFiveYears() throws Exception {
		report(maria, "2021-01-01", "2025-12-31")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.months", hasSize(60)));

		for (String path : new String[] { REPORTS, EXPORT }) {
			request(path, maria, "2021-01-01", "2026-01-01")
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.detail").value("Escolha um período de até 5 anos."));
		}
	}

	@Test
	void missingOrInvalidDatesAreRejectedInPortuguese() throws Exception {
		for (String query : new String[] { "", "?from=2026-03-01", "?from=ontem&to=2026-03-31", "?from=2026-03&to=2026-04" }) {
			mvc.perform(get(REPORTS + query).with(user(maria.toString())))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.detail").value("Não foi possível ler os dados enviados."));
		}
	}

	@Test
	void exportsTheNewestFirstInBrazilianFormat() throws Exception {
		add("Antiga", "1250.50", "INCOME", salary, "2026-03-05");
		add("Recente", "99.90", "EXPENSE", food, "2026-03-20");
		add("Fora do período", "5.00", "EXPENSE", food, "2026-04-01");

		assertThat(csv(maria, "2026-03-01", "2026-03-31")).isEqualTo(BOM + CSV_HEADER
				+ "20/03/2026;Recente;Despesa;Alimentação;99,90\r\n"
				+ "05/03/2026;Antiga;Receita;Salário;1250,50\r\n");
	}

	@Test
	void exportIsDownloadedAsAnAttachment() throws Exception {
		request(EXPORT, maria, "2026-03-01", "2026-03-31")
				.andExpect(status().isOk())
				.andExpect(content().contentType("text/csv;charset=UTF-8"))
				.andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
						containsString("attachment; filename=\"movimentacoes-2026-03-01-a-2026-03-31.csv\"")));
	}

	@Test
	void exportQuotesSeparatorsAndQuotes() throws Exception {
		add("Pão; leite", "1.00", "EXPENSE", food, "2026-03-02");
		add("O \\\"bom\\\" mercado", "2.00", "EXPENSE", food, "2026-03-01");

		assertThat(csv(maria, "2026-03-01", "2026-03-31")).isEqualTo(BOM + CSV_HEADER
				+ "02/03/2026;\"Pão; leite\";Despesa;Alimentação;1,00\r\n"
				+ "01/03/2026;\"O \"\"bom\"\" mercado\";Despesa;Alimentação;2,00\r\n");
	}

	@Test
	void exportDoesNotLetTheSpreadsheetRunFormulas() throws Exception {
		String[] attacks = { "=1+1", "+1+1", "-1+1", "@SOMA(A1)" };
		for (int day = 0; day < attacks.length; day++) {
			add(attacks[day], "1.00", "EXPENSE", food, "2026-03-0" + (day + 1));
		}

		assertThat(csv(maria, "2026-03-01", "2026-03-31"))
				.contains("04/03/2026;'@SOMA(A1);")
				.contains("03/03/2026;'-1+1;")
				.contains("02/03/2026;'+1+1;")
				.contains("01/03/2026;'=1+1;");
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

	private void add(String description, String amount, String type, UUID categoryId, String date) throws Exception {
		mvc.perform(post(TRANSACTIONS).with(user(maria.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"description":"%s","amount":%s,"type":"%s","categoryId":"%s","occurredOn":"%s"}
						""".formatted(description, amount, type, categoryId, date)))
				.andExpect(status().isCreated());
	}

	private ResultActions report(UUID userId, String from, String to) throws Exception {
		return request(REPORTS, userId, from, to);
	}

	private ResultActions request(String path, UUID userId, String from, String to) throws Exception {
		return mvc.perform(get(path).param("from", from).param("to", to).with(user(userId.toString())));
	}

	private String csv(UUID userId, String from, String to) throws Exception {
		return request(EXPORT, userId, from, to).andExpect(status().isOk()).andReturn().getResponse()
				.getContentAsString(StandardCharsets.UTF_8);
	}

}
