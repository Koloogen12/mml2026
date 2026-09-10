ALTER TABLE product_photos ADD COLUMN external_url TEXT;
ALTER TABLE product_photos ALTER COLUMN object_key DROP NOT NULL;
