CREATE TABLE lead_photos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    lead_id         BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    object_key      TEXT NOT NULL,
    type            VARCHAR(50) NOT NULL DEFAULT 'model_photo',
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_lead_photos_lead_id ON lead_photos (lead_id);
CREATE INDEX idx_lead_photos_public_id ON lead_photos (public_id);
CREATE INDEX idx_lead_photos_deleted_at ON lead_photos (deleted_at) WHERE deleted_at IS NOT NULL;
