CREATE TABLE event_aggregates (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    metric_date     DATE NOT NULL,
    metric          VARCHAR(50) NOT NULL,
    value           BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6),
    UNIQUE (project_id, metric_date, metric)
);

CREATE INDEX idx_event_aggregates_project_id ON event_aggregates (project_id);
CREATE INDEX idx_event_aggregates_deleted_at ON event_aggregates (deleted_at) WHERE deleted_at IS NOT NULL;
