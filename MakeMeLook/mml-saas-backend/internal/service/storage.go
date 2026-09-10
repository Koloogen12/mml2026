package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/pkg/logger"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
)

var (
	ErrFileTooLarge        = errors.New("file exceeds maximum allowed size")
	ErrUnsupportedFileType = errors.New("unsupported file type")
)

type StorageService struct {
	cfg   *config.Config
	minio *minio.Client
}

func NewStorage(cfg *config.Config, minioClient *minio.Client) *StorageService {
	return &StorageService{
		cfg:   cfg,
		minio: minioClient,
	}
}

// UploadImage uploads an image to the specified bucket with validation.
// Returns object key (UUID + extension) on success.
func (s *StorageService) UploadImage(ctx context.Context, bucket string, file io.Reader, filename string, size int64, maxSize int64, allowedExts map[string]string) (string, error) {
	if size > maxSize {
		return "", ErrFileTooLarge
	}

	ext := strings.ToLower(filepath.Ext(filename))
	contentType, ok := allowedExts[ext]
	if !ok {
		return "", ErrUnsupportedFileType
	}

	objectName := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	_, err := s.minio.PutObject(ctx, bucket, objectName, file, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		logger.Error("storage", "Minio upload failed", "bucket", bucket, "key", objectName, "error", err)
		return "", fmt.Errorf("minio put: %w", err)
	}

	return objectName, nil
}

// UploadBytes uploads raw bytes to Minio with an explicit key and content type.
func (s *StorageService) UploadBytes(ctx context.Context, bucket, key string, data []byte, contentType string) error {
	_, err := s.minio.PutObject(ctx, bucket, key, bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		logger.Error("storage", "Minio upload failed", "bucket", bucket, "key", key, "error", err)
		return fmt.Errorf("minio put: %w", err)
	}
	return nil
}

// GetObjectURL constructs the public URL for a Minio object.
func (s *StorageService) GetObjectURL(bucket, key string) string {
	if s.cfg.MinioPublicURL != "" {
		return fmt.Sprintf("%s/%s/%s", s.cfg.MinioPublicURL, bucket, key)
	}
	return fmt.Sprintf("http://%s/%s/%s", s.cfg.MinioEndpoint, bucket, key)
}
