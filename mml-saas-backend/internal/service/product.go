package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

var (
	ErrProductNotFound = errors.New("product not found")
	ErrGroupNotFound   = errors.New("product group not found")
	ErrGroupRequired   = errors.New("group_id is required for add_to_group action")
	ErrImportNotFound  = errors.New("import job not found")
)

const photoBucket = "product-photos"

type ProductService struct {
	repos      *repository.Repositories
	storage    *StorageService
	importMu   sync.RWMutex
	importJobs map[string]*ImportJob
}

func NewProduct(repos *repository.Repositories, storage *StorageService) *ProductService {
	return &ProductService{
		repos:      repos,
		storage:    storage,
		importJobs: make(map[string]*ImportJob),
	}
}

// CreateProduct creates a new product in the given project.
func (s *ProductService) CreateProduct(ctx context.Context, userID int, projectID int, req dto.CreateProductRequest) (*dto.ProductResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	product := &model.Product{
		ProjectID:     projectID,
		Name:          req.Name,
		Category:      req.Category,
		Subcategory:   req.Subcategory,
		Gender:        req.Gender,
		SKU:           req.SKU,
		Price:         req.Price,
		DiscountPrice: req.DiscountPrice,
		Currency:      req.Currency,
		ProductURL:    req.ProductURL,
		Season:        pq.StringArray(req.Season),
		Color:         req.Color,
		Material:      req.Material,
		Brand:         req.Brand,
		Sizes:         pq.StringArray(req.Sizes),
		Description:   req.Description,
		IsActive:      true,
		Source:        model.ProductSourceManual,
	}

	if err := s.repos.Product.Create(ctx, product); err != nil {
		return nil, fmt.Errorf("create product: %w", err)
	}

	if len(req.PhotoIDs) > 0 {
		if err := s.syncProductPhotos(ctx, product.ID, userID, projectID, req.PhotoIDs); err != nil {
			return nil, fmt.Errorf("sync photos: %w", err)
		}
	}

	// Re-fetch to include attached photos.
	product, err := s.repos.Product.GetByIDAndProjectID(ctx, product.ID, projectID)
	if err != nil {
		return nil, fmt.Errorf("re-fetch product: %w", err)
	}

	return s.productToDTO(product), nil
}

// SyncProductsFromWidget creates or updates products from a platform DOM (e.g., Tilda).
// Uses ExternalID (product name) to match existing products.
func (s *ProductService) SyncProductsFromWidget(ctx context.Context, projectID int, req dto.SyncProductsRequest) (*dto.SyncProductsResponse, error) {
	resp := &dto.SyncProductsResponse{Total: len(req.Products)}

	for _, item := range req.Products {
		// Use name as ExternalID if not provided
		externalID := item.ExternalID
		if externalID == "" {
			externalID = item.Name
		}

		// Check if product already exists by ExternalID
		existing, _ := s.repos.Product.GetByProjectIDAndExternalID(ctx, projectID, externalID)
		if existing != nil {
			// Update price if changed
			needsUpdate := false
			updates := map[string]any{}
			if item.Price != nil && (existing.Price == nil || *existing.Price != *item.Price) {
				updates["price"] = *item.Price
				needsUpdate = true
			}
			if item.Description != "" && (existing.Description == nil || *existing.Description != item.Description) {
				updates["description"] = item.Description
				needsUpdate = true
			}
			if item.ProductURL != "" && (existing.ProductURL == nil || *existing.ProductURL != item.ProductURL) {
				updates["product_url"] = item.ProductURL
				needsUpdate = true
			}
			if needsUpdate {
				_ = s.repos.Product.UpdateAll(ctx, existing.ID, updates)
				resp.Updated++
			} else {
				resp.Skipped++
			}
			continue
		}

		// Create new product
		currency := item.Currency
		if currency == "" {
			currency = "RUB"
		}

		category := guessCategory(item.Name)

		product := &model.Product{
			ProjectID:  projectID,
			Name:       item.Name,
			Category:   &category,
			Price:      item.Price,
			Currency:   &currency,
			ProductURL: strPtr(item.ProductURL),
			ExternalID: &externalID,
			IsActive:   true,
			Source:     model.ProductSourceAPI,
		}
		if item.Description != "" {
			product.Description = &item.Description
		}

		if err := s.repos.Product.Create(ctx, product); err != nil {
			logger.Error("service", "Sync: failed to create product", "name", item.Name, "error", err)
			resp.Skipped++
			continue
		}

		// Download photos in background
		if len(item.ImageURLs) > 0 {
			go func(pID int, urls []string) {
				bgCtx := context.Background()
				job := &ImportJob{} // dummy job for error tracking
				s.downloadPhotosForProduct(bgCtx, projectID, pID, urls, job)
			}(product.ID, item.ImageURLs)
		}

		resp.Created++
	}

	return resp, nil
}

// guessCategory tries to classify a product by name keywords.
// Categories: outerwear, tops, bottoms, shoes, accessories
func guessCategory(name string) string {
	lower := strings.ToLower(name)
	switch {
	// Outerwear
	case strings.Contains(lower, "курт") || strings.Contains(lower, "пальто") ||
		strings.Contains(lower, "плащ") || strings.Contains(lower, "пончо") ||
		strings.Contains(lower, "пуховик") || strings.Contains(lower, "жилет") ||
		strings.Contains(lower, "jacket") || strings.Contains(lower, "coat"):
		return "outerwear"
	// Bottoms
	case strings.Contains(lower, "брюк") || strings.Contains(lower, "джинс") ||
		strings.Contains(lower, "шорт") || strings.Contains(lower, "юбк") ||
		strings.Contains(lower, "штан") || strings.Contains(lower, "pants") ||
		strings.Contains(lower, "skirt") || strings.Contains(lower, "jeans"):
		return "bottoms"
	// Shoes
	case strings.Contains(lower, "кед") || strings.Contains(lower, "кросс") ||
		strings.Contains(lower, "туфл") || strings.Contains(lower, "ботин") ||
		strings.Contains(lower, "сапог") || strings.Contains(lower, "босонож") ||
		strings.Contains(lower, "сандал") || strings.Contains(lower, "обув") ||
		strings.Contains(lower, "shoes") || strings.Contains(lower, "sneaker") ||
		strings.Contains(lower, "boot"):
		return "shoes"
	// Accessories
	case strings.Contains(lower, "шляп") || strings.Contains(lower, "шапк") ||
		strings.Contains(lower, "шарф") || strings.Contains(lower, "перчат") ||
		strings.Contains(lower, "сумк") || strings.Contains(lower, "рюкзак") ||
		strings.Contains(lower, "браслет") || strings.Contains(lower, "кольц") ||
		strings.Contains(lower, "очки") || strings.Contains(lower, "ремен") ||
		strings.Contains(lower, "шоппер") || strings.Contains(lower, "bag") ||
		strings.Contains(lower, "hat") || strings.Contains(lower, "belt"):
		return "accessories"
	// Default: tops
	default:
		return "tops"
	}
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// GetProduct returns a product verifying project ownership.
func (s *ProductService) GetProduct(ctx context.Context, userID int, projectID int, productID int) (*dto.ProductResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	product, err := s.repos.Product.GetByIDAndProjectID(ctx, productID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	if product == nil {
		return nil, ErrProductNotFound
	}

	return s.productToDTO(product), nil
}

// ListProducts returns a paginated, filtered list of products for a project.
func (s *ProductService) ListProducts(ctx context.Context, userID int, projectID int, filter repository.ProductListFilter) (*dto.ProductListResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	filter.ProjectID = projectID

	products, err := s.repos.Product.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}

	total, err := s.repos.Product.Count(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("count products: %w", err)
	}

	dtos := make([]dto.ProductResponse, len(products))
	for i, p := range products {
		dtos[i] = *s.productToDTO(p)
	}

	return &dto.ProductListResponse{
		Products: dtos,
		Total:    int(total),
		Offset:   filter.Offset,
		Limit:    filter.Limit,
	}, nil
}

// UpdateProduct replaces all updatable fields of a product.
func (s *ProductService) UpdateProduct(ctx context.Context, userID int, projectID int, productID int, req dto.CreateProductRequest) (*dto.ProductResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	product, err := s.repos.Product.GetByIDAndProjectID(ctx, productID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	if product == nil {
		return nil, ErrProductNotFound
	}

	updates := map[string]any{
		"name":           req.Name,
		"category":       req.Category,
		"subcategory":    req.Subcategory,
		"gender":         req.Gender,
		"sku":            req.SKU,
		"price":          req.Price,
		"discount_price": req.DiscountPrice,
		"currency":       req.Currency,
		"product_url":    req.ProductURL,
		"season":         pq.StringArray(req.Season),
		"color":          req.Color,
		"material":       req.Material,
		"brand":          req.Brand,
		"sizes":          pq.StringArray(req.Sizes),
		"description":    req.Description,
	}

	if err := s.repos.Product.UpdateAll(ctx, productID, updates); err != nil {
		return nil, fmt.Errorf("update product: %w", err)
	}

	if req.PhotoIDs != nil {
		if err := s.syncProductPhotos(ctx, productID, userID, projectID, req.PhotoIDs); err != nil {
			return nil, fmt.Errorf("sync photos: %w", err)
		}
	}

	// Re-fetch with photos
	product, err = s.repos.Product.GetByIDAndProjectID(ctx, productID, projectID)
	if err != nil {
		return nil, fmt.Errorf("re-fetch product: %w", err)
	}
	return s.productToDTO(product), nil
}

// DeleteProduct soft-deletes a product.
func (s *ProductService) DeleteProduct(ctx context.Context, userID int, projectID int, productID int) error {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return err
	}

	affected, err := s.repos.Product.Delete(ctx, productID, projectID)
	if err != nil {
		return fmt.Errorf("delete product: %w", err)
	}
	if affected == 0 {
		return ErrProductNotFound
	}
	return nil
}

// BulkAction performs a bulk action on a set of products.
func (s *ProductService) BulkAction(ctx context.Context, userID int, projectID int, req dto.BulkProductActionRequest) (*dto.BulkActionResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	var affected int64
	var err error

	switch req.Action {
	case "activate":
		affected, err = s.repos.Product.BulkSetActive(ctx, projectID, req.ProductIDs, true)
	case "deactivate":
		affected, err = s.repos.Product.BulkSetActive(ctx, projectID, req.ProductIDs, false)
	case "delete":
		affected, err = s.repos.Product.BulkDelete(ctx, projectID, req.ProductIDs)
	case "add_to_group":
		if req.GroupID == nil {
			return nil, ErrGroupRequired
		}
		group, gerr := s.repos.ProductGroup.GetByIDAndProjectID(ctx, *req.GroupID, projectID)
		if gerr != nil {
			return nil, fmt.Errorf("get group: %w", gerr)
		}
		if group == nil {
			return nil, ErrGroupNotFound
		}
		if err = s.repos.ProductGroup.AddProductsToGroup(ctx, *req.GroupID, req.ProductIDs); err != nil {
			return nil, fmt.Errorf("add to group: %w", err)
		}
		affected = int64(len(req.ProductIDs))
	}

	if err != nil {
		return nil, fmt.Errorf("bulk action: %w", err)
	}

	return &dto.BulkActionResponse{
		Affected: int(affected),
		Message:  fmt.Sprintf("%d products updated", affected),
	}, nil
}

// ListProductsPublic returns a paginated filtered list of active products for a project identified by its public UUID.
// No authentication required.
func (s *ProductService) ListProductsPublic(ctx context.Context, projectPublicID uuid.UUID, filter repository.ProductListFilter) (*dto.StorefrontProductListResponse, error) {
	project, err := s.repos.Project.GetByPublicID(ctx, projectPublicID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	isActive := true
	filter.ProjectID = project.ID
	filter.IsActive = &isActive

	products, err := s.repos.Product.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}

	total, err := s.repos.Product.Count(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("count products: %w", err)
	}

	filterData, err := s.repos.Product.GetStorefrontFilters(ctx, project.ID)
	if err != nil {
		return nil, fmt.Errorf("get storefront filters: %w", err)
	}

	items := make([]dto.StorefrontProduct, len(products))
	for i, p := range products {
		items[i] = s.productToStorefront(p)
	}

	return &dto.StorefrontProductListResponse{
		Items:  items,
		Total:  int(total),
		Offset: filter.Offset,
		Limit:  filter.Limit,
		Filters: dto.StorefrontFilters{
			Categories: filterData.Categories,
			Brands:     filterData.Brands,
			Colors:     filterData.Colors,
			PriceMin:   filterData.PriceMin,
			PriceMax:   filterData.PriceMax,
		},
	}, nil
}

// GetProductPublic returns a single active product by its public UUID, for a project identified by public UUID.
// No authentication required.
func (s *ProductService) GetProductPublic(ctx context.Context, projectPublicID uuid.UUID, productPublicID uuid.UUID) (*dto.StorefrontProductDetail, error) {
	project, err := s.repos.Project.GetByPublicID(ctx, projectPublicID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	product, err := s.repos.Product.GetByPublicID(ctx, productPublicID)
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	if product == nil || product.ProjectID != project.ID || !product.IsActive {
		return nil, ErrProductNotFound
	}

	relatedDTOs := []dto.StorefrontRelatedProduct{}
	if product.Category != nil {
		related, _ := s.repos.Product.ListRelatedProducts(ctx, project.ID, *product.Category, product.PublicID, 4)
		for _, r := range related {
			sf := s.productToStorefront(r)
			relatedDTOs = append(relatedDTOs, dto.StorefrontRelatedProduct{
				ID:       sf.ID,
				Name:     sf.Name,
				Brand:    sf.Brand,
				Price:    sf.Price,
				Currency: sf.Currency,
				Photos:   sf.Photos,
			})
		}
	}

	base := s.productToStorefront(product)
	season := []string(product.Season)
	if season == nil {
		season = []string{}
	}

	return &dto.StorefrontProductDetail{
		StorefrontProduct: base,
		Material:          product.Material,
		Description:       product.Description,
		Season:            season,
		RelatedProducts:   relatedDTOs,
	}, nil
}

// GetCategoriesPublic returns the list of categories with product counts for a project.
// No authentication required.
func (s *ProductService) GetCategoriesPublic(ctx context.Context, projectPublicID uuid.UUID) (*dto.StorefrontCategoriesResponse, error) {
	project, err := s.repos.Project.GetByPublicID(ctx, projectPublicID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	filterData, err := s.repos.Product.GetStorefrontFilters(ctx, project.ID)
	if err != nil {
		return nil, fmt.Errorf("get storefront filters: %w", err)
	}

	isActive := true
	items := make([]dto.StorefrontCategoryItem, 0, len(filterData.Categories))
	for _, cat := range filterData.Categories {
		count, _ := s.repos.Product.Count(ctx, repository.ProductListFilter{
			ProjectID: project.ID,
			Category:  cat,
			IsActive:  &isActive,
		})
		items = append(items, dto.StorefrontCategoryItem{
			Category: cat,
			Count:    int(count),
		})
	}

	return &dto.StorefrontCategoriesResponse{Items: items}, nil
}

// productToStorefront converts a Product model to the public storefront DTO.
// id is mapped to the public UUID; is_new is true if the product was created within the last 30 days.
func (s *ProductService) productToStorefront(p *model.Product) dto.StorefrontProduct {
	photos := make([]dto.StorefrontPhoto, 0, len(p.Photos))
	for _, ph := range p.Photos {
		url := ""
		if ph.ExternalURL != nil && *ph.ExternalURL != "" {
			url = *ph.ExternalURL
		} else if ph.ObjectKey != "" {
			url = s.storage.GetObjectURL(photoBucket, ph.ObjectKey)
		}
		photos = append(photos, dto.StorefrontPhoto{
			URL:       url,
			SortOrder: ph.SortOrder,
		})
	}

	sizes := []string(p.Sizes)
	if sizes == nil {
		sizes = []string{}
	}

	return dto.StorefrontProduct{
		ID:            p.PublicID.String(),
		Name:          p.Name,
		Brand:         p.Brand,
		Category:      p.Category,
		Subcategory:   p.Subcategory,
		Price:         p.Price,
		DiscountPrice: p.DiscountPrice,
		Currency:      p.Currency,
		Color:         p.Color,
		Sizes:         sizes,
		IsNew:         time.Since(p.CreatedAt) < 30*24*time.Hour,
		Photos:        photos,
	}
}

// requireProjectAccess checks that the project exists and belongs to the user.
func (s *ProductService) requireProjectAccess(ctx context.Context, userID int, projectID int) (*model.Project, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}
	return project, nil
}

// productToDTO converts a Product model to a ProductResponse DTO.
func (s *ProductService) productToDTO(p *model.Product) *dto.ProductResponse {
	photos := make([]dto.ProductPhotoResponse, 0, len(p.Photos))
	for _, ph := range p.Photos {
		url := ""
		if ph.ExternalURL != nil && *ph.ExternalURL != "" {
			url = *ph.ExternalURL
		} else if ph.ObjectKey != "" {
			url = s.storage.GetObjectURL(photoBucket, ph.ObjectKey)
		}
		photos = append(photos, dto.ProductPhotoResponse{
			ID:        ph.ID,
			URL:       url,
			SortOrder: ph.SortOrder,
		})
	}

	season := []string(p.Season)
	if season == nil {
		season = []string{}
	}
	sizes := []string(p.Sizes)
	if sizes == nil {
		sizes = []string{}
	}

	return &dto.ProductResponse{
		ID:            p.ID,
		PublicID:      p.PublicID.String(),
		ProjectID:     p.ProjectID,
		Name:          p.Name,
		Category:      p.Category,
		Subcategory:   p.Subcategory,
		Gender:        p.Gender,
		SKU:           p.SKU,
		Price:         p.Price,
		DiscountPrice: p.DiscountPrice,
		Currency:      p.Currency,
		ProductURL:    p.ProductURL,
		Season:        season,
		Color:         p.Color,
		Material:      p.Material,
		Brand:         p.Brand,
		Sizes:         sizes,
		Description:   p.Description,
		IsActive:      p.IsActive,
		Source:        string(p.Source),
		Photos:        photos,
		CreatedAt:     p.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     p.UpdatedAt.Format(time.RFC3339),
	}
}
