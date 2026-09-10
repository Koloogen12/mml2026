ALTER TABLE products ADD COLUMN IF NOT EXISTS size_chart jsonb;
COMMENT ON COLUMN products.size_chart IS 'Per-product size chart. JSONB: {"S": {"chest_min":86,"chest_max":90,"waist_min":65,"waist_max":69,"hip_min":90,"hip_max":94}, ...}. NULL = use standard RU table.';
