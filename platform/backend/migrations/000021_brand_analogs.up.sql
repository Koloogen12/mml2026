-- Аналоги: бренд вкуса → бренды НАШЕГО каталога, которыми его можно заменить.
--
-- Зачем. «Любимые бренды» — сигнал вкуса, и почти всегда это марки, которых у
-- нас нет: человек носит Burberry, а в каталоге Burberry не будет никогда.
-- Без этой таблицы его выбор не влиял ни на что: буст по бренду искал точное
-- совпадение имени и не находил ничего.
--
-- rank: 1 — ближайший аналог, дальше по убыванию близости.
-- source: чем размечено (llm / manual) — чтобы ручную правку не затирал
--         повторный автоматический прогон.
CREATE TABLE brand_analogs (
  taste_brand_id BIGINT NOT NULL REFERENCES taste_brands(id) ON DELETE CASCADE,
  brand_id       BIGINT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  rank           INT NOT NULL DEFAULT 1,
  reason         TEXT NOT NULL DEFAULT '',
  source         TEXT NOT NULL DEFAULT 'llm' CHECK (source IN ('llm', 'manual')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (taste_brand_id, brand_id)
);
CREATE INDEX idx_brand_analogs_taste ON brand_analogs (taste_brand_id, rank);
