CREATE TABLE lead_favorites (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    lead_id         BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    try_on_id       BIGINT REFERENCES lead_try_ons(id) ON DELETE SET NULL,
    image_key       TEXT NOT NULL,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_lead_favorites_lead_id ON lead_favorites (lead_id);
CREATE INDEX idx_lead_favorites_try_on_id ON lead_favorites (try_on_id);
CREATE INDEX idx_lead_favorites_deleted_at ON lead_favorites (deleted_at) WHERE deleted_at IS NOT NULL;
