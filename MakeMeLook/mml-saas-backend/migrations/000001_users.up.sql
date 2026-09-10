CREATE TABLE users (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    last_name       VARCHAR(255),
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    company         VARCHAR(255),
    website         VARCHAR(255),
    country         VARCHAR(2),
    timezone        VARCHAR(63),
    avatar_url      TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending_verification',
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_created_at ON users (created_at);
CREATE INDEX idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NOT NULL;
