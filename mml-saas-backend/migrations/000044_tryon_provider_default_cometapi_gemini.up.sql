-- Switch the default try-on provider from 'gemini' to 'cometapi-gemini'.
--
-- Background: 'cometapi-gemini' (MML V1) is the only provider that reaches
-- Google Gemini reliably from RU networks, and is now the recommended
-- production path. 'gemini' (MML V2) remains supported as a direct AI Studio
-- fallback when CometAPI is down — admins who explicitly picked it stay
-- on it through this migration.
--
-- Legacy providers ('vertex', 'cometapi-kling', 'cometapi-gpt-image-2') were
-- removed from the codebase entirely; any project row still set to one of
-- those is rewritten to the new default so the dispatcher never receives an
-- unknown provider.
ALTER TABLE projects
    ALTER COLUMN tryon_provider SET DEFAULT 'cometapi-gemini';

UPDATE projects
SET tryon_provider = 'cometapi-gemini'
WHERE tryon_provider IN ('vertex', 'cometapi-kling', 'cometapi-gpt-image-2');
