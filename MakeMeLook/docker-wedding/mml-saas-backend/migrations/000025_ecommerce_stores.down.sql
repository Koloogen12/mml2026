DROP INDEX IF EXISTS idx_products_store_id;
ALTER TABLE products DROP COLUMN IF EXISTS store_id;
DROP TABLE IF EXISTS ecommerce_stores;
