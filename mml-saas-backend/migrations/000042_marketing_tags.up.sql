-- Mark store categories that act as merchandising chips ("Новинки",
-- "Sale", "Скидки", etc.) rather than real product hierarchies.
ALTER TABLE store_categories
    ADD COLUMN IF NOT EXISTS is_marketing_tag BOOLEAN NOT NULL DEFAULT FALSE;

-- Per-product marketing tag — populated during sync from the product's
-- category_ids when any of them is flagged as a marketing category.
-- The widget surfaces this as a priority chip at the top of each layer.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS marketing_tag VARCHAR(64);

-- Backfill is_marketing_tag for existing rows by name match.
UPDATE store_categories SET is_marketing_tag = TRUE
WHERE LOWER(TRIM(name)) IN (
    'новинки', 'скоро в продаже', 'sale', 'скидки',
    'распродажа', 'новая коллекция', 'акции',
    'специальное предложение'
);

CREATE INDEX IF NOT EXISTS idx_products_marketing_tag ON products(project_id, marketing_tag) WHERE deleted_at IS NULL AND marketing_tag IS NOT NULL;
