package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type ConsentLogRepository struct {
	db *gorm.DB
}

func newConsentLogRepository(db *gorm.DB) *ConsentLogRepository {
	return &ConsentLogRepository{db: db}
}

func (r *ConsentLogRepository) Create(ctx context.Context, log *model.ConsentLog) error {
	return dbErr(r.db.WithContext(ctx).Create(log).Error)
}
