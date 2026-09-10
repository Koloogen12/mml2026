DROP INDEX IF EXISTS idx_products_source;
ALTER TABLE products DROP COLUMN IF EXISTS source_id;
