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
	Sort      string // newest | price_asc | price_desc
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
	orderClause := "products.created_at DESC"
	switch f.Sort {
	case "price_asc":
		orderClause = "products.price ASC NULLS LAST"
	case "price_desc":
		orderClause = "products.price DESC NULLS LAST"
	}
	err := q.Order(orderClause).Offset(f.Offset).Limit(f.Limit).Find(&products).Error
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

// CountActiveByStore returns how many active, non-deleted products belong
// to the given store. Used as a denominator for the "did the feed shrink
// catastrophically" sanity check before mass-deactivation.
func (r *ProductRepository) CountActiveByStore(ctx context.Context, storeID int) (int64, error) {
	var n int64
	err := r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("store_id = ? AND is_active = TRUE AND deleted_at IS NULL", storeID).
		Count(&n).Error
	return n, err
}

// DeactivateMissingFromFeed marks every product belonging to storeID as
// inactive UNLESS its external_id appears in seenExternalIDs. Returns the
// number of rows updated. Use this after a successful sync when the feed
// is expected to be the complete source of truth (e.g. custom-feed).
//
// IMPORTANT: this is a mass UPDATE — call only after a sanity check on
// the size of seenExternalIDs vs CountActiveByStore.
func (r *ProductRepository) DeactivateMissingFromFeed(ctx context.Context, storeID int, seenExternalIDs []string) (int64, error) {
	q := r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("store_id = ? AND is_active = TRUE AND deleted_at IS NULL", storeID)
	if len(seenExternalIDs) > 0 {
		q = q.Where("external_id NOT IN ?", seenExternalIDs)
	}
	result := q.Update("is_active", false)
	return affectedRows(result)
}

// StorefrontFilterData holds aggregated filter values for active products of a project.
type StorefrontFilterData struct {
	Categories []string
	Brands     []string
	Colors     []string
	PriceMin   float64
	PriceMax   float64
}

func strSlice(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// GetStorefrontFilters returns distinct categories, brands, colors and price range
// for all active products in the given project.
func (r *ProductRepository) GetStorefrontFilters(ctx context.Context, projectID int) (*StorefrontFilterData, error) {
	base := func() *gorm.DB {
		return r.db.WithContext(ctx).Model(&model.Product{}).
			Where("project_id = ? AND is_active = true AND deleted_at IS NULL", projectID)
	}

	var categories []string
	if err := base().Where("category IS NOT NULL").Distinct("category").Pluck("category", &categories).Error; err != nil {
		return nil, dbErr(err)
	}

	var brands []string
	base().Where("brand IS NOT NULL AND brand != ''").Distinct("brand").Pluck("brand", &brands)

	var colors []string
	base().Where("color IS NOT NULL AND color != ''").Distinct("color").Pluck("color", &colors)

	type priceRange struct {
		Min *float64
		Max *float64
	}
	var pr priceRange
	base().Where("price IS NOT NULL").Select("MIN(price) as min, MAX(price) as max").Scan(&pr)

	f := &StorefrontFilterData{
		Categories: strSlice(categories),
		Brands:     strSlice(brands),
		Colors:     strSlice(colors),
	}
	if pr.Min != nil {
		f.PriceMin = *pr.Min
	}
	if pr.Max != nil {
		f.PriceMax = *pr.Max
	}
	return f, nil
}

// ListRelatedProducts fetches up to limit active products from the same category,
// excluding the product identified by excludePublicID.
func (r *ProductRepository) ListRelatedProducts(ctx context.Context, projectID int, category string, excludePublicID uuid.UUID, limit int) ([]*model.Product, error) {
	var products []*model.Product
	err := r.db.WithContext(ctx).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("sort_order ASC")
		}).
		Where("project_id = ? AND category = ? AND public_id != ? AND is_active = true AND deleted_at IS NULL",
			projectID, category, excludePublicID).
		Order("created_at DESC").
		Limit(limit).
		Find(&products).Error
	return products, dbErr(err)
}

