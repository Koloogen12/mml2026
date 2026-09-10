package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CategoryMappingRepository struct {
	db *gorm.DB
}

func newCategoryMappingRepository(db *gorm.DB) *CategoryMappingRepository {
	return &CategoryMappingRepository{db: db}
}

func (r *CategoryMappingRepository) Upsert(ctx context.Context, mapping *model.CategoryMapping) error {
	return dbErr(r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "store_id"}, {Name: "store_category_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"product_type", "gender", "updated_at"}),
		}).
		Create(mapping).Error)
}

func (r *CategoryMappingRepository) ListByStoreID(ctx context.Context, storeID int) ([]*model.CategoryMapping, error) {
	var mappings []*model.CategoryMapping
	err := r.db.WithContext(ctx).
		Preload("StoreCategory").
		Where("store_id = ?", storeID).
		Find(&mappings).Error
	return mappings, dbErr(err)
}

func (r *CategoryMappingRepository) GetByStoreCategoryID(ctx context.Context, storeID int, storeCategoryID int) (*model.CategoryMapping, error) {
	var mapping model.CategoryMapping
	err := r.db.WithContext(ctx).
		Where("store_id = ? AND store_category_id = ?", storeID, storeCategoryID).
		First(&mapping).Error
	return queryResult(&mapping, err)
}

func (r *CategoryMappingRepository) Delete(ctx context.Context, id int, storeID int) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("id = ? AND store_id = ?", id, storeID).
		Delete(&model.CategoryMapping{})
	return affectedRows(result)
}

func (r *CategoryMappingRepository) DeleteByStoreID(ctx context.Context, storeID int) error {
	return dbErr(r.db.WithContext(ctx).
		Where("store_id = ?", storeID).
		Delete(&model.CategoryMapping{}).Error)
}
