-- Add site_url field to projects table
ALTER TABLE projects ADD COLUMN site_url VARCHAR(255) NOT NULL;

-- Create index for site_url
CREATE INDEX idx_projects_site_url ON projects (site_url);
