package config

import (
	"fmt"
	"os"
	"strconv"

	"mml-saas-backend/pkg/logger"

	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
)

type Config struct {
	// Application
	AppEnv   string
	LogLevel string

	// HTTP Server
	ServerPort string

	// Database
	DBHost               string
	DBPort               string
	DBName               string
	DBUser               string
	DBPassword           string `validate:"required"`
	DBSSLMode            string
	DBLogLevel           string
	DBMaxOpenConns       int
	DBMaxIdleConns       int
	DBConnMaxLifetimeSec int
	DBConnMaxIdleTimeSec int

	// Minio (S3)
	MinioEndpoint  string
	MinioAccessKey string `validate:"required"`
	MinioSecretKey string `validate:"required"`
	MinioBucket    string
	MinioUseSSL    bool
	MinioPublicURL string

	// Credential vault master keyset.
	//
	// Format: "<version>:<base64-32-bytes>[,<version>:<base64-32-bytes>...]".
	// The highest version encrypts new data; older versions stay listed so
	// existing rows keep decrypting until the rotation job has rewrapped them.
	//
	// Generate a key with: head -c 32 /dev/urandom | base64
	//
	// Empty disables the vault: connecting a payment, fiscal, delivery or
	// inventory provider is refused rather than storing credentials in the
	// clear. Required before any store goes live.
	CredentialKeyset string

	// JWT
	JWTSecret           string `validate:"required,min=32"`
	JWTAccessExpMinutes int    // access token expiration in minutes
	JWTRefreshExpDays   int    // refresh token expiration in days

	// Gemini API (try-on)
	GeminiAPIKey             string
	GeminiTryOnModel         string
	GeminiTryOnFallbackModel string
	// GeminiTryOnRaceModels — additional image-generation models to race
	// in parallel with the primary. Each model is dispatched as a
	// concurrent generateContent request; the first successful response
	// wins, the others are cancelled. Comma-separated, takes effect on
	// top of GeminiTryOnModel + GeminiTryOnFallbackModel. Empty = no race
	// (legacy sequential behaviour).
	GeminiTryOnRaceModels string
	// GeminiTryOnStaggerMs delays the launch of fallback/race models by
	// this many ms after the primary model started. If the primary model
	// returns success within the stagger window, fallbacks NEVER dispatch
	// and we pay only for one call. If the primary hangs/errors, fallbacks
	// kick in and the race semantics return. Set to 0 to disable stagger
	// (legacy: all models race in parallel, ~3x billed).
	GeminiTryOnStaggerMs  int
	GeminiValidationModel string
	GeminiTimeoutSec      int
	GeminiMaxRetries      int
	// TryOnSkipValidation — kill-switch for the photo gatekeeper. When true,
	// ValidateModelPhoto returns OK without calling Gemini, saving CometAPI
	// budget. Trade-off: garbage photos (screenshots, multi-person, mannequins)
	// reach the expensive image-gen model and burn $0.05-0.115 each.
	TryOnSkipValidation bool

	// fal.ai provider config (alternative try-on backend, mostly legacy)
	FalAPIKey     string
	FalTimeoutSec int

	// Widget
	WidgetCDNURL string

	// CORS
	CORSAllowedOrigins string

	// Rate Limits
	RateLimitWidgetPerMin int
	RateLimitTryOnPerHour int
	RateLimitTryOnPerDay  int

	// SMTP
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string

	// Auth
	AuthResendCooldownSec   int
	AuthMaxLoginAttempts    int
	AuthLoginLimitWindowMin int

	// OAuth
	GoogleOAuthClientID     string
	GoogleOAuthClientSecret string
	YandexOAuthClientID     string
	YandexOAuthClientSecret string
	OAuthBaseURL            string // e.g. https://api.makemeelook.ai

	// AI
	AIProxyURL         string // primary HTTP proxy for AI API calls (Russia geo-block bypass), e.g. http://127.0.0.1:10809
	AIProxyURLFallback string // fallback HTTP proxy used if primary returns ErrProxyUnreachable

	// Telegram operational notifier (try-on done/failed, validation rejects).
	// TelegramBotToken + TelegramChatID must both be set for the default
	// notifier to fire; empty = silent.
	TelegramBotToken string
	TelegramChatID   string
	// TelegramChatIDOverrides routes notifications for SPECIFIC projects to
	// SPECIFIC chats, while everything else goes to TelegramChatID. Format:
	//
	//   "Project A:-100123,Project B:987654321"
	//
	// Project name match is case-insensitive against the project's display
	// name. Useful when one customer has a shared group with us (their CEO
	// + our admin), but other projects' events should stay in the admin's
	// private DM. Empty = single-chat mode (everything to TelegramChatID).
	TelegramChatIDOverrides string
	// TelegramProxyURL is a dedicated HTTP proxy for api.telegram.org (RU
	// blocks Telegram's API at the network level). If empty, falls back to
	// AIProxyURLFallback then AIProxyURL — that ordering matters because the
	// AI-side primary proxy can rotate / die while the fallback proxy keeps
	// working, and we don't want the notifier to go silent when AI traffic
	// has already moved off the primary route. Empty everywhere = direct
	// connection (works only outside RU).
	TelegramProxyURL string
	// TelegramAPIBaseURL overrides the canonical https://api.telegram.org
	// root, typically pointing at a Cloudflare Worker that mirrors the Bot
	// API. Free-tier-friendly alternative to the SOCKS/HTTP proxy approach
	// when running from RU networks. Empty = use api.telegram.org directly
	// (which only works outside RU or when TelegramProxyURL is set).
	TelegramAPIBaseURL string

	// CometAPI (try-on) — used when project.tryon_provider = 'cometapi-gemini',
	// which is the default. CometAPI is an aggregator that exposes Google's
	// Gemini image-generation endpoint through a paid passthrough; this is
	// the only known route that works reliably from Russian networks.
	CometAPIKey         string
	CometAPIBaseURL     string // default https://api.cometapi.com
	CometAPIGeminiModel string // gemini-2.5-flash-image (default primary)
	// CometAPIGeminiSafetyModels is a comma-separated list of models to retry
	// against when the primary returns IMAGE_SAFETY / IMAGE_OTHER. Each step
	// is more permissive than the previous one (and usually more expensive).
	// Empty = no fallback. Typical: "gemini-3.1-flash-image-preview,gemini-3-pro-image-preview".
	CometAPIGeminiSafetyModels string
	// CometAPIGeminiModelMulti overrides the primary model when a try-on stacks
	// many garments. With 3+ garment references the customer photo loses its
	// dominance on lighter models (identity/pose drift), so heavy layered
	// try-ons route to a higher-capacity model. Empty = no override (always use
	// the base primary regardless of garment count).
	CometAPIGeminiModelMulti string
	// CometAPIGeminiMultiThreshold is the garment count (inclusive) at which the
	// multi model kicks in. Default 3.
	CometAPIGeminiMultiThreshold int

	// GPT Image 2.5 through CometAPI — the default try-on path
	// (project.tryon_provider = 'cometapi-gptimage'). Same account and key as
	// the Gemini passthrough above, but a different wire protocol: OpenAI's
	// multipart /v1/images/edits instead of Gemini's JSON generateContent.
	//
	// CometAPIGPTImageModel is the primary. Sunburst rather than Flare on
	// purpose: measured on the same lace/sequin dress, Flare tripped OpenAI's
	// moderation on 4 of 8 identical requests while Sunburst passed 6 of 6.
	// Both bill at the same CometAPI rate, so consistency is free here.
	CometAPIGPTImageModel string
	// CometAPIGPTImageFallbackModels is a comma-separated retry chain used when
	// the primary is blocked by moderation or fails transiently. Empty = no
	// in-provider fallback (the dispatcher still falls back to Gemini).
	CometAPIGPTImageFallbackModels string
	// CometAPIGPTImageSize is the OpenAI `size` parameter. "auto" lets the model
	// keep the customer photo's aspect ratio — important because forcing a
	// square on a portrait photo crops or distorts the person. Other accepted
	// values: 1024x1024, 1024x1536, 1536x1024.
	CometAPIGPTImageSize string

	// --- Композит идентичности (сервис mml-vto-segmenter) ---------------
	//
	// Генеративная модель перерисовывает лицо покупателя. Сервис собирает
	// итог из двух источников по семантической сегментации и возвращает
	// родное лицо. Он ОБЯЗАН быть необязательным: любой сбой или таймаут —
	// отдаём генерацию как есть. Примерка не падает из-за композита никогда.
	//
	// VTOCompositeURL пустой = выключено. Это и есть рубильник: убрать
	// строку из env и перезапустить api — быстрее, чем откатывать образ.
	VTOCompositeURL string
	// VTOCompositeTimeoutSec — потолок ожидания. Композит меряли в 1.0-1.2 с
	// на генерации в 25 с; пять секунд оставляют запас и всё ещё не дают
	// сервису удерживать примерку.
	VTOCompositeTimeoutSec int
	// VTOCompositeSamplePct — доля запросов, на которых сервис дополнительно
	// считает косинус ArcFace для тревоги. Считать его на каждом запросе
	// дорого и незачем: тревога нужна как сигнал тренда, а не как проверка
	// каждого кадра.
	VTOCompositeSamplePct int
}

func Load() (*Config, error) {
	// .env file is optional: in local dev it overrides the shell env,
	// in Cloud Run / container envs the file is absent and env vars
	// are injected directly by the platform.
	if err := godotenv.Load(); err != nil {
		if !os.IsNotExist(err) {
			return nil, fmt.Errorf("failed to load .env: %w", err)
		}
	}

	cfg := &Config{
		AppEnv:   getEnv("APP_ENV", "development"),
		LogLevel: getEnv("LOG_LEVEL", "info"),

		ServerPort: getEnv("SERVER_PORT", "8080"),

		DBHost:               getEnv("DB_HOST", "127.0.0.1"),
		DBPort:               getEnv("DB_PORT", "5432"),
		DBName:               getEnv("DB_NAME", "makemelook"),
		DBUser:               getEnv("DB_USER", "makemelook"),
		DBPassword:           getEnv("DB_PASSWORD", ""),
		DBSSLMode:            getEnv("DB_SSL_MODE", "disable"),
		DBLogLevel:           getEnv("DB_LOG_LEVEL", "warn"),
		DBMaxOpenConns:       getEnvInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:       getEnvInt("DB_MAX_IDLE_CONNS", 5),
		DBConnMaxLifetimeSec: getEnvInt("DB_CONN_MAX_LIFETIME_SEC", 300),
		DBConnMaxIdleTimeSec: getEnvInt("DB_CONN_MAX_IDLE_TIME_SEC", 300),

		MinioEndpoint:  getEnv("MINIO_ENDPOINT", "127.0.0.1:9000"),
		MinioAccessKey: getEnv("MINIO_ACCESS_KEY", ""),
		MinioSecretKey: getEnv("MINIO_SECRET_KEY", ""),
		MinioBucket:    getEnv("MINIO_BUCKET", "makemelook"),
		MinioUseSSL:    getEnvBool("MINIO_USE_SSL", false),
		MinioPublicURL: getEnv("MINIO_PUBLIC_URL", ""),

		CredentialKeyset: getEnv("CREDENTIAL_KEYSET", ""),

		JWTSecret:           getEnv("JWT_SECRET", ""),
		JWTAccessExpMinutes: getEnvInt("JWT_ACCESS_EXP_MINUTES", 30),
		JWTRefreshExpDays:   getEnvInt("JWT_REFRESH_EXP_DAYS", 60),

		GeminiAPIKey:             getEnv("GEMINI_API_KEY", ""),
		GeminiTryOnModel:         getEnv("GEMINI_TRYON_MODEL", "gemini-2.0-flash-exp-image-generation"),
		GeminiTryOnFallbackModel: getEnv("GEMINI_TRYON_FALLBACK_MODEL", "gemini-2.5-flash-image"),
		GeminiTryOnRaceModels:    getEnv("GEMINI_TRYON_RACE_MODELS", ""),
		GeminiTryOnStaggerMs:     getEnvInt("GEMINI_TRYON_STAGGER_MS", 3000),
		GeminiValidationModel:    getEnv("GEMINI_VALIDATION_MODEL", "gemini-2.5-flash"),
		GeminiTimeoutSec:         getEnvInt("GEMINI_TIMEOUT_SEC", 300),
		GeminiMaxRetries:         getEnvInt("GEMINI_MAX_RETRIES", 3),
		TryOnSkipValidation:      getEnvBool("TRYON_SKIP_VALIDATION", false),
		FalAPIKey:                getEnv("FAL_API_KEY", ""),
		FalTimeoutSec:            getEnvInt("FAL_TIMEOUT_SEC", 300),

		WidgetCDNURL: getEnv("WIDGET_CDN_URL", "https://mml-saas.quantimo.ru/widget"),

		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),

		RateLimitWidgetPerMin: getEnvInt("RATE_LIMIT_WIDGET_PER_MIN", 100),
		RateLimitTryOnPerHour: getEnvInt("RATE_LIMIT_TRYON_PER_HOUR", 20),
		RateLimitTryOnPerDay:  getEnvInt("RATE_LIMIT_TRYON_PER_DAY", 50),

		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnvInt("SMTP_PORT", 587),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),

		AuthResendCooldownSec:   getEnvInt("AUTH_RESEND_COOLDOWN_SEC", 60),
		AuthMaxLoginAttempts:    getEnvInt("AUTH_MAX_LOGIN_ATTEMPTS", 5),
		AuthLoginLimitWindowMin: getEnvInt("AUTH_LOGIN_LIMIT_WINDOW_MIN", 15),

		GoogleOAuthClientID:     getEnv("GOOGLE_OAUTH_CLIENT_ID", ""),
		GoogleOAuthClientSecret: getEnv("GOOGLE_OAUTH_CLIENT_SECRET", ""),
		YandexOAuthClientID:     getEnv("YANDEX_OAUTH_CLIENT_ID", ""),
		YandexOAuthClientSecret: getEnv("YANDEX_OAUTH_CLIENT_SECRET", ""),
		OAuthBaseURL:            getEnv("OAUTH_BASE_URL", "http://localhost:8080"),

		AIProxyURL:         getEnv("AI_PROXY_URL", ""),
		AIProxyURLFallback: getEnv("AI_PROXY_URL_FALLBACK", ""),

		TelegramBotToken:        getEnv("TELEGRAM_BOT_TOKEN", ""),
		TelegramChatID:          getEnv("TELEGRAM_CHAT_ID", ""),
		TelegramChatIDOverrides: getEnv("TELEGRAM_CHAT_ID_OVERRIDES", ""),
		TelegramProxyURL:        getEnv("TELEGRAM_PROXY_URL", ""),
		TelegramAPIBaseURL:      getEnv("TELEGRAM_API_BASE_URL", ""),

		CometAPIKey:                  getEnv("COMETAPI_KEY", ""),
		CometAPIBaseURL:              getEnv("COMETAPI_BASE_URL", "https://api.cometapi.com"),
		CometAPIGeminiModel:          getEnv("COMETAPI_GEMINI_MODEL", "gemini-2.5-flash-image"),
		CometAPIGeminiSafetyModels:   getEnv("COMETAPI_GEMINI_SAFETY_MODELS", "gemini-3.1-flash-image-preview,gemini-3-pro-image-preview"),
		CometAPIGeminiModelMulti:     getEnv("COMETAPI_GEMINI_MODEL_MULTI", ""),
		CometAPIGeminiMultiThreshold: getEnvInt("COMETAPI_GEMINI_MULTI_THRESHOLD", 3),

		CometAPIGPTImageModel:          getEnv("COMETAPI_GPTIMAGE_MODEL", "gpt-image-2.5-sunburst"),
		CometAPIGPTImageFallbackModels: getEnv("COMETAPI_GPTIMAGE_FALLBACK_MODELS", "gpt-image-2.5-flare"),
		CometAPIGPTImageSize:           getEnv("COMETAPI_GPTIMAGE_SIZE", "auto"),

		VTOCompositeURL:        getEnv("VTO_COMPOSITE_URL", ""),
		VTOCompositeTimeoutSec: getEnvInt("VTO_COMPOSITE_TIMEOUT_SEC", 5),
		VTOCompositeSamplePct:  getEnvInt("VTO_COMPOSITE_SAMPLE_PCT", 10),
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("config validation: %w", err)
	}

	return cfg, nil
}

func (c *Config) Validate() error {
	return validator.New().Struct(c)
}

func (c *Config) DSN() string {
	return "host=" + c.DBHost +
		" port=" + c.DBPort +
		" user=" + c.DBUser +
		" password=" + c.DBPassword +
		" dbname=" + c.DBName +
		" sslmode=" + c.DBSSLMode
}

func (c *Config) DatabaseURL() string {
	return "postgres://" + c.DBUser + ":" + c.DBPassword +
		"@" + c.DBHost + ":" + c.DBPort +
		"/" + c.DBName + "?sslmode=" + c.DBSSLMode
}

func (c *Config) IsDevelopment() bool {
	return c.AppEnv == "development"
}

func (c *Config) IsProduction() bool {
	return c.AppEnv == "production"
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		intValue, err := strconv.Atoi(value)
		if err != nil {
			logger.Warn("config", "invalid int value, using default",
				"key", key, "value", value, "default", defaultValue, "error", err)
			return defaultValue
		}
		return intValue
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		boolValue, err := strconv.ParseBool(value)
		if err != nil {
			logger.Warn("config", "invalid bool value, using default",
				"key", key, "value", value, "default", defaultValue, "error", err)
			return defaultValue
		}
		return boolValue
	}
	return defaultValue
}
