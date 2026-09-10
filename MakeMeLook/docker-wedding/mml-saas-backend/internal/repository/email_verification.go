package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type EmailVerificationRepository struct {
	db *gorm.DB
}

func newEmailVerificationRepository(db *gorm.DB) *EmailVerificationRepository {
	return &EmailVerificationRepository{db: db}
}

func (r *EmailVerificationRepository) Create(ctx context.Context, ev *model.EmailVerification) error {
	return dbErr(r.db.WithContext(ctx).Create(ev).Error)
}

func (r *EmailVerificationRepository) GetLatestByUserID(ctx context.Context, userID int) (*model.EmailVerification, error) {
	var ev model.EmailVerification
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND deleted_at IS NULL AND verified_at IS NULL", userID).
		Order("created_at DESC").
		First(&ev).Error
	return queryResult(&ev, err)
}

func (r *EmailVerificationRepository) MarkVerified(ctx context.Context, id int) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.EmailVerification{}).
		Where("id = ?", id).
		Update("verified_at", gorm.Expr("NOW()")).Error)
}
