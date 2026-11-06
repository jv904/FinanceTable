# FinanceTable

Plataforma de controle financeiro pessoal: receitas, despesas, categorias, metas e relatórios.

**Situação atual:** Etapas 1 a 4 concluídas (estrutura, identidade visual, navegação, cadastro, login, logout, recuperação de senha, categorias, receitas e despesas). As áreas de início, metas e relatórios ainda aparecem como "em breve".

O que a plataforma deve fazer e as etapas de desenvolvimento estão no [manual](docs/manual.md).

## Tecnologias

| Parte | Tecnologia |
|---|---|
| Backend (`backend/`) | Java 21, Spring Boot 4, Spring Security, JPA, Flyway |
| Frontend (`frontend/`) | Angular 22, Angular Material |
| Banco de dados | PostgreSQL 17 |
| E-mail em desenvolvimento | Mailpit (nenhum e-mail é enviado de verdade) |

## Como rodar

Você precisa de Java 21, Node 24 e Docker Desktop aberto. Use um terminal para cada passo:

```powershell
# 1. Na raiz do projeto: banco de dados e caixa de e-mails
docker compose up -d

# 2. Backend, em http://localhost:8080 (cria as tabelas sozinho)
cd backend
.\mvnw.cmd spring-boot:run

# 3. Frontend (na primeira vez, rode npm install antes)
cd frontend
npm start
```

| Endereço | O que é |
|---|---|
| http://localhost:4200 | A aplicação |
| http://localhost:8025 | Caixa de e-mails de teste, onde chega o link de recuperação de senha |

## Testes

```powershell
# Backend: precisa do Docker aberto, pois sobe um PostgreSQL temporário próprio
cd backend
.\mvnw.cmd test

# Frontend
cd frontend
npm test -- --watch=false
npm run build
```

## Configuração

Os padrões já funcionam em desenvolvimento. Para mudá-los, veja as variáveis em [.env.example](.env.example). O `docker compose` lê um arquivo `.env` sozinho, mas o backend usa variáveis de ambiente do sistema, então uma senha de banco diferente precisa ser definida nos dois.

Antes de publicar em produção:

- usar uma senha forte em `DB_PASSWORD`;
- definir `COOKIE_SECURE=true` (exige HTTPS);
- apontar `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` e `MAIL_FROM` para um SMTP real;
- definir `FRONTEND_URL` com o endereço público, usado no link do e-mail;
- adicionar um limite de tentativas de login e de pedidos de recuperação de senha, que ainda não existe.

## Como a API autentica

- A sessão fica no banco e é identificada por um cookie `HttpOnly`. Sair da conta ou redefinir a senha encerra o acesso na hora.
- Requisições que alteram dados exigem o cabeçalho `X-XSRF-TOKEN`, com o valor do cookie `XSRF-TOKEN`. O Angular faz isso automaticamente.
- Mudanças no banco são feitas sempre por novas migrações em `backend/src/main/resources/db/migration`. Não altere uma migração já aplicada.
