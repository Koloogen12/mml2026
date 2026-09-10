-- Credential vault: encrypted storage for merchant-owned provider credentials.
--
-- The platform is non-custodial: money never passes through us, but the
-- merchant's acquiring, fiscal, delivery and inventory keys do live here.
-- They are stored under envelope encryption — a per-project data key wraps the
-- credentials, the master keyset wraps the data key — and never in plaintext.
--
-- Note on scope: ecommerce_stores.api_key predates this table and still holds
-- catalog-sync tokens in plaintext. Migrating it touches the running sync
-- service and is tracked separately; this migration does not change it.

-- Per-project data encryption key, wrapped by the master keyset.
CREATE TABLE project_deks (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id   INT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    wrapped_dek  BYTEA NOT NULL,
    key_version  INT NOT NULL,
    created_at   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rotated_at   TIMESTAMPTZ(6)
);

CREATE INDEX idx_project_deks_key_version ON project_deks (key_version);

-- A merchant's connection to an external provider. Metadata only — no secrets.
CREATE TABLE provider_connections (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id    INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind          VARCHAR(32) NOT NULL,
    provider      VARCHAR(64) NOT NULL,
    status        VARCHAR(32) NOT NULL DEFAULT 'pending',
    capabilities  JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_sandbox    BOOLEAN NOT NULL DEFAULT true,
    last_error    TEXT,
    verified_at   TIMESTAMPTZ(6),
    created_at    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMPTZ(6)
);

CREATE INDEX idx_provider_connections_project_id ON provider_connections (project_id);
CREATE INDEX idx_provider_connections_deleted_at ON provider_connections (deleted_at);

-- One active connection per (project, kind, provider).
CREATE UNIQUE INDEX idx_provider_connections_unique_active
    ON provider_connections (project_id, kind, provider)
    WHERE deleted_at IS NULL;

-- The encrypted credential blob for a connection.
--
-- Separate from provider_connections so that reading connection metadata for a
-- list screen never touches ciphertext, and so the row can be hard-deleted on
-- disconnect while the connection keeps its audit trail.
CREATE TABLE provider_credentials (
    id             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    connection_id  INT NOT NULL UNIQUE REFERENCES provider_connections(id) ON DELETE CASCADE,
    project_id     INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ciphertext     BYTEA NOT NULL,
    key_version    INT NOT NULL,
    created_at     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_credentials_project_id ON provider_credentials (project_id);

-- Every decryption is recorded. Answering "who read this merchant's acquiring
-- key, when, and for what operation" is a question we must be able to answer
-- without qualification.
CREATE TABLE credential_access_logs (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id     INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    connection_id  INT REFERENCES provider_connections(id) ON DELETE SET NULL,
    reason         VARCHAR(64) NOT NULL,
    actor_type     VARCHAR(32) NOT NULL,
    actor_id       INT,
    succeeded      BOOLEAN NOT NULL,
    accessed_at    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credential_access_logs_project_id ON credential_access_logs (project_id);
CREATE INDEX idx_credential_access_logs_connection_id ON credential_access_logs (connection_id);
CREATE INDEX idx_credential_access_logs_accessed_at ON credential_access_logs (accessed_at);
