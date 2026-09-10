CREATE TABLE lead_try_ons (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id               UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    lead_id                 BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    result_key              TEXT NOT NULL,
    model_photo_id          BIGINT REFERENCES lead_photos(id) ON DELETE SET NULL,
    outerwear_product_id    INT REFERENCES products(id) ON DELETE SET NULL,
    tops_product_id         INT REFERENCES products(id) ON DELETE SET NULL,
    bottoms_product_id      INT REFERENCES products(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMPTZ(6)
);

CREATE INDEX idx_lead_try_ons_lead_id ON lead_try_ons (lead_id);
CREATE INDEX idx_lead_try_ons_public_id ON lead_try_ons (public_id);
CREATE INDEX idx_lead_try_ons_created_at ON lead_try_ons (created_at);
CREATE INDEX idx_lead_try_ons_deleted_at ON lead_try_ons (deleted_at) WHERE deleted_at IS NOT NULL;
