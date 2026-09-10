-- Ф6: кабинет партнёра. Отдельная сущность от покупателя; вход тем же
-- механизмом email-кода (таблица email_codes общая).
CREATE TABLE partners (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id   UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL UNIQUE,
    brand_name  TEXT,
    slug        TEXT,
    logo_url    TEXT,
    description TEXT,
    size_chart  JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE partner_sessions (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    partner_id   BIGINT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    refresh_hash TEXT NOT NULL UNIQUE,
    user_agent   TEXT,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at   TIMESTAMPTZ
);
CREATE INDEX idx_partner_sessions_partner ON partner_sessions (partner_id);

-- Источники каталога партнёра (фид/CSV/API/сайт) + журнал синка.
-- Блок «что сломалось» = будущие требования к продукту (из спеки).
CREATE TABLE partner_catalog_sources (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    partner_id   BIGINT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    kind         TEXT NOT NULL,        -- feed|csv|api|site
    url          TEXT,
    status       TEXT NOT NULL DEFAULT 'pending', -- pending|ok|failed
    last_sync_at TIMESTAMPTZ,
    last_error   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_partner_sources_partner ON partner_catalog_sources (partner_id);
