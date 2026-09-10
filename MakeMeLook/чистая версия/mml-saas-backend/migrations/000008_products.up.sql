CREATE TABLE products (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    sku             VARCHAR(100),
    category        VARCHAR(50),
    gender          VARCHAR(50),
    price           NUMERIC(10, 2),
    discount_price  NUMERIC(10, 2),
    currency        VARCHAR(10),
    product_url     TEXT,
    season          TEXT[],
    color           VARCHAR(100),
    material        VARCHAR(255),
    brand           VARCHAR(100),
    sizes           TEXT[],
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    source          VARCHAR(50) NOT NULL DEFAULT 'manual',
    external_id     VARCHAR(255),
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_products_project_id ON products (project_id);
CREATE INDEX idx_products_public_id ON products (public_id);
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_gender ON products (gender);
CREATE INDEX idx_products_is_active ON products (is_active);
CREATE INDEX idx_products_created_at ON products (created_at);
CREATE INDEX idx_products_deleted_at ON products (deleted_at) WHERE deleted_at IS NOT NULL;
