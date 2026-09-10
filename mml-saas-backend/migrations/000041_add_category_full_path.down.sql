DROP INDEX IF EXISTS idx_products_category_full_path;
ALTER TABLE products DROP COLUMN IF EXISTS category_full_path;
