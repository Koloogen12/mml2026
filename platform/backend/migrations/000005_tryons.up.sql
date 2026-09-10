-- Ф4: примерка. Биометрия (фото) НЕ хранится в платформе — она живёт в
-- виджете, где пройден контур 152-ФЗ. Платформа держит только ссылки:
-- id фото и id примерки в виджете + статус. Так удаление биометрии = отзыв
-- ссылок + вызов удаления в виджете.
CREATE TABLE tryons (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id        BIGINT REFERENCES chat_sessions(id) ON DELETE SET NULL,
    product_ids       UUID[] NOT NULL,          -- товары платформы (public_id)
    widget_photo_id   TEXT,                     -- id фото в виджете (биометрия там)
    widget_tryon_id   TEXT,                     -- id примерки в виджете
    status            TEXT NOT NULL DEFAULT 'pending', -- pending|processing|done|failed
    result_url        TEXT,
    error             TEXT,
    consent_version   TEXT NOT NULL,            -- версия согласия на момент запуска
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tryons_user ON tryons (user_id, created_at DESC);
CREATE INDEX idx_tryons_session ON tryons (session_id);
