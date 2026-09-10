-- Revert the default to the historical 'gemini'. Existing rows are NOT
-- touched because the up-migration's UPDATE was lossy (we rewrote legacy
-- vertex/kling/gpt-image-2 rows to cometapi-gemini and we cannot recover
-- which legacy provider each project originally had).
ALTER TABLE projects
    ALTER COLUMN tryon_provider SET DEFAULT 'gemini';
