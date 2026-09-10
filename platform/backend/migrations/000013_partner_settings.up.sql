-- Настройки кабинета партнёра: юр-лицо, контактное лицо, префы уведомлений.
ALTER TABLE partners
  ADD COLUMN company                TEXT,
  ADD COLUMN contact_person         TEXT,
  ADD COLUMN notify_feed_errors     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN notify_weekly_digest   BOOLEAN NOT NULL DEFAULT false;
