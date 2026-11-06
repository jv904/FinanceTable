CREATE TABLE categories (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL,
    name       VARCHAR(60) NOT NULL,
    type       VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_categories_type CHECK (type IN ('INCOME', 'EXPENSE'))
);

-- Também atende às buscas por usuário, que é a primeira coluna do índice.
CREATE UNIQUE INDEX uq_categories_user_type_name ON categories (user_id, type, LOWER(name));

-- Contas criadas antes desta migração recebem as mesmas categorias iniciais das contas novas.
INSERT INTO categories (id, user_id, name, type, created_at, updated_at)
SELECT gen_random_uuid(), u.id, d.name, d.type, NOW(), NOW()
FROM users u
CROSS JOIN (VALUES
    ('Salário', 'INCOME'),
    ('Investimentos', 'INCOME'),
    ('Vendas', 'INCOME'),
    ('Outros recebimentos', 'INCOME'),
    ('Alimentação', 'EXPENSE'),
    ('Moradia', 'EXPENSE'),
    ('Transporte', 'EXPENSE'),
    ('Saúde', 'EXPENSE'),
    ('Educação', 'EXPENSE'),
    ('Lazer', 'EXPENSE'),
    ('Compras', 'EXPENSE'),
    ('Contas', 'EXPENSE'),
    ('Outros gastos', 'EXPENSE')
) AS d (name, type);
