ALTER TABLE partners
  DROP COLUMN IF EXISTS company,
  DROP COLUMN IF EXISTS contact_person,
  DROP COLUMN IF EXISTS notify_feed_errors,
  DROP COLUMN IF EXISTS notify_weekly_digest;
