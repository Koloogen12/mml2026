package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type LeadCartItemRepository struct {
	db *gorm.DB
}

func newLeadCartItemRepository(db *gorm.DB) *LeadCartItemRepository {
	return &LeadCartItemRepository{db: db}
}

func (r *LeadCartItemRepository) Create(ctx context.Context, item *model.LeadCartItem) error {
	return dbErr(r.db.WithContext(ctx).Create(item).Error)
}

func (r *LeadCartItemRepository) ListByLeadID(ctx context.Context, leadID int64) ([]*model.LeadCartItem, error) {
	var items []*model.LeadCartItem
	err := r.db.WithContext(ctx).
		Preload("Product").
		Preload("TryOn").
		Where("lead_id = ? AND deleted_at IS NULL", leadID).
		Order("created_at DESC").
		Find(&items).Error
	return items, dbErr(err)
}

func (r *LeadCartItemRepository) Delete(ctx context.Context, id int64, leadID int64) (int64, error) {
	return affectedRows(r.db.WithContext(ctx).
		Model(&model.LeadCartItem{}).
		Where("id = ? AND lead_id = ? AND deleted_at IS NULL", id, leadID).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")))
}

func (r *LeadCartItemRepository) DeleteByPublicID(ctx context.Context, publicID string, leadID int64) (int64, error) {
	return affectedRows(r.db.WithContext(ctx).
		Model(&model.LeadCartItem{}).
		Where("public_id = ? AND lead_id = ? AND deleted_at IS NULL", publicID, leadID).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")))
}
