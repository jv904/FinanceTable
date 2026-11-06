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

import java.math.BigDecimal;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.financetable.backend.TestcontainersConfig;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class TransactionIntegrationTest {

	private static final String API = "/api/transactions";
	private static final String CATEGORIES = "/api/categories";

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

	// Criar

	@Test
	void createSavesAndReturnsTheTransaction() throws Exception {
		create(maria, "  Mercado do mês ", "1250.50", "EXPENSE", food, "2026-03-15")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").isNotEmpty())
				.andExpect(jsonPath("$.description").value("Mercado do mês"))
				.andExpect(jsonPath("$.amount").value(1250.5))
				.andExpect(jsonPath("$.type").value("EXPENSE"))
				.andExpect(jsonPath("$.categoryId").value(food.toString()))
				.andExpect(jsonPath("$.categoryName").value("Alimentação"))
				.andExpect(jsonPath("$.occurredOn").value("2026-03-15"))
				.andExpect(jsonPath("$.createdAt").isNotEmpty());

		assertThat(jdbc.queryForObject("select amount from transactions", BigDecimal.class))
				.isEqualByComparingTo("1250.50");
	}

	@Test
	void createKeepsCentsExact() throws Exception {
		create(maria, "Centavos", "0.01", "EXPENSE", food, "2026-03-15").andExpect(status().isCreated());
		create(maria, "Máximo", "999999999999.99", "INCOME", salary, "2026-03-15").andExpect(status().isCreated());

		assertThat(jdbc.queryForObject("select amount from transactions where description = 'Centavos'",
				BigDecimal.class)).isEqualByComparingTo("0.01");
		assertThat(jdbc.queryForObject("select amount from transactions where description = 'Máximo'",
				BigDecimal.class)).isEqualByComparingTo("999999999999.99");
	}

	@Test
	void createRejectsZeroOrNegativeAmount() throws Exception {
		for (String amount : new String[] { "0", "0.00", "-10" }) {
			create(maria, "Conta", amount, "EXPENSE", food, "2026-03-15")
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.detail").value("Informe um valor maior que zero."));
		}
		assertThat(countTransactions()).isZero();
	}

	@Test
	void createRejectsAmountWithTooManyDigits() throws Exception {
		create(maria, "Conta", "10.123", "EXPENSE", food, "2026-03-15").andExpect(status().isBadRequest());
		create(maria, "Conta", "1000000000000", "EXPENSE", food, "2026-03-15").andExpect(status().isBadRequest());
	}

	@Test
	void createRejectsMissingFields() throws Exception {
		mvc.perform(asMaria(post(API)).content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Preencha todos os campos obrigatórios."));

		create(maria, "   ", "10", "EXPENSE", food, "2026-03-15")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Preencha todos os campos obrigatórios."));
	}

	@Test
	void createRejectsDescriptionOver150Characters() throws Exception {
		create(maria, "a".repeat(151), "10", "EXPENSE", food, "2026-03-15")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("A descrição deve ter no máximo 150 caracteres."));
		create(maria, "a".repeat(150), "10", "EXPENSE", food, "2026-03-15").andExpect(status().isCreated());
	}

	@Test
	void createRejectsInvalidDate() throws Exception {
		create(maria, "Conta", "10", "EXPENSE", food, "2026-02-30").andExpect(status().isBadRequest());
	}

	@Test
	void createRejectsCategoryOfTheOtherType() throws Exception {
		create(maria, "Salário como despesa", "10", "EXPENSE", salary, "2026-03-15")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("A categoria escolhida não é compatível com o tipo da movimentação."));
		assertThat(countTransactions()).isZero();
	}

	@Test
	void createRejectsCategoryThatIsNotOfTheAccount() throws Exception {
		create(joao, "Categoria da Maria", "10", "EXPENSE", food, "2026-03-15").andExpect(status().isNotFound());
		create(maria, "Inexistente", "10", "EXPENSE", UUID.randomUUID(), "2026-03-15").andExpect(status().isNotFound());
		assertThat(countTransactions()).isZero();
	}

	// Editar

	@Test
	void updateChangesEveryFieldIncludingTheType() throws Exception {
		UUID id = createAndGetId("Original", "10.00", "EXPENSE", food, "2026-03-15");

		update(maria, id, "Editada", "20.50", "INCOME", salary, "2026-04-01")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.description").value("Editada"))
				.andExpect(jsonPath("$.amount").value(20.5))
				.andExpect(jsonPath("$.type").value("INCOME"))
				.andExpect(jsonPath("$.categoryName").value("Salário"))
				.andExpect(jsonPath("$.occurredOn").value("2026-04-01"));

		list(maria, "").andExpect(jsonPath("$.content[0].description").value("Editada"));
		assertThat(jdbc.queryForObject("select amount from transactions", BigDecimal.class))
				.isEqualByComparingTo("20.50");
	}

	@Test
	void updateAppliesTheSameRulesAsCreate() throws Exception {
		UUID id = createAndGetId("Original", "10.00", "EXPENSE", food, "2026-03-15");

		update(maria, id, "Editada", "0", "EXPENSE", food, "2026-03-15").andExpect(status().isBadRequest());
		update(maria, id, "Editada", "10", "INCOME", food, "2026-03-15").andExpect(status().isBadRequest());

		assertThat(jdbc.queryForObject("select description from transactions", String.class)).isEqualTo("Original");
	}

	@Test
	void updateRespondsNotFoundForUnknownTransaction() throws Exception {
		update(maria, UUID.randomUUID(), "Editada", "10", "EXPENSE", food, "2026-03-15")
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.detail").value("Movimentação não encontrada."));
	}

	// Excluir

	@Test
	void deleteRemovesTheTransaction() throws Exception {
		UUID id = createAndGetId("Conta", "10", "EXPENSE", food, "2026-03-15");

		remove(maria, id).andExpect(status().isNoContent());

		assertThat(countTransactions()).isZero();
		remove(maria, id).andExpect(status().isNotFound());
	}

	// Lista, filtros e paginação

	@Test
	void listIsOrderedFromNewestToOldest() throws Exception {
		createAndGetId("Antiga", "1", "EXPENSE", food, "2026-01-10");
		createAndGetId("Nova", "1", "EXPENSE", food, "2026-03-10");
		createAndGetId("Mesma data, depois", "1", "EXPENSE", food, "2026-01-10");

		list(maria, "").andExpect(jsonPath("$.content[*].description",
				contains("Nova", "Mesma data, depois", "Antiga")));
	}

	@Test
	void listPaginates() throws Exception {
		for (int day = 1; day <= 5; day++) {
			createAndGetId("Dia " + day, "1", "EXPENSE", food, "2026-03-0" + day);
		}

		list(maria, "page=1&size=2")
				.andExpect(jsonPath("$.content[*].description", contains("Dia 3", "Dia 2")))
				.andExpect(jsonPath("$.page").value(1))
				.andExpect(jsonPath("$.size").value(2))
				.andExpect(jsonPath("$.totalElements").value(5))
				.andExpect(jsonPath("$.totalPages").value(3));
	}

	@Test
	void listLimitsThePageSizeAndAcceptsOutOfRangeValues() throws Exception {
		list(maria, "size=1000").andExpect(status().isOk()).andExpect(jsonPath("$.size").value(100));
		list(maria, "size=0").andExpect(status().isOk()).andExpect(jsonPath("$.size").value(1));
		list(maria, "page=-1").andExpect(status().isOk()).andExpect(jsonPath("$.page").value(0));
	}

	@Test
	void listFiltersBySearchIgnoringCase() throws Exception {
		createAndGetId("Mercado Central", "1", "EXPENSE", food, "2026-03-10");
		createAndGetId("Cinema", "1", "EXPENSE", leisure, "2026-03-10");

		list(maria, "search=  mercado ").andExpect(jsonPath("$.content[*].description", contains("Mercado Central")));
		list(maria, "search=   ").andExpect(jsonPath("$.content", hasSize(2)));
	}

	@Test
	void listTreatsLikeWildcardsAsPlainText() throws Exception {
		createAndGetId("Desconto de 10%", "1", "EXPENSE", food, "2026-03-10");
		createAndGetId("conta_luz", "1", "EXPENSE", food, "2026-03-10");
		createAndGetId("Mercado", "1", "EXPENSE", food, "2026-03-10");

		mvc.perform(get(API).with(user(maria.toString())).param("search", "%"))
				.andExpect(jsonPath("$.content[*].description", contains("Desconto de 10%")));
		mvc.perform(get(API).with(user(maria.toString())).param("search", "_"))
				.andExpect(jsonPath("$.content[*].description", contains("conta_luz")));
	}

	@Test
	void listFiltersByPeriodIncludingBothEnds() throws Exception {
		createAndGetId("Antes", "1", "EXPENSE", food, "2026-02-28");
		createAndGetId("Início", "1", "EXPENSE", food, "2026-03-01");
		createAndGetId("Fim", "1", "EXPENSE", food, "2026-03-31");
		createAndGetId("Depois", "1", "EXPENSE", food, "2026-04-01");

		list(maria, "from=2026-03-01&to=2026-03-31")
				.andExpect(jsonPath("$.content[*].description", contains("Fim", "Início")));
		list(maria, "from=2026-04-01").andExpect(jsonPath("$.content[*].description", contains("Depois")));
		list(maria, "to=2026-02-28").andExpect(jsonPath("$.content[*].description", contains("Antes")));
	}

	@Test
	void listRejectsInvertedPeriod() throws Exception {
		list(maria, "from=2026-04-01&to=2026-03-01")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("A data inicial não pode ser posterior à data final."));
	}

	@Test
	void listRejectsInvalidFilterValues() throws Exception {
		list(maria, "from=31/12/2026")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Não foi possível ler os dados enviados."));
		list(maria, "type=OUTRO").andExpect(status().isBadRequest());
		list(maria, "categoryId=abc").andExpect(status().isBadRequest());
	}

	@Test
	void listFiltersByCategoryAndType() throws Exception {
		createAndGetId("Pagamento", "1", "INCOME", salary, "2026-03-10");
		createAndGetId("Mercado", "1", "EXPENSE", food, "2026-03-10");
		createAndGetId("Cinema", "1", "EXPENSE", leisure, "2026-03-10");

		list(maria, "categoryId=" + food).andExpect(jsonPath("$.content[*].description", contains("Mercado")));
		list(maria, "type=INCOME").andExpect(jsonPath("$.content[*].description", contains("Pagamento")));
		list(maria, "type=EXPENSE").andExpect(jsonPath("$.content", hasSize(2)));
	}

	@Test
	void listCombinesFiltersAndCountsOnlyTheMatches() throws Exception {
		createAndGetId("Cinema março", "1", "EXPENSE", leisure, "2026-03-10");
		createAndGetId("Cinema abril", "1", "EXPENSE", leisure, "2026-04-10");
		createAndGetId("Cinema como alimentação", "1", "EXPENSE", food, "2026-03-10");
		createAndGetId("Teatro março", "1", "EXPENSE", leisure, "2026-03-11");

		list(maria, "search=cinema&type=EXPENSE&categoryId=" + leisure + "&from=2026-03-01&to=2026-03-31")
				.andExpect(jsonPath("$.content[*].description", contains("Cinema março")))
				.andExpect(jsonPath("$.totalElements").value(1));
	}

	// Cada usuário vê apenas o que é seu

	@Test
	void anotherAccountCanNotSeeEditOrDeleteTheTransaction() throws Exception {
		UUID id = createAndGetId("Da Maria", "10", "EXPENSE", food, "2026-03-15");
		UUID joaoFood = categoryId(joao, "Alimentação");

		list(joao, "").andExpect(jsonPath("$.content").isEmpty()).andExpect(jsonPath("$.totalElements").value(0));
		list(joao, "categoryId=" + food).andExpect(jsonPath("$.content").isEmpty());
		update(joao, id, "Invadida", "99", "EXPENSE", joaoFood, "2026-03-15").andExpect(status().isNotFound());
		remove(joao, id).andExpect(status().isNotFound());

		assertThat(jdbc.queryForObject("select description from transactions", String.class)).isEqualTo("Da Maria");
	}

	@Test
	void updateCanNotMoveTransactionToCategoryOfAnotherAccount() throws Exception {
		UUID id = createAndGetId("Da Maria", "10", "EXPENSE", food, "2026-03-15");

		update(maria, id, "Da Maria", "10", "EXPENSE", categoryId(joao, "Lazer"), "2026-03-15")
				.andExpect(status().isNotFound());
	}

	// Proteção da API

	@Test
	void requiresLogin() throws Exception {
		mvc.perform(get(API)).andExpect(status().isUnauthorized());
	}

	@Test
	void changesRequireCsrfToken() throws Exception {
		UUID id = createAndGetId("Conta", "10", "EXPENSE", food, "2026-03-15");

		mvc.perform(post(API).with(user(maria.toString())).contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isForbidden());
		mvc.perform(delete(API + "/" + id).with(user(maria.toString()))).andExpect(status().isForbidden());
	}

	// Relação com as categorias

	@Test
	void categoryInUseCanNotBeDeletedUntilTheTransactionLeaves() throws Exception {
		UUID id = createAndGetId("Mercado", "10", "EXPENSE", food, "2026-03-15");

		mvc.perform(delete(CATEGORIES + "/" + food).with(user(maria.toString())).with(csrf()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("Esta categoria possui movimentações vinculadas."));
		assertThat(categoryId(maria, "Alimentação")).isEqualTo(food);

		remove(maria, id).andExpect(status().isNoContent());

		mvc.perform(delete(CATEGORIES + "/" + food).with(user(maria.toString())).with(csrf()))
				.andExpect(status().isNoContent());
	}

	@Test
	void renamingTheCategoryIsReflectedInTheList() throws Exception {
		createAndGetId("Mercado", "10", "EXPENSE", food, "2026-03-15");

		mvc.perform(put(CATEGORIES + "/" + food).with(user(maria.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Comida\"}"))
				.andExpect(status().isOk());

		list(maria, "").andExpect(jsonPath("$.content[0].categoryName").value("Comida"));
	}

	@Test
	void deletingAUserWithTransactionsRemovesEverything() throws Exception {
		createAndGetId("Mercado", "10", "EXPENSE", food, "2026-03-15");

		jdbc.update("delete from users where id = ?", maria);

		assertThat(countTransactions()).isZero();
		assertThat(jdbc.queryForObject("select count(*) from categories where user_id = ?", Long.class, maria)).isZero();
	}

	// Apoio

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

	private long countTransactions() {
		return jdbc.queryForObject("select count(*) from transactions", Long.class);
	}

	private MockHttpServletRequestBuilder asMaria(MockHttpServletRequestBuilder request) {
		return request.with(user(maria.toString())).with(csrf()).contentType(MediaType.APPLICATION_JSON);
	}

	private static String json(String description, String amount, String type, UUID categoryId, String date) {
		return """
				{"description":"%s","amount":%s,"type":"%s","categoryId":"%s","occurredOn":"%s"}
				""".formatted(description, amount, type, categoryId, date);
	}

	private ResultActions create(UUID userId, String description, String amount, String type, UUID categoryId,
			String date) throws Exception {
		return mvc.perform(post(API).with(user(userId.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content(json(description, amount, type, categoryId, date)));
	}

	/** Cria na conta da Maria. Cada movimentação sai com um horário de cadastro diferente. */
	private UUID createAndGetId(String description, String amount, String type, UUID categoryId, String date)
			throws Exception {
		create(maria, description, amount, type, categoryId, date).andExpect(status().isCreated());
		return jdbc.queryForObject("select id from transactions where description = ?", UUID.class, description);
	}

	private ResultActions update(UUID userId, UUID id, String description, String amount, String type,
			UUID categoryId, String date) throws Exception {
		return mvc.perform(put(API + "/" + id).with(user(userId.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content(json(description, amount, type, categoryId, date)));
	}

	private ResultActions remove(UUID userId, UUID id) throws Exception {
		return mvc.perform(delete(API + "/" + id).with(user(userId.toString())).with(csrf()));
	}

	private ResultActions list(UUID userId, String query) throws Exception {
		return mvc.perform(get(API + "?" + query).with(user(userId.toString())));
	}

}
