package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/database"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/internal/server"
	"mml-saas-backend/internal/storage"
	"mml-saas-backend/pkg/logger"
	"mml-saas-backend/pkg/mailer"
)

func main() {
	cfg := logger.LogPanicD(config.Load())

	logger.Init(cfg.LogLevel)

	logger.Info("server", "Starting MakeMeLook API", "env", cfg.AppEnv, "port", cfg.ServerPort)

	db := logger.LogPanicD(database.New(cfg))

	defer func() {
		logger.LogError(db.Close())
	}()

	minioClient := logger.LogPanicD(storage.NewMinio(cfg))

	repos := repository.New(db.DB)

	mlr := mailer.New(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)

	srv := server.New(cfg, repos, minioClient, mlr)

	go func() {
		if err := srv.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal("server", "HTTP server error", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("server", "Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server", "Server forced to shutdown", "error", err)
	}

	logger.Info("server", "Server stopped")
}
