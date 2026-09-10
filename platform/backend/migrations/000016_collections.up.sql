-- Коллекции покупателя («Избранное» — дефолтная, плюс свои борды).
-- Раньше избранное жило только в стейте фронта и терялось при перезагрузке.
CREATE TABLE collections (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id  UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Одна дефолтная коллекция на человека.
CREATE UNIQUE INDEX idx_collections_default ON collections (user_id) WHERE is_default;
CREATE INDEX idx_collections_user ON collections (user_id, created_at DESC);

CREATE TABLE collection_items (
  collection_id BIGINT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id    BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, product_id)
);
CREATE INDEX idx_collection_items_product ON collection_items (product_id);
