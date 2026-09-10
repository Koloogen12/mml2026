ALTER TABLE lead_try_ons
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'done',
    ALTER COLUMN result_key DROP NOT NULL;

CREATE INDEX idx_lead_try_ons_status ON lead_try_ons (status) WHERE deleted_at IS NULL;

