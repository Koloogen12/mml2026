CREATE TABLE project_domains (
    id                      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id              INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    domain                  VARCHAR(255) NOT NULL,
    is_verified             BOOLEAN NOT NULL DEFAULT FALSE,
    verification_method     VARCHAR(50),
    verification_token      VARCHAR(255),
    verified_at             TIMESTAMPTZ(6),
    created_at              TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMPTZ(6)
);

CREATE UNIQUE INDEX idx_project_domains_unique ON project_domains (project_id, domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_domains_project_id ON project_domains (project_id);
CREATE INDEX idx_project_domains_domain ON project_domains (domain);
CREATE INDEX idx_project_domains_deleted_at ON project_domains (deleted_at) WHERE deleted_at IS NOT NULL;
