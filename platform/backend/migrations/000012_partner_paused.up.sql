-- Пауза партнёра (админ): скрывает его товары и останавливает синк каталога.
ALTER TABLE partners ADD COLUMN paused BOOLEAN NOT NULL DEFAULT false;
