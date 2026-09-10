-- Add columns for Minio bucket and object key
ALTER TABLE users ADD COLUMN avatar_bucket VARCHAR(63);
ALTER TABLE users ADD COLUMN avatar_key VARCHAR(255);

-- Extract bucket and key from existing avatar_url
-- Example: https://s3.makemelook.ai/user-avatars/uuid.jpg
-- Bucket: user-avatars, Key: uuid.jpg
UPDATE users
SET 
  avatar_bucket = split_part(split_part(avatar_url, '/', 4), '/', 1),
  avatar_key = split_part(avatar_url, '/', 5)
WHERE avatar_url IS NOT NULL;

-- Drop old avatar_url column
ALTER TABLE users DROP COLUMN avatar_url;
