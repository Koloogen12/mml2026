-- Чат: сессии и сообщения. Пользователи появятся в Ф2 —
-- до этого сессия анонимна и идентифицируется публичным UUID.
CREATE TABLE chat_sessions (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    user_id    BIGINT,                         -- FK добавится миграцией Ф2
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content    TEXT NOT NULL,
    -- Карточки, показанные в этом сообщении (public_id товаров) — для
    -- восстановления треда и для будущей разметки gold-set в админке.
    product_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages (session_id, id);
