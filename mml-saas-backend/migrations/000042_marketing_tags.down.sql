DROP INDEX IF EXISTS idx_products_marketing_tag;
ALTER TABLE products DROP COLUMN IF EXISTS marketing_tag;
ALTER TABLE store_categories DROP COLUMN IF EXISTS is_marketing_tag;
