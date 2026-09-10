CREATE TABLE password_resets (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code            VARCHAR(6) NOT NULL,
    expires_at      TIMESTAMPTZ(6) NOT NULL,
    used_at         TIMESTAMPTZ(6),
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_password_resets_user_id ON password_resets (user_id);
CREATE INDEX idx_password_resets_code ON password_resets (code);
CREATE INDEX idx_password_resets_expires_at ON password_resets (expires_at);
