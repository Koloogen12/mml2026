CREATE TABLE email_verifications (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code            VARCHAR(6) NOT NULL,
    expires_at      TIMESTAMPTZ(6) NOT NULL,
    verified_at     TIMESTAMPTZ(6),
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_email_verifications_user_id ON email_verifications (user_id);
CREATE INDEX idx_email_verifications_code ON email_verifications (code);
CREATE INDEX idx_email_verifications_expires_at ON email_verifications (expires_at);
