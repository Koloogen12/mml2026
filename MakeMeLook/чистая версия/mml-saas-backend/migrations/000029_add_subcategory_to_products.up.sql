ALTER TABLE products ADD COLUMN subcategory VARCHAR(50);
CREATE INDEX idx_products_subcategory ON products (subcategory);
