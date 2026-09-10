package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type PasswordResetRepository struct {
	db *gorm.DB
}

func newPasswordResetRepository(db *gorm.DB) *PasswordResetRepository {
	return &PasswordResetRepository{db: db}
}

func (r *PasswordResetRepository) Create(ctx context.Context, pr *model.PasswordReset) error {
	return dbErr(r.db.WithContext(ctx).Create(pr).Error)
}

func (r *PasswordResetRepository) GetLatestByUserID(ctx context.Context, userID int) (*model.PasswordReset, error) {
	var pr model.PasswordReset
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND deleted_at IS NULL AND used_at IS NULL", userID).
		Order("created_at DESC").
		First(&pr).Error
	return queryResult(&pr, err)
}

func (r *PasswordResetRepository) MarkUsed(ctx context.Context, id int) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.PasswordReset{}).
		Where("id = ?", id).
		Update("used_at", gorm.Expr("NOW()")).Error)
}
