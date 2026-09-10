package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StorefrontRepository struct {
	db *gorm.DB
}

func newStorefrontRepository(db *gorm.DB) *StorefrontRepository {
	return &StorefrontRepository{db: db}
}

// StorefrontFilter holds filters for public storefront product queries.
type StorefrontFilter struct {
	ProjectID int
	Category  string
	Gender    string
	Brand     string
	Color     string
	Search    string
	Sort      string // "newest" (default) | "price_asc" | "price_desc"
	GroupID   int
	Offset    int
	Limit     int
}

func (r *StorefrontRepository) applyFilters(q *gorm.DB, f StorefrontFilter) *gorm.DB {
	q = q.Where("products.project_id = ? AND products.deleted_at IS NULL AND products.is_active = true", f.ProjectID)
	if f.Category != "" {
		q = q.Where("products.category = ?", f.Category)
	}
	if f.Gender != "" {
		q = q.Where("products.gender = ?", f.Gender)
	}
	if f.Brand != "" {
		q = q.Where("products.brand = ?", f.Brand)
	}
	if f.Color != "" {
		q = q.Where("products.color = ?", f.Color)
	}
	if f.Search != "" {
		q = q.Where("(products.name ILIKE ? OR products.brand ILIKE ?)", "%"+f.Search+"%", "%"+f.Search+"%")
	}
	if f.GroupID != 0 {
		q = q.Joins("JOIN product_group_items pgi ON pgi.product_id = products.id AND pgi.deleted_at IS NULL AND pgi.group_id = ?", f.GroupID)
	}
	return q
}

func (r *StorefrontRepository) applySort(q *gorm.DB, sort string) *gorm.DB {
	switch sort {
	case "price_asc":
		return q.Order("products.price ASC NULLS LAST, products.created_at DESC")
	case "price_desc":
		return q.Order("products.price DESC NULLS LAST, products.created_at DESC")
	default: // "newest"
		return q.Order("products.created_at DESC")
	}
}

func (r *StorefrontRepository) List(ctx context.Context, f StorefrontFilter) ([]*model.Product, error) {
	var products []*model.Product
	q := r.applyFilters(r.db.WithContext(ctx).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("sort_order ASC")
		}), f)
	q = r.applySort(q, f.Sort)
	err := q.Offset(f.Offset).Limit(f.Limit).Find(&products).Error
	return products, dbErr(err)
}

func (r *StorefrontRepository) Count(ctx context.Context, f StorefrontFilter) (int64, error) {
	q := r.applyFilters(r.db.WithContext(ctx).Model(&model.Product{}), f)
	var count int64
	return count, dbErr(q.Count(&count).Error)
}

func (r *StorefrontRepository) GetByPublicIDAndProjectID(ctx context.Context, publicID uuid.UUID, projectID int) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("sort_order ASC")
		}).
		Where("public_id = ? AND project_id = ? AND deleted_at IS NULL AND is_active = true", publicID, projectID).
		First(&product).Error
	return queryResult(&product, err)
}

// ListRelated returns up to `limit` active products from the same category,
// excluding the given product ID, ordered by created_at DESC.
func (r *StorefrontRepository) ListRelated(ctx context.Context, projectID int, category string, excludeID int, limit int) ([]*model.Product, error) {
	var products []*model.Product
	q := r.db.WithContext(ctx).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("sort_order ASC").Limit(1)
		}).
		Where("project_id = ? AND id != ? AND deleted_at IS NULL AND is_active = true", projectID, excludeID)
	if category != "" {
		q = q.Where("category = ?", category)
	}
	err := q.Order("created_at DESC").Limit(limit).Find(&products).Error
	return products, dbErr(err)
}

// StorefrontFiltersAgg holds aggregated filter values for the catalog UI.
type StorefrontFiltersAgg struct {
	Categories []string
	Brands     []string
	Colors     []string
	MinPrice   float64
	MaxPrice   float64
}

// GetFiltersAgg returns distinct filter values for all active products in a project.
func (r *StorefrontRepository) GetFiltersAgg(ctx context.Context, projectID int) (*StorefrontFiltersAgg, error) {
	agg := &StorefrontFiltersAgg{}
	baseSQL := "project_id = ? AND deleted_at IS NULL AND is_active = true"

	var categories []string
	if err := r.db.WithContext(ctx).Model(&model.Product{}).
		Where(baseSQL+" AND category IS NOT NULL", projectID).
		Distinct("category").Pluck("category", &categories).Error; err != nil {
		return nil, dbErr(err)
	}
	agg.Categories = categories

	var brands []string
	if err := r.db.WithContext(ctx).Model(&model.Product{}).
		Where(baseSQL+" AND brand IS NOT NULL", projectID).
		Distinct("brand").Pluck("brand", &brands).Error; err != nil {
		return nil, dbErr(err)
	}
	agg.Brands = brands

	var colors []string
	if err := r.db.WithContext(ctx).Model(&model.Product{}).
		Where(baseSQL+" AND color IS NOT NULL", projectID).
		Distinct("color").Pluck("color", &colors).Error; err != nil {
		return nil, dbErr(err)
	}
	agg.Colors = colors

	type priceRange struct {
		Min *float64
		Max *float64
	}
	var pr priceRange
	if err := r.db.WithContext(ctx).Model(&model.Product{}).
		Where(baseSQL, projectID).
		Select("MIN(price) as min, MAX(price) as max").
		Scan(&pr).Error; err != nil {
		return nil, dbErr(err)
	}
	if pr.Min != nil {
		agg.MinPrice = *pr.Min
	}
	if pr.Max != nil {
		agg.MaxPrice = *pr.Max
	}

	return agg, nil
}

// StorefrontCategoryCount — category key with product count.
type StorefrontCategoryCount struct {
	Category string `gorm:"column:category"`
	Count    int64  `gorm:"column:count"`
}

// ListCategoriesWithCount returns categories sorted by product count descending.
func (r *StorefrontRepository) ListCategoriesWithCount(ctx context.Context, projectID int) ([]StorefrontCategoryCount, error) {
	var results []StorefrontCategoryCount
	err := r.db.WithContext(ctx).Model(&model.Product{}).
		Select("category, COUNT(*) as count").
		Where("project_id = ? AND deleted_at IS NULL AND is_active = true AND category IS NOT NULL", projectID).
		Group("category").
		Order("count DESC").
		Scan(&results).Error
	return results, dbErr(err)
}
