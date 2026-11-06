CREATE TABLE transactions (
    id          UUID PRIMARY KEY,
    user_id     UUID          NOT NULL,
    category_id UUID          NOT NULL,
    description VARCHAR(150)  NOT NULL,
    amount      NUMERIC(14,2) NOT NULL,
    occurred_on DATE          NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL,
    updated_at  TIMESTAMPTZ   NOT NULL,
    CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    -- NO ACTION, e não RESTRICT: impede excluir uma categoria em uso, mas só confere no fim do comando.
    -- Assim, apagar um usuário continua funcionando, com categorias e movimentações saindo em cascata.
    CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE NO ACTION,
    CONSTRAINT ck_transactions_amount_positive CHECK (amount > 0)
);

CREATE INDEX ix_transactions_user_date ON transactions (user_id, occurred_on DESC, created_at DESC);
CREATE INDEX ix_transactions_category ON transactions (category_id);
