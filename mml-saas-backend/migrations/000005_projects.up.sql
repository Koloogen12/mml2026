CREATE TABLE projects (
    id                      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id               UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    owner_id                INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                    VARCHAR(255) NOT NULL,
    category                VARCHAR(50),
    target_audience         TEXT[],
    description             TEXT,
    logo_key                TEXT,
    status                  VARCHAR(50) NOT NULL DEFAULT 'draft',
    onboarding_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMPTZ(6)
);

CREATE INDEX idx_projects_owner_id ON projects (owner_id);
CREATE INDEX idx_projects_public_id ON projects (public_id);
CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_created_at ON projects (created_at);
CREATE INDEX idx_projects_deleted_at ON projects (deleted_at) WHERE deleted_at IS NOT NULL;
