-- Периодичность синка источника каталога: daily | hourly | manual.
-- Внешний cron (cmd/sync-catalog) уважает эту каденцию по last_sync_at.
ALTER TABLE partner_catalog_sources
  ADD COLUMN schedule TEXT NOT NULL DEFAULT 'daily';
