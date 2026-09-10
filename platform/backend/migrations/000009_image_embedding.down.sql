DROP INDEX IF EXISTS idx_products_image_embedding;
ALTER TABLE products
    DROP COLUMN IF EXISTS image_embedding,
    DROP COLUMN IF EXISTS image_embedded_at,
    DROP COLUMN IF EXISTS image_embed_error;
