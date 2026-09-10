-- Ф-прод-1: происхождение товара — из какого источника каталога партнёра он
-- пришёл. Нужно для дифф-синка (что удалить = наши товары этого источника,
-- которых больше нет в фиде) и для атрибуции «что сломалось» по партнёру.
ALTER TABLE products
    ADD COLUMN source_id BIGINT REFERENCES partner_catalog_sources(id) ON DELETE SET NULL;
CREATE INDEX idx_products_source ON products (source_id);
