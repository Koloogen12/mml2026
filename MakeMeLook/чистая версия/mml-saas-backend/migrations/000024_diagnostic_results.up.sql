CREATE TABLE diagnostic_results (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id  INT NOT NULL REFERENCES projects(id),
    domain      VARCHAR(255) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    checks      JSONB NOT NULL DEFAULT '[]'::jsonb,
    checked_at  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMPTZ(6)
);

CREATE INDEX idx_diagnostic_results_project_id ON diagnostic_results(project_id);
CREATE INDEX idx_diagnostic_results_domain ON diagnostic_results(project_id, domain);
