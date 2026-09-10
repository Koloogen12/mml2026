CREATE TABLE IF NOT EXISTS waitlist_signups (
    id          BIGSERIAL PRIMARY KEY,
    phone       VARCHAR(32)  NOT NULL UNIQUE,
    source      VARCHAR(50)  NOT NULL DEFAULT 'makemelook_ai',
    ip          VARCHAR(45),
    user_agent  VARCHAR(512),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
