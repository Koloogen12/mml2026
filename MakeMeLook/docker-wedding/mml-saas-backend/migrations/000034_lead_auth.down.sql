ALTER TABLE leads
    DROP COLUMN IF EXISTS auth_code,
    DROP COLUMN IF EXISTS auth_code_expires_at,
    DROP COLUMN IF EXISTS is_authenticated,
    DROP COLUMN IF EXISTS auth_provider;
