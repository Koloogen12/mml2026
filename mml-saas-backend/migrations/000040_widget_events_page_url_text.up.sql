-- widget_events.page_url was VARCHAR(2048); long Tilda URLs with deep query
-- strings overflowed it and dropped analytics events. TEXT has no length cap.
ALTER TABLE widget_events ALTER COLUMN page_url TYPE TEXT;
