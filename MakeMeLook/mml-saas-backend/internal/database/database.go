package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/pkg/logger"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

type DB struct {
	*gorm.DB
}

func New(cfg *config.Config) (*DB, error) {
	gormConfig := &gorm.Config{
		Logger: gormlogger.New(
			log.New(os.Stdout, "\n", log.LstdFlags),
			gormlogger.Config{
				SlowThreshold:             500 * time.Millisecond,
				LogLevel:                  gormLogLevel(cfg.DBLogLevel),
				IgnoreRecordNotFoundError: true,
				Colorful:                  cfg.IsDevelopment(),
			},
		),
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.DBMaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.DBMaxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.DBConnMaxLifetimeSec) * time.Second)
	sqlDB.SetConnMaxIdleTime(time.Duration(cfg.DBConnMaxIdleTimeSec) * time.Second)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("database", "Connection established", "host", cfg.DBHost, "database", cfg.DBName)

	return &DB{DB: db}, nil
}

func gormLogLevel(level string) gormlogger.LogLevel {
	switch level {
	case "debug", "info":
		return gormlogger.Info
	case "warn", "warning":
		return gormlogger.Warn
	case "error":
		return gormlogger.Error
	default:
		return gormlogger.Warn
	}
}

func (db *DB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	if err := sqlDB.Close(); err != nil {
		return err
	}
	logger.Info("database", "Connection closed")
	return nil
}
