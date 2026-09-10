package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type LeadPhotoRepository struct {
	db *gorm.DB
}

func newLeadPhotoRepository(db *gorm.DB) *LeadPhotoRepository {
	return &LeadPhotoRepository{db: db}
}

func (r *LeadPhotoRepository) Create(ctx context.Context, photo *model.LeadPhoto) error {
	return dbErr(r.db.WithContext(ctx).Create(photo).Error)
}

func (r *LeadPhotoRepository) GetByID(ctx context.Context, id int64) (*model.LeadPhoto, error) {
	var photo model.LeadPhoto
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&photo).Error
	return queryResult(&photo, err)
}

func (r *LeadPhotoRepository) ListByLeadID(ctx context.Context, leadID int64) ([]*model.LeadPhoto, error) {
	var photos []*model.LeadPhoto
	err := r.db.WithContext(ctx).
		Where("lead_id = ? AND deleted_at IS NULL", leadID).
		Order("created_at DESC").
		Find(&photos).Error
	return photos, dbErr(err)
}
