CREATE EXTENSION IF NOT EXISTS vector;

-- Бренд — витрина и идентичность продавца.
CREATE TABLE brands (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    logo_url    TEXT,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Канонический товар. Цены здесь НЕТ — цена живёт в оффере:
-- один товар может продаваться в нескольких магазинах (мультиретейлерная карточка).
CREATE TABLE products (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id     UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    brand_id      BIGINT NOT NULL REFERENCES brands(id),
    name          TEXT NOT NULL,
    description   TEXT,
    gender        TEXT,                          -- female | male | unisex
    garment_zone  TEXT,                          -- outerwear | tops | bottoms | shoes | accessories
    category      TEXT,
    subcategory   TEXT,
    color         TEXT,
    material      TEXT,
    season        TEXT[],
    -- LLM-обогащение (силуэт, вырез, повод, посадка …) — схема намеренно свободная,
    -- набор атрибутов будет расти; жёсткие колонки только у того, по чему фильтруем.
    attributes    JSONB NOT NULL DEFAULT '{}',
    tryon_eligible          BOOLEAN NOT NULL DEFAULT false,
    tryon_ineligible_reason TEXT,                -- человеческая причина: «обувь пока не поддерживается»
    text_embedding vector(384),                  -- multilingual-e5-small; image_embedding добавится отдельной миграцией
    source        TEXT NOT NULL DEFAULT 'import',
    external_key  TEXT,                          -- ключ дедупликации в источнике
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ,
    UNIQUE (brand_id, external_key)
);

-- Оффер — «этот товар в этом магазине за эту цену».
CREATE TABLE offers (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id    BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    retailer      TEXT NOT NULL,
    retailer_slug TEXT NOT NULL,
    price         NUMERIC(12,2) NOT NULL,
    old_price     NUMERIC(12,2),
    currency      TEXT NOT NULL DEFAULT 'RUB',
    sizes         TEXT[],
    in_stock      BOOLEAN NOT NULL DEFAULT true,
    product_url   TEXT NOT NULL,
    cpa_network   TEXT,
    external_id   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, retailer_slug)
);

CREATE TABLE product_images (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    position   INT NOT NULL DEFAULT 0,
    kind       TEXT NOT NULL DEFAULT 'catalog',  -- catalog | model | detail
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_zone    ON products (garment_zone) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_gender  ON products (gender)       WHERE deleted_at IS NULL;
CREATE INDEX idx_products_brand   ON products (brand_id);
CREATE INDEX idx_offers_product   ON offers (product_id);
CREATE INDEX idx_images_product   ON product_images (product_id);
CREATE INDEX idx_products_attrs   ON products USING gin (attributes);
CREATE INDEX idx_products_text_emb ON products
    USING hnsw (text_embedding vector_cosine_ops);
