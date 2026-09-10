package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type EcommerceStoreRepository struct {
	db *gorm.DB
}

func newEcommerceStoreRepository(db *gorm.DB) *EcommerceStoreRepository {
	return &EcommerceStoreRepository{db: db}
}

func (r *EcommerceStoreRepository) Create(ctx context.Context, store *model.EcommerceStore) error {
	return dbErr(r.db.WithContext(ctx).Create(store).Error)
}

func (r *EcommerceStoreRepository) GetByID(ctx context.Context, id int) (*model.EcommerceStore, error) {
	var store model.EcommerceStore
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&store).Error
	return queryResult(&store, err)
}

func (r *EcommerceStoreRepository) GetByIDAndProjectID(ctx context.Context, id int, projectID int) (*model.EcommerceStore, error) {
	var store model.EcommerceStore
	err := r.db.WithContext(ctx).
		Where("id = ? AND project_id = ? AND deleted_at IS NULL", id, projectID).
		First(&store).Error
	return queryResult(&store, err)
}

func (r *EcommerceStoreRepository) ListByProjectID(ctx context.Context, projectID int) ([]*model.EcommerceStore, error) {
	var stores []*model.EcommerceStore
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		Order("created_at DESC").
		Find(&stores).Error
	return stores, dbErr(err)
}

func (r *EcommerceStoreRepository) Update(ctx context.Context, id int, updates map[string]any) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.EcommerceStore{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates).Error)
}

func (r *EcommerceStoreRepository) Delete(ctx context.Context, id int, projectID int) (int64, error) {
	return affectedRows(r.db.WithContext(ctx).
		Model(&model.EcommerceStore{}).
		Where("id = ? AND project_id = ? AND deleted_at IS NULL", id, projectID).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")))
}

func (r *EcommerceStoreRepository) GetActiveStores(ctx context.Context) ([]*model.EcommerceStore, error) {
	var stores []*model.EcommerceStore
	err := r.db.WithContext(ctx).
		Where("is_active = true AND deleted_at IS NULL").
		Find(&stores).Error
	return stores, dbErr(err)
}
