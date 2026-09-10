CREATE TABLE consent_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    lead_id         BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    session_token   VARCHAR(255) NOT NULL,
    policy_type     VARCHAR(50) NOT NULL,
    policy_version  VARCHAR(50) NOT NULL,
    locale          VARCHAR(10) NOT NULL DEFAULT 'ru',
    consented_at    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip              VARCHAR(45) NOT NULL,
    user_agent      VARCHAR(512) NOT NULL,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consent_logs_project_id ON consent_logs (project_id);
CREATE INDEX idx_consent_logs_lead_id ON consent_logs (lead_id);
CREATE INDEX idx_consent_logs_consented_at ON consent_logs (consented_at);
CREATE INDEX idx_consent_logs_project_type ON consent_logs (project_id, policy_type);
