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
	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string `validate:"required"`
	DBSSLMode  string
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

	// JWT
	JWTSecret           string `validate:"required,min=32"`
	JWTAccessExpMinutes int    // access token expiration in minutes
	JWTRefreshExpDays   int    // refresh token expiration in days

	// Gemini API (try-on)
	GeminiAPIKey        string
	GeminiTryOnModel    string
	GeminiTimeoutSec    int
	GeminiMaxRetries    int

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
        AIProxyURL string // optional HTTP/SOCKS5 proxy for AI API calls, e.g. http://user:pass@host:port
}

func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		return nil, fmt.Errorf("failed to load .env: %w", err)
	}

	cfg := &Config{
		AppEnv:   getEnv("APP_ENV", "development"),
		LogLevel: getEnv("LOG_LEVEL", "info"),

		ServerPort: getEnv("SERVER_PORT", "8080"),

		DBHost:     getEnv("DB_HOST", "127.0.0.1"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBName:     getEnv("DB_NAME", "makemelook"),
		DBUser:     getEnv("DB_USER", "makemelook"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),
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

		JWTSecret:           getEnv("JWT_SECRET", ""),
		JWTAccessExpMinutes: getEnvInt("JWT_ACCESS_EXP_MINUTES", 30),
		JWTRefreshExpDays:   getEnvInt("JWT_REFRESH_EXP_DAYS", 60),

		GeminiAPIKey:        getEnv("GEMINI_API_KEY", ""),
		GeminiTryOnModel:    getEnv("GEMINI_TRYON_MODEL", "gemini-2.0-flash-exp-image-generation"),
		GeminiTimeoutSec:    getEnvInt("GEMINI_TIMEOUT_SEC", 300),
		GeminiMaxRetries:    getEnvInt("GEMINI_MAX_RETRIES", 3),

		WidgetCDNURL: getEnv("WIDGET_CDN_URL", "https://cdn.makemelook.ai/widget"),

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

                AIProxyURL: getEnv("AI_PROXY_URL", ""),
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
