package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type LeadFavoriteRepository struct {
	db *gorm.DB
}

func newLeadFavoriteRepository(db *gorm.DB) *LeadFavoriteRepository {
	return &LeadFavoriteRepository{db: db}
}

func (r *LeadFavoriteRepository) Create(ctx context.Context, fav *model.LeadFavorite) error {
	return dbErr(r.db.WithContext(ctx).Create(fav).Error)
}

func (r *LeadFavoriteRepository) ListByLeadID(ctx context.Context, leadID int64) ([]*model.LeadFavorite, error) {
	var favs []*model.LeadFavorite
	err := r.db.WithContext(ctx).
		Preload("TryOn").
		Where("lead_id = ? AND deleted_at IS NULL", leadID).
		Order("created_at DESC").
		Find(&favs).Error
	return favs, dbErr(err)
}

func (r *LeadFavoriteRepository) Delete(ctx context.Context, id int64, leadID int64) (int64, error) {
	return affectedRows(r.db.WithContext(ctx).
		Model(&model.LeadFavorite{}).
		Where("id = ? AND lead_id = ? AND deleted_at IS NULL", id, leadID).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")))
}

func (r *LeadFavoriteRepository) DeleteByPublicID(ctx context.Context, publicID string, leadID int64) (int64, error) {
	return affectedRows(r.db.WithContext(ctx).
		Model(&model.LeadFavorite{}).
		Where("public_id = ? AND lead_id = ? AND deleted_at IS NULL", publicID, leadID).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")))
}
