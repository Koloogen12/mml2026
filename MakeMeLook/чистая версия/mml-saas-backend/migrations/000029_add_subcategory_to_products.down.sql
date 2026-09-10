DROP INDEX IF EXISTS idx_products_subcategory;
ALTER TABLE products DROP COLUMN IF EXISTS subcategory;
