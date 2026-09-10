ALTER TABLE product_photos DROP COLUMN IF EXISTS external_url;
UPDATE product_photos SET object_key = '' WHERE object_key IS NULL;
ALTER TABLE product_photos ALTER COLUMN object_key SET NOT NULL;
