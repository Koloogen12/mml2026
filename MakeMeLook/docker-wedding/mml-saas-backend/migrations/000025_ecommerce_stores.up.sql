CREATE TABLE ecommerce_stores (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES projects(id),
    platform        VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    api_url         VARCHAR(500) NOT NULL,
    api_key         VARCHAR(500) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sync_interval   VARCHAR(20) NOT NULL DEFAULT '1h',
    last_synced_at  TIMESTAMPTZ(6),
    products_count  INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_ecommerce_stores_project_id ON ecommerce_stores(project_id);

ALTER TABLE products ADD COLUMN store_id INT REFERENCES ecommerce_stores(id);
CREATE INDEX idx_products_store_id ON products(store_id);
