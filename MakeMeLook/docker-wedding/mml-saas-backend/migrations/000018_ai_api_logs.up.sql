CREATE TABLE ai_api_logs (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id          INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    lead_id             BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    try_on_id           BIGINT REFERENCES lead_try_ons(id) ON DELETE SET NULL,
    model               VARCHAR(100) NOT NULL,
    provider            VARCHAR(50) NOT NULL,
    request_type        VARCHAR(30) NOT NULL,
    prompt              TEXT,
    input_images_count  INT NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL,
    error_message       VARCHAR(1024),
    error_code          VARCHAR(50),
    response_format     VARCHAR(30),
    prompt_tokens       INT,
    completion_tokens   INT,
    total_tokens        INT,
    latency_ms          INT,
    retry_count         INT NOT NULL DEFAULT 0,
    started_at          TIMESTAMPTZ(6) NOT NULL,
    finished_at         TIMESTAMPTZ(6),
    created_at          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMPTZ(6)
);

CREATE INDEX idx_ai_api_logs_project_id ON ai_api_logs (project_id);
CREATE INDEX idx_ai_api_logs_lead_id ON ai_api_logs (lead_id);
CREATE INDEX idx_ai_api_logs_try_on_id ON ai_api_logs (try_on_id);
CREATE INDEX idx_ai_api_logs_project_created ON ai_api_logs (project_id, created_at);
CREATE INDEX idx_ai_api_logs_deleted_at ON ai_api_logs (deleted_at) WHERE deleted_at IS NOT NULL;
