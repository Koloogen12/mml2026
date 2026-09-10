-- Allow product_id to be NULL (photos are uploaded before product creation)
ALTER TABLE product_photos ALTER COLUMN product_id DROP NOT NULL;

-- Track who uploaded the photo and which project it belongs to
ALTER TABLE product_photos ADD COLUMN uploaded_by INT;
ALTER TABLE product_photos ADD COLUMN project_id  INT;

CREATE INDEX idx_product_photos_uploaded_by ON product_photos (uploaded_by);
CREATE INDEX idx_product_photos_project_id  ON product_photos (project_id);

-- Backfill project_id for existing rows from products table
UPDATE product_photos pp
SET project_id = (SELECT project_id FROM products WHERE id = pp.product_id)
WHERE pp.product_id IS NOT NULL;
