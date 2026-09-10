-- Ф7: внутренняя админка. Фаза 1 — рабочий инструмент, не BI.
-- Читаем максимум из уже существующих таблиц; добавляем только недостающее.

-- A0 «Стол стилиста» / A2 «Пользователи»: статус лида в концьерж-воронке.
ALTER TABLE users
    ADD COLUMN lead_status    TEXT NOT NULL DEFAULT 'new',   -- new|in_dialog|sent_selection|clicked|purchased|churned
    ADD COLUMN lead_source    TEXT,                          -- откуда пришёл (waitlist|widget|ads|referral|...)
    ADD COLUMN purchased_kopecks BIGINT,                     -- сумма покупки (метрика концьерж-теста), в копейках
    ADD COLUMN last_action_at TIMESTAMPTZ;
CREATE INDEX idx_users_lead_status ON users (lead_status, last_action_at DESC NULLS LAST);

-- A5 «Примерки и себестоимость»: маржа ≥50% держится на доле Pro.
-- Модель и себестоимость фиксируем на момент генерации (честная единичная цена вызова).
ALTER TABLE tryons
    ADD COLUMN model        TEXT,   -- flash|pro (роутер: 1-2 вещи → flash, 3+ → pro)
    ADD COLUMN cost_kopecks INT,    -- себестоимость этой генерации, копейки
    ADD COLUMN error_reason TEXT;   -- машиночитаемая причина сбоя (bad_photo|timeout|model_refused|...)
CREATE INDEX idx_tryons_model ON tryons (model, created_at DESC);

-- A1 «Разметка» / A0 инлайн-оценка: строка gold-set по ответу ИИ.
-- Один клик оператора → одна размеченная пара «запрос → выдача».
CREATE TABLE answer_labels (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id   BIGINT REFERENCES chat_sessions(id) ON DELETE SET NULL,
    message_id   BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
    user_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    rater        TEXT NOT NULL,                 -- кто разметил (email оператора)
    relevance    SMALLINT,                      -- -1|0|1 (👎/—/👍) по каждому измерению
    order_ok     SMALLINT,
    occasion     SMALLINT,
    palette_size SMALLINT,
    note_quality SMALLINT,
    why          TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_answer_labels_session ON answer_labels (session_id);
CREATE INDEX idx_answer_labels_created ON answer_labels (created_at DESC);

-- A3 «Партнёры и каталог»: журнал синхронизаций фида + что отклонено и почему.
-- Блок «Что сломалось» = источник требований к кабинету партнёра.
CREATE TABLE catalog_sync_runs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_id   BIGINT NOT NULL REFERENCES partner_catalog_sources(id) ON DELETE CASCADE,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status      TEXT NOT NULL DEFAULT 'running', -- running|ok|failed|partial
    added       INT NOT NULL DEFAULT 0,
    updated     INT NOT NULL DEFAULT 0,
    removed     INT NOT NULL DEFAULT 0,
    rejected    INT NOT NULL DEFAULT 0,
    error       TEXT
);
CREATE INDEX idx_sync_runs_source ON catalog_sync_runs (source_id, started_at DESC);

CREATE TABLE catalog_rejects (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sync_run_id   BIGINT NOT NULL REFERENCES catalog_sync_runs(id) ON DELETE CASCADE,
    external_id   TEXT,
    product_title TEXT,
    reason        TEXT NOT NULL,  -- no_photo|photo_on_mannequin|no_price|category_out_of_zones|no_sizes
    detail        TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_catalog_rejects_run ON catalog_rejects (sync_run_id);

-- A8 «Флаги и лимиты»: kill-switch + лимиты. Значение хранится строкой, тип — в коде.
CREATE TABLE feature_flags (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Аудит действий админки (A8, A6): кто, когда, что.
CREATE TABLE admin_audit_log (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor      TEXT NOT NULL,
    action     TEXT NOT NULL,
    target     TEXT,
    detail     JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_audit_created ON admin_audit_log (created_at DESC);

-- Дефолтные флаги (kill-switch выключен, разумные лимиты).
INSERT INTO feature_flags (key, value, updated_by) VALUES
    ('tryon_enabled',        'true', 'system'),
    ('gen_limit_per_hour',   '200',  'system'),
    ('gen_limit_per_user',   '20',   'system'),
    ('llm_provider',         'proxy','system')
ON CONFLICT (key) DO NOTHING;
