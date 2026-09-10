-- Ф8-R2: фото-эмбеддинг Marqo-FashionSigLIP (768d) для гибридного ретривала.
-- Слот был заранее заложен в 000001 («image_embedding добавится отдельной миграцией»).
ALTER TABLE products
    ADD COLUMN image_embedding    vector(768),
    ADD COLUMN image_embedded_at  TIMESTAMPTZ,   -- когда посчитан вектор (инкрементальный ETL)
    ADD COLUMN image_embed_error  TEXT;          -- причина, если фото не удалось обработать

-- ANN-индекс по косинусу для поиска похожих по фото.
CREATE INDEX idx_products_image_embedding
    ON products USING hnsw (image_embedding vector_cosine_ops);
