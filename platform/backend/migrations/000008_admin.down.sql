DROP TABLE IF EXISTS admin_audit_log;
DROP TABLE IF EXISTS feature_flags;
DROP TABLE IF EXISTS catalog_rejects;
DROP TABLE IF EXISTS catalog_sync_runs;
DROP TABLE IF EXISTS answer_labels;

ALTER TABLE tryons
    DROP COLUMN IF EXISTS model,
    DROP COLUMN IF EXISTS cost_kopecks,
    DROP COLUMN IF EXISTS error_reason;

DROP INDEX IF EXISTS idx_users_lead_status;
ALTER TABLE users
    DROP COLUMN IF EXISTS lead_status,
    DROP COLUMN IF EXISTS lead_source,
    DROP COLUMN IF EXISTS purchased_kopecks,
    DROP COLUMN IF EXISTS last_action_at;
