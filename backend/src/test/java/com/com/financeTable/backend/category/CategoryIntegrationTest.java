package com.com.financeTable.backend.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
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

import org.flywaydb.core.Flyway;
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
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.com.financeTable.backend.TestcontainersConfig;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class CategoryIntegrationTest {

	private static final String API = "/api/categories";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private PostgreSQLContainer postgres;

	private UUID maria;
	private UUID joao;

	@BeforeEach
	void createAccounts() throws Exception {
		jdbc.update("delete from users");
		maria = registerAccount("maria@example.com");
		joao = registerAccount("joao@example.com");
	}

	// Categorias iniciais

	@Test
	void newAccountReceivesInitialCategoriesInPortugueseOrder() throws Exception {
		list(maria)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(13)))
				.andExpect(jsonPath("$[?(@.type == 'INCOME')].name",
						contains("Investimentos", "Outros recebimentos", "Salário", "Vendas")))
				.andExpect(jsonPath("$[?(@.type == 'EXPENSE')].name",
						contains("Alimentação", "Compras", "Contas", "Educação", "Lazer", "Moradia",
								"Outros gastos", "Saúde", "Transporte")));
	}

	@Test
	void migrationGivesInitialCategoriesToExistingAccounts() {
		String schema = "migracao_v3";
		try {
			migrate(schema, "2");
			jdbc.update("insert into " + schema + ".users (id, name, email, password_hash, created_at, updated_at) "
					+ "values (gen_random_uuid(), 'Antiga', 'antiga@example.com', 'hash', now(), now())");

			migrate(schema, "3");

			assertThat(jdbc.queryForObject("select count(*) from " + schema + ".categories where type = 'INCOME'",
					Long.class)).isEqualTo(4);
			assertThat(jdbc.queryForObject("select count(*) from " + schema + ".categories where type = 'EXPENSE'",
					Long.class)).isEqualTo(9);
		}
		finally {
			jdbc.execute("drop schema if exists " + schema + " cascade");
		}
	}

	// Criar

	@Test
	void createAddsCategoryAvailableInTheList() throws Exception {
		create(maria, "Freelance", "INCOME")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").isNotEmpty())
				.andExpect(jsonPath("$.name").value("Freelance"))
				.andExpect(jsonPath("$.type").value("INCOME"));

		list(maria).andExpect(jsonPath("$", hasSize(14)));
	}

	@Test
	void createTrimsTheName() throws Exception {
		create(maria, "   Freelance  ", "INCOME").andExpect(jsonPath("$.name").value("Freelance"));
	}

	@Test
	void createRejectsBlankName() throws Exception {
		create(maria, "   ", "INCOME")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Preencha todos os campos obrigatórios."));
	}

	@Test
	void createRejectsNameOver60Characters() throws Exception {
		create(maria, "a".repeat(61), "INCOME")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("O nome deve ter no máximo 60 caracteres."));
	}

	@Test
	void createAcceptsNameWith60Characters() throws Exception {
		create(maria, "a".repeat(60), "INCOME").andExpect(status().isCreated());
	}

	@Test
	void createRejectsMissingOrInvalidType() throws Exception {
		mvc.perform(post(API).with(user(maria.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Freelance\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Preencha todos os campos obrigatórios."));

		create(maria, "Freelance", "OUTRO").andExpect(status().isBadRequest());
	}

	@Test
	void createRejectsRepeatedNameInTheSameTypeIgnoringCase() throws Exception {
		create(maria, "SALÁRIO", "INCOME")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("Já existe uma categoria com este nome."));
	}

	@Test
	void createAcceptsSameNameInTheOtherType() throws Exception {
		create(maria, "Salário", "EXPENSE").andExpect(status().isCreated());
	}

	@Test
	void createAcceptsNameAlreadyUsedByAnotherAccount() throws Exception {
		create(maria, "Freelance", "INCOME").andExpect(status().isCreated());
		create(joao, "Freelance", "INCOME").andExpect(status().isCreated());
	}

	// Renomear

	@Test
	void renameChangesTheNameAndKeepsTheType() throws Exception {
		UUID id = categoryId(maria, "Salário");

		rename(maria, id, "  Salário fixo ")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Salário fixo"))
				.andExpect(jsonPath("$.type").value("INCOME"));

		list(maria).andExpect(jsonPath("$[?(@.type == 'INCOME')].name",
				contains("Investimentos", "Outros recebimentos", "Salário fixo", "Vendas")));
	}

	@Test
	void renameAcceptsChangingOnlyTheCaseOfItsOwnName() throws Exception {
		rename(maria, categoryId(maria, "Salário"), "SALÁRIO").andExpect(status().isOk());
	}

	@Test
	void renameRejectsNameOfAnotherCategoryOfTheSameType() throws Exception {
		rename(maria, categoryId(maria, "Salário"), "vendas").andExpect(status().isConflict());

		assertThat(categoryId(maria, "Salário")).isNotNull();
	}

	@Test
	void renameRejectsBlankName() throws Exception {
		rename(maria, categoryId(maria, "Salário"), " ").andExpect(status().isBadRequest());
	}

	@Test
	void renameRespondsNotFoundForUnknownCategory() throws Exception {
		rename(maria, UUID.randomUUID(), "Nome")
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.detail").value("Categoria não encontrada."));
	}

	@Test
	void invalidIdGetsAMessageInPortuguese() throws Exception {
		mvc.perform(delete(API + "/nao-e-uuid").with(user(maria.toString())).with(csrf()))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Não foi possível ler os dados enviados."));
	}

	// Excluir

	@Test
	void deleteRemovesTheCategory() throws Exception {
		remove(maria, categoryId(maria, "Lazer")).andExpect(status().isNoContent());

		list(maria).andExpect(jsonPath("$", hasSize(12)));
	}

	@Test
	void deleteRespondsNotFoundForUnknownCategory() throws Exception {
		remove(maria, UUID.randomUUID()).andExpect(status().isNotFound());
	}

	@Test
	void deletedNameCanBeUsedAgain() throws Exception {
		remove(maria, categoryId(maria, "Lazer")).andExpect(status().isNoContent());

		create(maria, "Lazer", "EXPENSE").andExpect(status().isCreated());
	}

	// Cada usuário vê apenas o que é seu

	@Test
	void anotherAccountCanNotSeeRenameOrDeleteTheCategory() throws Exception {
		create(maria, "Só da Maria", "EXPENSE").andExpect(status().isCreated());
		UUID id = categoryId(maria, "Só da Maria");

		list(joao).andExpect(jsonPath("$[?(@.name == 'Só da Maria')]").isEmpty());
		rename(joao, id, "Invadido").andExpect(status().isNotFound());
		remove(joao, id).andExpect(status().isNotFound());

		assertThat(categoryId(maria, "Só da Maria")).isEqualTo(id);
	}

	@Test
	void changesInOneAccountDoNotAffectAnother() throws Exception {
		remove(maria, categoryId(maria, "Lazer")).andExpect(status().isNoContent());
		rename(maria, categoryId(maria, "Salário"), "Pró-labore").andExpect(status().isOk());

		list(joao)
				.andExpect(jsonPath("$", hasSize(13)))
				.andExpect(jsonPath("$[?(@.name == 'Lazer' || @.name == 'Salário')].name",
						containsInAnyOrder("Lazer", "Salário")));
	}

	// Proteção da API

	@Test
	void requiresLogin() throws Exception {
		mvc.perform(get(API)).andExpect(status().isUnauthorized());
	}

	@Test
	void changesRequireCsrfToken() throws Exception {
		mvc.perform(post(API).with(user(maria.toString()))
				.contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Nova\",\"type\":\"INCOME\"}"))
				.andExpect(status().isForbidden());
		mvc.perform(delete(API + "/" + categoryId(maria, "Lazer")).with(user(maria.toString())))
				.andExpect(status().isForbidden());
	}

	// Apoio

	private void migrate(String schema, String target) {
		Flyway.configure()
				.dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
				.schemas(schema)
				.target(target)
				.load()
				.migrate();
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

	private ResultActions list(UUID userId) throws Exception {
		return mvc.perform(get(API).with(user(userId.toString())));
	}

	private ResultActions create(UUID userId, String name, String type) throws Exception {
		return mvc.perform(post(API).with(user(userId.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"%s\",\"type\":\"%s\"}".formatted(name, type)));
	}

	private ResultActions rename(UUID userId, UUID id, String name) throws Exception {
		return mvc.perform(put(API + "/" + id).with(user(userId.toString())).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"%s\"}".formatted(name)));
	}

	private ResultActions remove(UUID userId, UUID id) throws Exception {
		return mvc.perform(delete(API + "/" + id).with(user(userId.toString())).with(csrf()));
	}

}
