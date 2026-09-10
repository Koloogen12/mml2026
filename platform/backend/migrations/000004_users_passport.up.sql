-- Ф2: личность покупателя. Auth по email-коду (SMS не нужен — решение Данила,
-- email-вход уже есть в виджете как образец). Паспорт — три слоя по скорости
-- изменения (STABLE / SLOW / FAST) из STYLE_PASSPORT_AND_RECS.md.

CREATE TABLE users (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id   UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Одноразовые коды входа. Код хранится хешем (bcrypt-подобно), не в открытую.
CREATE TABLE email_codes (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       TEXT NOT NULL,
    code_hash   TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    attempts    INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_codes_email ON email_codes (email, created_at DESC);

-- Refresh-сессии (access-JWT короткоживущий, refresh — в БД, отзываемый).
CREATE TABLE auth_sessions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_hash  TEXT NOT NULL UNIQUE,
    user_agent    TEXT,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at    TIMESTAMPTZ
);
CREATE INDEX idx_auth_sessions_user ON auth_sessions (user_id);

-- STABLE: то, что не меняется — внешность, колориметрия, тело.
-- Заполняется из фото (Ф позже) — сейчас пустой профиль на пользователя.
CREATE TABLE user_traits (
    user_id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    skin_lab        REAL[],           -- {L*, a*, b*} — 2 оси, не Fitzpatrick
    hair_lab        REAL[],
    eye_lab         REAL[],
    undertone       TEXT,             -- warm|cool|neutral|olive
    contrast_level  TEXT,             -- high|medium|low
    season_key      TEXT,             -- Tier-2 ярлык (редактируемый в UI)
    body_shape      TEXT,
    trait_embedding vector(768),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SLOW: вкус, бренды, бюджет, образ жизни. Версионируем (SCD-2): актуальная
-- строка — с valid_to IS NULL. Мода дрейфует, история важна.
CREATE TABLE user_preferences (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    for_whom             TEXT,             -- female|male|any
    style_persona_blend  TEXT[],           -- выбранные эстетики O4
    brands_love          TEXT[],
    brands_avoid         TEXT[],
    budget_by_category   JSONB NOT NULL DEFAULT '{}',
    size_by_category     JSONB NOT NULL DEFAULT '{}',
    lifestyle_allocation JSONB NOT NULL DEFAULT '{}',  -- {occasion: pct}
    style_self_described TEXT[],           -- парные поля O6
    style_aspirational   TEXT[],
    desired_mood_default TEXT,
    body_love            TEXT[],
    body_downplay        TEXT[],
    hard_constraints     JSONB NOT NULL DEFAULT '{}',  -- {no_heels, heel_max_cm, ethical_only,...}
    taste_embedding      vector(768),
    valid_from           TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to             TIMESTAMPTZ
);
CREATE INDEX idx_user_prefs_current ON user_preferences (user_id) WHERE valid_to IS NULL;

-- FAST: контекст сессии/повода — быстрый слой. Пишется по ходу диалога.
CREATE TABLE context_events (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
    session_id BIGINT REFERENCES chat_sessions(id) ON DELETE SET NULL,
    kind       TEXT NOT NULL,        -- occasion|weather|mood|season
    value      JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_context_events_user ON context_events (user_id, created_at DESC);

-- 152-ФЗ: журнал согласий (версионированный) + удаление биометрии в один тап.
CREATE TABLE consent_logs (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind         TEXT NOT NULL,       -- biometric_required | biometric_store_photo
    version      TEXT NOT NULL,       -- версия текста согласия
    granted      BOOLEAN NOT NULL,
    ip           TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consent_logs_user ON consent_logs (user_id, created_at DESC);

-- Привязываем чат к пользователю (было только анонимно по public_id).
ALTER TABLE chat_sessions
    ADD CONSTRAINT fk_chat_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
