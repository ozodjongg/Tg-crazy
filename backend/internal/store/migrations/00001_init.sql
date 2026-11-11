-- +goose Up
CREATE TABLE users (
    id         BIGSERIAL PRIMARY KEY,
    tg_id      BIGINT NOT NULL UNIQUE,
    first_name TEXT NOT NULL DEFAULT '',
    username   TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bir martalik tasdiqlash: nonce botga yuboriladi, secret faqat klientda qoladi.
CREATE TABLE auth_nonces (
    nonce       TEXT PRIMARY KEY,
    secret_hash BYTEA NOT NULL,
    user_id     BIGINT REFERENCES users (id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ
);

CREATE TABLE refresh_tokens (
    token_hash BYTEA PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

CREATE TABLE settings (
    user_id    BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    data       JSONB NOT NULL DEFAULT '{}',
    version    BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plans (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    daily_ai_limit INT NOT NULL,
    -- Oylik narx, so'mda. NULL — hali belgilanmagan (sotuvda emas).
    price_uzs      INT
);

INSERT INTO plans (id, name, daily_ai_limit, price_uzs) VALUES
    ('free', 'Bepul', 10, 0),
    ('pro', 'Pro', 200, NULL);

CREATE TABLE subscriptions (
    user_id    BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    plan_id    TEXT NOT NULL REFERENCES plans (id),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Faqat hisoblagich: AI'ga yuborilgan matn hech qayerda saqlanmaydi.
CREATE TABLE ai_usage (
    user_id       BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    day           DATE NOT NULL,
    requests      INT NOT NULL DEFAULT 0,
    input_tokens  BIGINT NOT NULL DEFAULT 0,
    output_tokens BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);

-- +goose Down
DROP TABLE ai_usage, subscriptions, plans, settings, refresh_tokens, auth_nonces, users;
