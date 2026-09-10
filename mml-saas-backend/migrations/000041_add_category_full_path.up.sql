-- Store the full CS-Cart category_path (e.g. "Женская одежда / Платья / Повседневные")
-- alongside the existing subcategory (which now holds the first meaningful
-- segment after generic roots, e.g. "Платья"). The full path lets the widget
-- render a proper hierarchical category tree later, while subcategory keeps
-- the flat tag list working for current UI.
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_full_path TEXT;

-- Backfill from raw_data.category_path. The category_path key is added by
-- the CS-Cart adapter; for products from other platforms it may be missing,
-- in which case we leave the column NULL.
UPDATE products
SET category_full_path = raw_data->>'category_path'
WHERE raw_data ? 'category_path' AND category_full_path IS NULL;

-- Re-derive subcategory: skip generic roots ("Женская одежда", "Мужская одежда",
-- "Товары без категории", "Все товары") and take the FIRST meaningful segment.
-- Falls back to last segment for paths that are entirely generic.
CREATE OR REPLACE FUNCTION pg_temp.first_meaningful_segment(path TEXT) RETURNS TEXT AS $$
DECLARE
    parts TEXT[];
    seg TEXT;
    skip_roots TEXT[] := ARRAY['Женская одежда', 'Мужская одежда', 'Товары без категории', 'Все товары'];
BEGIN
    IF path IS NULL OR path = '' THEN
        RETURN NULL;
    END IF;
    parts := string_to_array(path, '/');
    FOREACH seg IN ARRAY parts LOOP
        seg := trim(both ' ' from seg);
        IF seg <> '' AND NOT (seg = ANY(skip_roots)) THEN
            RETURN seg;
        END IF;
    END LOOP;
    -- All segments were generic — return last non-empty as fallback.
    RETURN trim(both ' ' from parts[array_length(parts, 1)]);
END;
$$ LANGUAGE plpgsql;

UPDATE products
SET subcategory = pg_temp.first_meaningful_segment(category_full_path)
WHERE category_full_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_full_path ON products(category_full_path) WHERE deleted_at IS NULL;
