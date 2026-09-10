CREATE TABLE leads (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_token   UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),

    -- Body parameters
    gender          VARCHAR(50),
    height          INT,
    weight          INT,
    chest           INT,
    waist           INT,
    hip             INT,
    size            VARCHAR(10),
    belly_shape     VARCHAR(50),
    figure_type     VARCHAR(50),

    -- Contact
    email           VARCHAR(255),

    -- Technical
    ip              VARCHAR(45),
    user_agent      TEXT,
    device_info     JSONB,

    -- Visit tracking
    first_visit_at  TIMESTAMPTZ(6) NOT NULL,
    last_visit_at   TIMESTAMPTZ(6) NOT NULL,
    visit_count     INT NOT NULL DEFAULT 1,

    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_leads_project_id ON leads (project_id);
CREATE INDEX idx_leads_session_token ON leads (session_token);
CREATE INDEX idx_leads_gender ON leads (gender);
CREATE INDEX idx_leads_size ON leads (size);
CREATE INDEX idx_leads_created_at ON leads (created_at);
CREATE INDEX idx_leads_deleted_at ON leads (deleted_at) WHERE deleted_at IS NOT NULL;
