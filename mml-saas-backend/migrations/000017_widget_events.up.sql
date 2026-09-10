CREATE TABLE widget_events (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    lead_id         BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    session_token   VARCHAR(255) NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    event_data      JSONB NOT NULL DEFAULT '{}',
    page_url        VARCHAR(2048),
    ip              VARCHAR(45) NOT NULL,
    user_agent      VARCHAR(512) NOT NULL,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_widget_events_project_id ON widget_events (project_id);
CREATE INDEX idx_widget_events_lead_id ON widget_events (lead_id);
CREATE INDEX idx_widget_events_created_at ON widget_events (created_at);
CREATE INDEX idx_widget_events_project_created ON widget_events (project_id, created_at);
CREATE INDEX idx_widget_events_deleted_at ON widget_events (deleted_at) WHERE deleted_at IS NOT NULL;
