DROP INDEX IF EXISTS idx_product_photos_project_id;
DROP INDEX IF EXISTS idx_product_photos_uploaded_by;
ALTER TABLE product_photos DROP COLUMN IF EXISTS project_id;
ALTER TABLE product_photos DROP COLUMN IF EXISTS uploaded_by;
ALTER TABLE product_photos ALTER COLUMN product_id SET NOT NULL;
