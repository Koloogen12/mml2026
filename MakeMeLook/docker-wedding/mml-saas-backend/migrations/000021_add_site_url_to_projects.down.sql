-- Remove site_url field from projects table
DROP INDEX IF EXISTS idx_projects_site_url;
ALTER TABLE projects DROP COLUMN site_url;
