-- Журнал переходов в магазины партнёров — основа CPA-атрибуции.
-- Каждый заказ партнёра должен сводиться к конкретному click_id.
CREATE TABLE clicks (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    click_id     UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    product_id   BIGINT NOT NULL REFERENCES products(id),
    offer_id     BIGINT NOT NULL REFERENCES offers(id),
    session_id   BIGINT REFERENCES chat_sessions(id),
    user_agent   TEXT,
    referer      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clicks_product ON clicks (product_id);
CREATE INDEX idx_clicks_session ON clicks (session_id);
