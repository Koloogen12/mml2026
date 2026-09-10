-- Add back avatar_url column
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512);

-- Reconstruct avatar_url from bucket and key
UPDATE users
SET avatar_url = 'https://mml-saas.quantimo.ru/s3/' || avatar_bucket || '/' || avatar_key
WHERE avatar_bucket IS NOT NULL AND avatar_key IS NOT NULL;

-- Drop new columns
ALTER TABLE users DROP COLUMN avatar_bucket;
ALTER TABLE users DROP COLUMN avatar_key;
