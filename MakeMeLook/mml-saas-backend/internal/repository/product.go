package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductRepository struct {
	db *gorm.DB
}

func newProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) Create(ctx context.Context, product *model.Product) error {
	return dbErr(r.db.WithContext(ctx).Create(product).Error)
}

func (r *ProductRepository) GetByID(ctx context.Context, id int) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("sort_order ASC")
		}).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&product).Error
	return queryResult(&product, err)
}

// GetByIDAndProjectID fetches a product verifying it belongs to the given project.
func (r *ProductRepository) GetByIDAndProjectID(ctx context.Context, id int, projectID int) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("sort_order ASC")
		}).
		Where("id = ? AND project_id = ? AND deleted_at IS NULL", id, projectID).
		First(&product).Error
	return queryResult(&product, err)
}

func (r *ProductRepository) GetByPublicID(ctx context.Context, publicID uuid.UUID) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("sort_order ASC")
		}).
		Where("public_id = ? AND deleted_at IS NULL", publicID).
		First(&product).Error
	return queryResult(&product, err)
}

// ProductListFilter holds all filters for listing products.
type ProductListFilter struct {
	ProjectID int
	Search    string
	Category  string
	Gender    string
	GroupID   int
	IsActive  *bool
	Offset    int
	Limit     int
}

func (r *ProductRepository) applyFilters(q *gorm.DB, f ProductListFilter) *gorm.DB {
	q = q.Where("products.project_id = ? AND products.deleted_at IS NULL", f.ProjectID)
	if f.Search != "" {
		q = q.Where("products.name ILIKE ?", "%"+f.Search+"%")
	}
	if f.Category != "" {
		q = q.Where("products.category = ?", f.Category)
	}
	if f.Gender != "" {
		q = q.Where("products.gender = ?", f.Gender)
	}
	if f.IsActive != nil {
		q = q.Where("products.is_active = ?", *f.IsActive)
	}
	if f.GroupID != 0 {
		q = q.Joins("JOIN product_group_items pgi ON pgi.product_id = products.id AND pgi.deleted_at IS NULL AND pgi.group_id = ?", f.GroupID)
	}
	return q
}

func (r *ProductRepository) List(ctx context.Context, f ProductListFilter) ([]*model.Product, error) {
	var products []*model.Product
	q := r.applyFilters(r.db.WithContext(ctx).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("sort_order ASC")
		}), f)
	err := q.Order("products.created_at DESC").Offset(f.Offset).Limit(f.Limit).Find(&products).Error
	return products, dbErr(err)
}

func (r *ProductRepository) Count(ctx context.Context, f ProductListFilter) (int64, error) {
	q := r.applyFilters(r.db.WithContext(ctx).Model(&model.Product{}), f)
	var count int64
	return count, dbErr(q.Count(&count).Error)
}

// UpdateAll replaces all updatable fields for a product.
func (r *ProductRepository) UpdateAll(ctx context.Context, id int, updates map[string]any) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates).Error)
}

func (r *ProductRepository) Delete(ctx context.Context, id int, projectID int) (int64, error) {
	return affectedRows(r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ? AND project_id = ? AND deleted_at IS NULL", id, projectID).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")))
}

// GetByProjectIDAndSKU finds a product by SKU within a project (for duplicate checking during import).
func (r *ProductRepository) GetByProjectIDAndSKU(ctx context.Context, projectID int, sku string) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND sku = ? AND deleted_at IS NULL", projectID, sku).
		First(&product).Error
	return queryResult(&product, err)
}

func (r *ProductRepository) GetByProjectIDAndSKUAndColor(ctx context.Context, projectID int, sku string, color string) (*model.Product, error) {
	var product model.Product
	q := r.db.WithContext(ctx).
		Where("project_id = ? AND sku = ? AND deleted_at IS NULL", projectID, sku)
	if color != "" {
		q = q.Where("color = ?", color)
	}
	err := q.First(&product).Error
	return queryResult(&product, err)
}

func (r *ProductRepository) GetByProjectIDAndExternalID(ctx context.Context, projectID int, externalID string) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND external_id = ? AND deleted_at IS NULL", projectID, externalID).
		First(&product).Error
	return queryResult(&product, err)
}

func (r *ProductRepository) BulkSetActive(ctx context.Context, projectID int, ids []int, isActive bool) (int64, error) {
	result := r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("id IN ? AND project_id = ? AND deleted_at IS NULL", ids, projectID).
		Update("is_active", isActive)
	return affectedRows(result)
}

func (r *ProductRepository) BulkDelete(ctx context.Context, projectID int, ids []int) (int64, error) {
	result := r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("id IN ? AND project_id = ? AND deleted_at IS NULL", ids, projectID).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP"))
	return affectedRows(result)
}
