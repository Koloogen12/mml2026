package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LeadTryOnRepository struct {
	db *gorm.DB
}

func newLeadTryOnRepository(db *gorm.DB) *LeadTryOnRepository {
	return &LeadTryOnRepository{db: db}
}

func (r *LeadTryOnRepository) Create(ctx context.Context, tryOn *model.LeadTryOn) error {
	return dbErr(r.db.WithContext(ctx).Create(tryOn).Error)
}

func (r *LeadTryOnRepository) Update(ctx context.Context, tryOn *model.LeadTryOn) error {
	return dbErr(r.db.WithContext(ctx).
		Omit("ModelPhoto", "OuterwearProduct", "TopsProduct", "BottomsProduct", "ShoesProduct", "AccessoriesProduct").
		Save(tryOn).Error)
}

func (r *LeadTryOnRepository) GetByID(ctx context.Context, id int64) (*model.LeadTryOn, error) {
	var tryOn model.LeadTryOn
	err := r.db.WithContext(ctx).
		Preload("ModelPhoto").
		Preload("OuterwearProduct").
		Preload("TopsProduct").
		Preload("BottomsProduct").
		Preload("ShoesProduct").
		Preload("AccessoriesProduct").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&tryOn).Error
	return queryResult(&tryOn, err)
}

func (r *LeadTryOnRepository) GetByPublicID(ctx context.Context, publicID uuid.UUID) (*model.LeadTryOn, error) {
	var tryOn model.LeadTryOn
	err := r.db.WithContext(ctx).
		Preload("OuterwearProduct").
		Preload("TopsProduct").
		Preload("BottomsProduct").
		Preload("ShoesProduct").
		Preload("AccessoriesProduct").
		Where("public_id = ? AND deleted_at IS NULL", publicID).
		First(&tryOn).Error
	return queryResult(&tryOn, err)
}

func (r *LeadTryOnRepository) ListByLeadID(ctx context.Context, leadID int64) ([]*model.LeadTryOn, error) {
	var tryOns []*model.LeadTryOn
	err := r.db.WithContext(ctx).
		Preload("OuterwearProduct").
		Preload("TopsProduct").
		Preload("BottomsProduct").
		Preload("ShoesProduct").
		Preload("AccessoriesProduct").
		Where("lead_id = ? AND deleted_at IS NULL", leadID).
		Order("created_at DESC").
		Find(&tryOns).Error
	return tryOns, dbErr(err)
}

// GetLatestByLeadID returns the most recent try-on (done or processing) for a lead, or nil if none.
func (r *LeadTryOnRepository) GetLatestByLeadID(ctx context.Context, leadID int64) (*model.LeadTryOn, error) {
	var tryOn model.LeadTryOn
	err := r.db.WithContext(ctx).
		Preload("OuterwearProduct").
		Preload("TopsProduct").
		Preload("BottomsProduct").
		Preload("ShoesProduct").
		Preload("AccessoriesProduct").
		Where("lead_id = ? AND status IN (?, ?) AND deleted_at IS NULL", leadID, model.TryOnStatusDone, model.TryOnStatusProcessing).
		Order("created_at DESC").
		First(&tryOn).Error
	return queryResult(&tryOn, err)
}

func (r *LeadTryOnRepository) MarkStuckAsError(ctx context.Context) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.LeadTryOn{}).
		Where("status = ? AND deleted_at IS NULL", model.TryOnStatusProcessing).
		Update("status", model.TryOnStatusError).Error)
}
