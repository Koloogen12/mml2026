package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type StoreCategoryRepository struct {
	db *gorm.DB
}

func newStoreCategoryRepository(db *gorm.DB) *StoreCategoryRepository {
	return &StoreCategoryRepository{db: db}
}

func (r *StoreCategoryRepository) Upsert(ctx context.Context, cat *model.StoreCategory) error {
	return dbErr(r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "store_id"}, {Name: "external_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "parent_name", "full_path", "updated_at"}),
		}).
		Create(cat).Error)
}

func (r *StoreCategoryRepository) ListByStoreID(ctx context.Context, storeID int) ([]*model.StoreCategory, error) {
	var cats []*model.StoreCategory
	err := r.db.WithContext(ctx).
		Where("store_id = ?", storeID).
		Order("full_path ASC, name ASC").
		Find(&cats).Error
	return cats, dbErr(err)
}

func (r *StoreCategoryRepository) GetByStoreIDAndExternalID(ctx context.Context, storeID int, externalID string) (*model.StoreCategory, error) {
	var cat model.StoreCategory
	err := r.db.WithContext(ctx).
		Where("store_id = ? AND external_id = ?", storeID, externalID).
		First(&cat).Error
	return queryResult(&cat, err)
}

func (r *StoreCategoryRepository) DeleteByStoreID(ctx context.Context, storeID int) error {
	return dbErr(r.db.WithContext(ctx).
		Where("store_id = ?", storeID).
		Delete(&model.StoreCategory{}).Error)
}
