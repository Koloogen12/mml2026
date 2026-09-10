-- Ф5: атрибуция продаж. Партнёр/CPA-сеть подтверждает заказ postback'ом с
-- click_id + подписью. Подпись отсекает выдуманные/чужие click_id — доверяем
-- криптографии, а не отправителю. Это тот самый «видно, за что заплачено».
CREATE TABLE conversions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    click_id      UUID NOT NULL REFERENCES clicks(click_id),
    external_order_id TEXT,                    -- id заказа у партнёра
    amount        NUMERIC(12,2),
    currency      TEXT NOT NULL DEFAULT 'RUB',
    status        TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected|paid
    source        TEXT,                        -- сеть/партнёр, приславший postback
    raw           JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Один заказ = одна конверсия (идемпотентность повторных postback'ов).
    UNIQUE (click_id, external_order_id)
);

CREATE INDEX idx_conversions_click ON conversions (click_id);
CREATE INDEX idx_conversions_status ON conversions (status, created_at DESC);
