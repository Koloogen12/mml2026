ALTER TABLE products ADD COLUMN raw_data JSONB;

CREATE TABLE store_categories (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id        INT NOT NULL REFERENCES ecommerce_stores(id) ON DELETE CASCADE,
    external_id     VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    parent_name     VARCHAR(255),
    full_path       VARCHAR(500),
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (store_id, external_id)
);

CREATE INDEX idx_store_categories_store_id ON store_categories(store_id);

CREATE TABLE category_mappings (
    id                  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id            INT NOT NULL REFERENCES ecommerce_stores(id) ON DELETE CASCADE,
    store_category_id   INT NOT NULL REFERENCES store_categories(id) ON DELETE CASCADE,
    product_type        VARCHAR(50) NOT NULL,
    gender              VARCHAR(50),
    created_at          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (store_id, store_category_id)
);

CREATE INDEX idx_category_mappings_store_id ON category_mappings(store_id);
