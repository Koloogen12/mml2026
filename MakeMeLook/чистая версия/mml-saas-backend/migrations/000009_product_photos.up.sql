CREATE TABLE product_photos (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id      INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    object_key      TEXT NOT NULL,
    original_key    TEXT,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_product_photos_product_id ON product_photos (product_id);
CREATE INDEX idx_product_photos_sort_order ON product_photos (sort_order);
CREATE INDEX idx_product_photos_deleted_at ON product_photos (deleted_at) WHERE deleted_at IS NOT NULL;
