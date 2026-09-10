-- Блог: авторы, посты, медиатека.
-- Схема из спеки BLOG-ADMIN-MODULE-SPEC.md §3, адаптированная:
--   * одноязычно — lang оставлен со значением 'ru' по умолчанию, чтобы
--     включить второй язык потом без миграции; translation_slug не заводим;
--   * newsletter_subscribers не переносим (подписки в блоге нам не нужны);
--   * медиа лежит в MinIO (у нас уже есть storage), а не на локальном диске,
--     поэтому storage_path — ключ объекта в бакете.
CREATE TABLE blog_authors (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id  UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  name       TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  bio        TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blog_posts (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  slug            TEXT NOT NULL,
  lang            TEXT NOT NULL DEFAULT 'ru',
  title           TEXT NOT NULL,
  excerpt         TEXT NOT NULL DEFAULT '',
  content_json    JSONB,                      -- документ TipTap для редактора
  content_html    TEXT NOT NULL DEFAULT '',   -- отрендеренный HTML для отдачи
  cover_image     TEXT NOT NULL DEFAULT '',
  tag             TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','published','scheduled')),
  featured        BOOLEAN NOT NULL DEFAULT false,
  reading_time    INT NOT NULL DEFAULT 0,
  author_id       BIGINT REFERENCES blog_authors(id) ON DELETE SET NULL,
  seo_title       TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  published_at    TIMESTAMPTZ,
  scheduled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- slug уникален в пределах языка: публичная страница ищет именно по паре.
CREATE UNIQUE INDEX idx_blog_posts_slug_lang ON blog_posts (slug, lang);
CREATE INDEX idx_blog_posts_status ON blog_posts (status);
CREATE INDEX idx_blog_posts_published ON blog_posts (published_at DESC NULLS LAST);

CREATE TABLE blog_media (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id    UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  filename     TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url          TEXT NOT NULL,
  mime_type    TEXT NOT NULL DEFAULT '',
  size_bytes   BIGINT NOT NULL DEFAULT 0,
  width        INT NOT NULL DEFAULT 0,
  height       INT NOT NULL DEFAULT 0,
  uploaded_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_media_created ON blog_media (created_at DESC);
