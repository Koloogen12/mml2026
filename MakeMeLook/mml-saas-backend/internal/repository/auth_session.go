package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type AuthSessionRepository struct {
	db *gorm.DB
}

func newAuthSessionRepository(db *gorm.DB) *AuthSessionRepository {
	return &AuthSessionRepository{db: db}
}

func (r *AuthSessionRepository) Create(ctx context.Context, session *model.AuthSession) error {
	return dbErr(r.db.WithContext(ctx).Create(session).Error)
}

func (r *AuthSessionRepository) GetByRefreshToken(ctx context.Context, token string) (*model.AuthSession, error) {
	var session model.AuthSession
	err := r.db.WithContext(ctx).
		Where("refresh_token = ? AND deleted_at IS NULL", token).
		First(&session).Error
	return queryResult(&session, err)
}

func (r *AuthSessionRepository) UpdateLastActivity(ctx context.Context, id int) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.AuthSession{}).
		Where("id = ?", id).
		Update("last_activity_at", gorm.Expr("NOW()")).Error)
}

func (r *AuthSessionRepository) SoftDelete(ctx context.Context, id int) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.AuthSession{}).
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error)
}

func (r *AuthSessionRepository) SoftDeleteByUserID(ctx context.Context, userID int) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.AuthSession{}).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Update("deleted_at", gorm.Expr("NOW()")).Error)
}
