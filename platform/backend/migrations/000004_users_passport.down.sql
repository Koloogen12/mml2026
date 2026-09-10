ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS fk_chat_sessions_user;
DROP TABLE IF EXISTS consent_logs;
DROP TABLE IF EXISTS context_events;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS user_traits;
DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS email_codes;
DROP TABLE IF EXISTS users;
