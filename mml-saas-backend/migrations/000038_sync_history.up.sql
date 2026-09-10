CREATE TABLE sync_history (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id        INT NOT NULL REFERENCES ecommerce_stores(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ(6) NOT NULL,
    finished_at     TIMESTAMPTZ(6) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    total           INT NOT NULL DEFAULT 0,
    processed       INT NOT NULL DEFAULT 0,
    created_count   INT NOT NULL DEFAULT 0,
    updated_count   INT NOT NULL DEFAULT 0,
    skipped_count   INT NOT NULL DEFAULT 0,
    errors_count    INT NOT NULL DEFAULT 0,
    error_messages  JSONB,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_history_store_id_started_at ON sync_history(store_id, started_at DESC);
