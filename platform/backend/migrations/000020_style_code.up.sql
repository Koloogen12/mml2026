-- Стиль-код паспорта, сгенерированный моделью по ответам онбординга.
-- Кэшируем: без этого каждый заход в паспорт — платный вызов LLM.
-- passport_rev — отпечаток паспорта, по которому код собран: изменился
-- паспорт → код пересоберётся, не изменился → отдаём сохранённый.
CREATE TABLE user_style_code (
  user_id      BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  axes         JSONB NOT NULL DEFAULT '[]',
  passport_rev TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
