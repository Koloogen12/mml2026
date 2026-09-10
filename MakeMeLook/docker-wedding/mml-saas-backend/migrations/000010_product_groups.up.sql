CREATE TABLE product_groups (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    is_permanent    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6)
);

CREATE INDEX idx_product_groups_project_id ON product_groups (project_id);
CREATE INDEX idx_product_groups_is_active ON product_groups (is_active);
CREATE INDEX idx_product_groups_deleted_at ON product_groups (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE product_group_items (
    product_id      INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    group_id        INT NOT NULL REFERENCES product_groups(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6),
    PRIMARY KEY (product_id, group_id)
);

CREATE INDEX idx_product_group_items_group_id ON product_group_items (group_id);
CREATE INDEX idx_product_group_items_deleted_at ON product_group_items (deleted_at) WHERE deleted_at IS NOT NULL;
