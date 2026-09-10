-- Аватар пользователя: ссылка на объект в хранилище (MinIO), как у медиатеки
-- блога и загрузок партнёра. Само изображение в БД не держим.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
