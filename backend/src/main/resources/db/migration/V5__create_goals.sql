CREATE TABLE goals (
    id            UUID PRIMARY KEY,
    user_id       UUID          NOT NULL,
    name          VARCHAR(150)  NOT NULL,
    target_amount NUMERIC(14,2) NOT NULL,
    saved_amount  NUMERIC(14,2) NOT NULL,
    target_date   DATE          NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL,
    updated_at    TIMESTAMPTZ   NOT NULL,
    CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_goals_target_positive CHECK (target_amount > 0),
    CONSTRAINT ck_goals_saved_not_negative CHECK (saved_amount >= 0)
);

CREATE INDEX ix_goals_user ON goals (user_id);
