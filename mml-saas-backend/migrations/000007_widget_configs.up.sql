CREATE TABLE widget_configs (
    id                      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id              INT UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Button
    button_position         VARCHAR(50) NOT NULL DEFAULT 'bottom-right',
    button_offset_x         INT NOT NULL DEFAULT 20,
    button_offset_y         INT NOT NULL DEFAULT 20,
    button_type             VARCHAR(50) NOT NULL DEFAULT 'circle',
    button_size             INT NOT NULL DEFAULT 56,
    button_bg_color         VARCHAR(7) NOT NULL DEFAULT '#000000',
    button_icon_color       VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    button_icon             TEXT,
    button_tooltip          VARCHAR(255) NOT NULL DEFAULT 'Примерить',
    button_shadow           BOOLEAN NOT NULL DEFAULT TRUE,
    button_animation        VARCHAR(50) NOT NULL DEFAULT 'pulse',
    button_delay            INT NOT NULL DEFAULT 0,

    -- Window
    color_mode              VARCHAR(50) NOT NULL DEFAULT 'light',
    accent_color            VARCHAR(7) NOT NULL DEFAULT '#000000',
    accent_text_color       VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    bg_color                VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    text_color              VARCHAR(7) NOT NULL DEFAULT '#1A1A1A',
    secondary_text_color    VARCHAR(7) NOT NULL DEFAULT '#898989',
    font_family             VARCHAR(100) NOT NULL DEFAULT 'Inter',
    border_radius           INT NOT NULL DEFAULT 12,
    logo_url                TEXT,
    show_powered_by         BOOLEAN NOT NULL DEFAULT TRUE,

    -- Stages, elements, cloth types (JSONB toggles)
    stages_enabled          JSONB NOT NULL DEFAULT '{"intro":true,"height_weight":true,"measurements":false,"size":false,"belly":false,"figure":false}',
    elements_enabled        JSONB NOT NULL DEFAULT '{"favorites":true,"cart":true,"history":true,"settings":true}',
    cloth_types_enabled     JSONB NOT NULL DEFAULT '{"outerwear":true,"tops":true,"bottoms":true,"shoes":true}',

    -- Avatars
    avatars_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    photo_mode_default      VARCHAR(50) NOT NULL DEFAULT 'both',

    -- Behavior
    auto_open               BOOLEAN NOT NULL DEFAULT FALSE,
    auto_open_delay         INT NOT NULL DEFAULT 5,
    remember_progress       BOOLEAN NOT NULL DEFAULT TRUE,
    language                VARCHAR(10) NOT NULL DEFAULT 'auto',

    created_at              TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMPTZ(6)
);

CREATE INDEX idx_widget_configs_project_id ON widget_configs (project_id);
CREATE INDEX idx_widget_configs_deleted_at ON widget_configs (deleted_at) WHERE deleted_at IS NOT NULL;
