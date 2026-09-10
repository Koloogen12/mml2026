package repository

import (
	"context"

	"gorm.io/gorm"

	"mml-saas-backend/internal/model"
)

// StorefrontFilter — параметры выборки товаров для публичного API
type StorefrontFilter struct {
	ProjectID int
	Category  string
	Gender    string
	Brand     string
	Color     string
	Search    string
	Sort      string // newest | price_asc | price_desc
	GroupID   *int
	Offset    int
	Limit     int
}

// StorefrontFiltersAgg — агрегаты для блока фильтров
type StorefrontFiltersAgg struct {
	Categories []string
	Brands     []string
	Colors     []string
	PriceMin   float64
	PriceMax   float64
}

// StorefrontCategoryCount — категория + количество
type StorefrontCategoryCount struct {
	Category string
	Count    int64
}

type StorefrontRepository struct {
	db *gorm.DB
}

func newStorefrontRepository(db *gorm.DB) *StorefrontRepository {
	return &StorefrontRepository{db: db}
}

func (r *StorefrontRepository) applyFilters(q *gorm.DB, f StorefrontFilter) *gorm.DB {
	q = q.Where("project_id = ? AND is_active = true AND deleted_at IS NULL", f.ProjectID)
	if f.Category != "" {
		q = q.Where("category = ?", f.Category)
	}
	if f.Gender != "" {
		q = q.Where("gender = ?", f.Gender)
	}
	if f.Brand != "" {
		q = q.Where("brand = ?", f.Brand)
	}
	if f.Color != "" {
		q = q.Where("color ILIKE ?", "%"+f.Color+"%")
	}
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where("name ILIKE ? OR brand ILIKE ? OR description ILIKE ?", like, like, like)
	}
	if f.GroupID != nil {
		q = q.Joins("JOIN product_group_items pgi ON pgi.product_id = products.id").
			Where("pgi.group_id = ?", *f.GroupID)
	}
	return q
}

func (r *StorefrontRepository) applySort(q *gorm.DB, sort string) *gorm.DB {
	switch sort {
	case "price_asc":
		return q.Order("price ASC NULLS LAST, id DESC")
	case "price_desc":
		return q.Order("price DESC NULLS LAST, id DESC")
	default: // newest
		return q.Order("id DESC")
	}
}

// List возвращает страницу товаров
func (r *StorefrontRepository) List(ctx context.Context, f StorefrontFilter) ([]model.Product, error) {
	var products []model.Product
	q := r.db.WithContext(ctx).Model(&model.Product{}).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("sort_order ASC")
		})
	q = r.applyFilters(q, f)
	q = r.applySort(q, f.Sort)
	if err := q.Offset(f.Offset).Limit(f.Limit).Find(&products).Error; err != nil {
		return nil, err
	}
	return products, nil
}

// Count возвращает общее количество товаров по фильтру
func (r *StorefrontRepository) Count(ctx context.Context, f StorefrontFilter) (int64, error) {
	var count int64
	q := r.db.WithContext(ctx).Model(&model.Product{})
	q = r.applyFilters(q, f)
	return count, q.Count(&count).Error
}

// GetByPublicIDAndProjectID возвращает один товар по UUID и projectID
func (r *StorefrontRepository) GetByPublicIDAndProjectID(ctx context.Context, publicID string, projectID int) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Where("public_id = ? AND project_id = ? AND is_active = true AND deleted_at IS NULL", publicID, projectID).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("sort_order ASC")
		}).
		First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

// ListRelated возвращает похожие товары (та же категория, не тот же товар)
func (r *StorefrontRepository) ListRelated(ctx context.Context, projectID int, productID int, category string, limit int) ([]model.Product, error) {
	var products []model.Product
	q := r.db.WithContext(ctx).
		Where("project_id = ? AND id != ? AND is_active = true AND deleted_at IS NULL", projectID, productID).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			// Без Limit — GORM с Limit(1) в Preload загружает только 1 фото на ВСЕ записи.
			// Берём все фото (order by sort_order), первое отберём в Go.
			return db.Where("deleted_at IS NULL").Order("sort_order ASC")
		}).
		Order("id DESC").
		Limit(limit)
	if category != "" {
		q = q.Where("category = ?", category)
	}
	return products, q.Find(&products).Error
}

// GetFiltersAgg возвращает агрегированные значения для фильтров
func (r *StorefrontRepository) GetFiltersAgg(ctx context.Context, projectID int) (StorefrontFiltersAgg, error) {
	// Каждый запрос создаётся заново — GORM модифицирует объект при Pluck/Select,
	// поэтому нельзя переиспользовать один base для разных полей.
	newBase := func() *gorm.DB {
		return r.db.WithContext(ctx).Model(&model.Product{}).
			Where("project_id = ? AND is_active = true AND deleted_at IS NULL", projectID)
	}

	var agg StorefrontFiltersAgg

	// Категории
	var cats []string
	if err := newBase().Distinct().Pluck("category", &cats).Error; err != nil {
		return agg, err
	}
	for _, c := range cats {
		if c != "" {
			agg.Categories = append(agg.Categories, c)
		}
	}

	// Бренды
	var brands []string
	if err := newBase().Distinct().Pluck("brand", &brands).Error; err != nil {
		return agg, err
	}
	for _, b := range brands {
		if b != "" {
			agg.Brands = append(agg.Brands, b)
		}
	}

	// Цвета
	var colors []string
	if err := newBase().Distinct().Pluck("color", &colors).Error; err != nil {
		return agg, err
	}
	for _, c := range colors {
		if c != "" {
			agg.Colors = append(agg.Colors, c)
		}
	}

	// Мин/макс цена
	type priceAgg struct {
		Min float64
		Max float64
	}
	var pa priceAgg
	newBase().Select("COALESCE(MIN(price),0) as min, COALESCE(MAX(price),0) as max").Scan(&pa)
	agg.PriceMin = pa.Min
	agg.PriceMax = pa.Max

	return agg, nil
}

// ListCategoriesWithCount возвращает категории с количеством товаров
func (r *StorefrontRepository) ListCategoriesWithCount(ctx context.Context, projectID int) ([]StorefrontCategoryCount, error) {
	var result []StorefrontCategoryCount
	err := r.db.WithContext(ctx).Model(&model.Product{}).
		Select("category, COUNT(*) as count").
		Where("project_id = ? AND is_active = true AND deleted_at IS NULL AND category IS NOT NULL AND category != ''", projectID).
		Group("category").
		Order("count DESC").
		Scan(&result).Error
	return result, err
}
