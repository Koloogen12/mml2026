CREATE TABLE auth_sessions (
    id                  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id           VARCHAR(255),
    device_name         VARCHAR(255),
    ip                  VARCHAR(45),
    user_agent          TEXT,
    refresh_token       TEXT UNIQUE NOT NULL,
    refresh_expires_at  TIMESTAMPTZ(6) NOT NULL,
    last_activity_at    TIMESTAMPTZ(6),
    created_at          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMPTZ(6)
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions (user_id);
CREATE INDEX idx_auth_sessions_refresh_token ON auth_sessions (refresh_token);
CREATE INDEX idx_auth_sessions_deleted_at ON auth_sessions (deleted_at) WHERE deleted_at IS NOT NULL;
