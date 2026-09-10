CREATE TABLE avatars (
    id              SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    gender          VARCHAR(50) NOT NULL,
    figure_type     VARCHAR(50) NOT NULL,
    height_min      INT,
    height_max      INT,
    weight_min      INT,
    weight_max      INT,
    size_eu         VARCHAR(10),
    photo_key       TEXT NOT NULL,
    thumbnail_key   TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_avatars_public_id ON avatars (public_id);
CREATE INDEX idx_avatars_gender ON avatars (gender);
CREATE INDEX idx_avatars_figure_type ON avatars (figure_type);
CREATE INDEX idx_avatars_is_active ON avatars (is_active);
