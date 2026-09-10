package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Env            string // dev | stage | prod
	Port           string
	DatabaseURL    string
	MigrateOnStart bool

	AnthropicAPIKey   string
	AnthropicModel    string
	AnthropicBaseURL  string // прокси (Cloudflare Worker); пусто — прямой api.anthropic.com
	AnthropicProxyKey string // x-proxy-key для прокси

	RecoURL string // Python-сайдкар (эмбеддинги, реранк)

	ClickSigningSecret string // HMAC-подпись click_id в CPA-редиректах

	JWTSecret string // подпись access-токенов

	// Внутренняя админка (фаза 1 — ролей нет, все видят всё). Гейт по одному
	// общему токену в заголовке X-Admin-Token. Пусто в dev → гейт открыт локально.
	AdminToken string

	// Доставка писем (Resend). Пусто → dev-режим (код входа в лог).
	ResendAPIKey string
	ResendFrom   string // «MakeMeLook <noreply@домен>» (домен верифицирован в Resend)

	// Интеграция с виджетом (примерка). Пусто → mock-режим для демо.
	WidgetBaseURL   string
	WidgetProjectID string
	WidgetAPIKey    string

	// Снапшот виджетной БД — только для importer в dev.
	SnapshotDatabaseURL string

	// Объектное хранилище (MinIO/S3) для файлов партнёра (лого, размерная сетка).
	// Пусто → загрузки отключены (эндпоинт вернёт 501).
	StorageEndpoint  string // host:port (без схемы), напр. localhost:9010
	StorageAccessKey string
	StorageSecretKey string
	StorageBucket    string
	StoragePublicURL string // база публичных URL, напр. http://localhost:9010
	StorageUseSSL    bool

	// OAuth-вход (Google / Яндекс ID). Пустые ключи → провайдер выключен (501).
	// AppBaseURL — публичный origin приложения, из него строится redirect_uri.
	AppFrontURL string
	// WaitlistBase — с какого числа показывать счётчик на главной. Продуктовое
	// решение владельца (реальных заявок пока единицы), поэтому в конфиге.
	WaitlistBase       int64
	AppBaseURL         string
	GoogleClientID     string
	GoogleClientSecret string
	YandexClientID     string
	YandexClientSecret string
}

func Load() (*Config, error) {
	_ = godotenv.Load() // .env опционален: в контейнерах env приходит снаружи

	c := &Config{
		Env:                 getenv("APP_ENV", "dev"),
		Port:                getenv("PORT", "8090"),
		DatabaseURL:         getenv("DATABASE_URL", "postgres://platform:platform_dev@localhost:5433/mml_platform?sslmode=disable"),
		MigrateOnStart:      getenv("MIGRATE_ON_START", "true") == "true",
		AnthropicAPIKey:     os.Getenv("ANTHROPIC_API_KEY"),
		AnthropicModel:      getenv("ANTHROPIC_MODEL", "claude-sonnet-5"),
		AnthropicBaseURL:    os.Getenv("ANTHROPIC_BASE_URL"),
		AnthropicProxyKey:   os.Getenv("ANTHROPIC_PROXY_KEY"),
		RecoURL:             getenv("RECO_URL", "http://localhost:8091"),
		ClickSigningSecret:  getenv("CLICK_SIGNING_SECRET", "dev-only-signing-secret"),
		JWTSecret:           getenv("JWT_SECRET", "dev-only-jwt-secret-change-me-32chars"),
		AdminToken:          os.Getenv("ADMIN_TOKEN"),
		ResendAPIKey:        os.Getenv("RESEND_API_KEY"),
		ResendFrom:          os.Getenv("RESEND_FROM"),
		WidgetBaseURL:       os.Getenv("WIDGET_BASE_URL"),
		WidgetProjectID:     os.Getenv("WIDGET_PROJECT_ID"),
		WidgetAPIKey:        os.Getenv("WIDGET_API_KEY"),
		SnapshotDatabaseURL: os.Getenv("SNAPSHOT_DATABASE_URL"),
		StorageEndpoint:     getenv("STORAGE_ENDPOINT", "localhost:9010"),
		StorageAccessKey:    getenv("STORAGE_ACCESS_KEY", "platform"),
		StorageSecretKey:    getenv("STORAGE_SECRET_KEY", "platform_dev"),
		StorageBucket:       getenv("STORAGE_BUCKET", "partner-assets"),
		StoragePublicURL:    getenv("STORAGE_PUBLIC_URL", "http://localhost:9010"),
		StorageUseSSL:       getenv("STORAGE_USE_SSL", "false") == "true",
		AppBaseURL:          getenv("APP_BASE_URL", "http://localhost:5173"),
		// Куда возвращать человека после OAuth: витрина под /app, а не корень
		// домена — там страница вейтлиста. Пусто → как AppBaseURL.
		AppFrontURL:        getenv("APP_FRONT_URL", ""),
		WaitlistBase:       getenvInt("WAITLIST_BASE", 800),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		YandexClientID:     os.Getenv("YANDEX_CLIENT_ID"),
		YandexClientSecret: os.Getenv("YANDEX_CLIENT_SECRET"),
	}

	if c.Env == "prod" && c.AnthropicAPIKey == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY is required in prod")
	}
	return c, nil
}

func getenvInt(key string, def int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return def
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
