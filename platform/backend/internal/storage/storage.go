// Package storage — объектное хранилище (MinIO/S3-совместимое) для файлов
// партнёра: логотип, размерная сетка. Прокси-загрузка: браузер шлёт multipart
// на бэкенд, бэкенд кладёт в бакет и возвращает публичный URL.
package storage

import (
	"bytes"
	"context"
	"fmt"
	"path"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Client struct {
	mc        *minio.Client
	bucket    string
	publicURL string
}

// New подключается к хранилищу, создаёт бакет при отсутствии и ставит ему
// политику public-read (возвращаемые URL должны открываться в браузере).
func New(ctx context.Context, endpoint, accessKey, secretKey, bucket, publicURL string, useSSL bool) (*Client, error) {
	mc, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, err
	}
	exists, err := mc.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("проверка бакета: %w", err)
	}
	if !exists {
		if err := mc.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("создание бакета: %w", err)
		}
	}
	// Анонимный GET на объекты бакета — чтобы лого/сетка открывались по URL.
	policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, bucket)
	if err := mc.SetBucketPolicy(ctx, bucket, policy); err != nil {
		return nil, fmt.Errorf("политика бакета: %w", err)
	}
	return &Client{mc: mc, bucket: bucket, publicURL: publicURL}, nil
}

// Put кладёт объект по ключу и возвращает его публичный URL.
func (c *Client) Put(ctx context.Context, key, contentType string, data []byte) (string, error) {
	_, err := c.mc.PutObject(ctx, c.bucket, key, bytes.NewReader(data), int64(len(data)),
		minio.PutObjectOptions{ContentType: contentType})
	if err != nil {
		return "", err
	}
	return c.publicURL + "/" + c.bucket + "/" + key, nil
}

// Key строит уникальный ключ объекта: <prefix>/<partnerID>/<unixnano><ext>.
// ts передаётся снаружи (время в этом слое не берём — детерминизм/тестируемость).
func Key(prefix string, partnerID int64, ts time.Time, ext string) string {
	return path.Join(prefix, fmt.Sprintf("%d", partnerID), fmt.Sprintf("%d%s", ts.UnixNano(), ext))
}
