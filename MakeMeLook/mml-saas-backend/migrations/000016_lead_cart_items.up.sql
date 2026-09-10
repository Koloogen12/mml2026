CREATE TABLE lead_cart_items (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    lead_id         BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    product_id      INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    try_on_id       BIGINT REFERENCES lead_try_ons(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_lead_cart_items_lead_id ON lead_cart_items (lead_id);
CREATE INDEX idx_lead_cart_items_product_id ON lead_cart_items (product_id);
CREATE INDEX idx_lead_cart_items_deleted_at ON lead_cart_items (deleted_at) WHERE deleted_at IS NOT NULL;
