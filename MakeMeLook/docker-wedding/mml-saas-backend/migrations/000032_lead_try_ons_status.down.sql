DROP INDEX IF EXISTS idx_lead_try_ons_status;
UPDATE lead_try_ons SET result_key = '' WHERE result_key IS NULL;
ALTER TABLE lead_try_ons
    DROP COLUMN status,
    ALTER COLUMN result_key SET NOT NULL;
