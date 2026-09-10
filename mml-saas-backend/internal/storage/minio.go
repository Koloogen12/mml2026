package storage

import (
	"fmt"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/pkg/logger"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func NewMinio(cfg *config.Config) (*minio.Client, error) {
	client, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	})
	if err != nil {
		return nil, logger.LogError(fmt.Errorf("failed to create minio client: %w", err))
	}

	logger.Info("minio", "Client initialized", "endpoint", cfg.MinioEndpoint, "bucket", cfg.MinioBucket)

	return client, nil
}
