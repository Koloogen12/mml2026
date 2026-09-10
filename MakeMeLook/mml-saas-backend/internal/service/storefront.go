package service

import (
	"context"
	"errors"
	"time"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"

	"github.com/google/uuid"
)

var ErrStorefrontNotFound = errors.New("project not found")

type StorefrontService struct {
	repos   *repository.Repositories
	storage *StorageService
}

func NewStorefront(repos *repository.Repositories, storage *StorageService) *StorefrontService {
	return &StorefrontService{repos: repos, storage: storage}
}

// resolveProject parses the public UUID string and returns the internal project ID.
func (s *StorefrontService) resolveProject(ctx context.Context, projectPublicID string) (int, error) {
	publicID, err := uuid.Parse(projectPublicID)
	if err != nil {
		return 0, ErrStorefrontNotFound
	}
	project, err := s.repos.Project.GetByPublicID(ctx, publicID)
	if err != nil {
		return 0, err
	}
	if project == nil {
		return 0, ErrStorefrontNotFound
	}
	return project.ID, nil
}

func (s *StorefrontService) ListProducts(ctx context.Context, projectPublicID string, filter repository.StorefrontFilter) (*dto.StorefrontProductListResponse, error) {
	projectID, err := s.resolveProject(ctx, projectPublicID)
	if err != nil {
		return nil, err
	}
	filter.ProjectID = projectID

	products, err := s.repos.Storefront.List(ctx, filter)
	if err != nil {
		return nil, err
	}

	total, err := s.repos.Storefront.Count(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Aggregated filters are always for the full project (not filtered subset).
	agg, err := s.repos.Storefront.GetFiltersAgg(ctx, projectID)
	if err != nil {
		return nil, err
	}

	categories := agg.Categories
	if categories == nil {
		categories = []string{}
	}
	brands := agg.Brands
	if brands == nil {
		brands = []string{}
	}
	colors := agg.Colors
	if colors == nil {
		colors = []string{}
	}

	resp := &dto.StorefrontProductListResponse{
		Products: make([]dto.StorefrontProductResponse, len(products)),
		Total:    int(total),
		Offset:   filter.Offset,
		Limit:    filter.Limit,
		Filters: dto.StorefrontFilters{
			Categories: categories,
			Brands:     brands,
			Colors:     colors,
			PriceRange: dto.StorefrontPriceRange{
				Min: agg.MinPrice,
				Max: agg.MaxPrice,
			},
		},
	}
	for i, p := range products {
		resp.Products[i] = s.toStorefrontProduct(p)
	}
	return resp, nil
}

func (s *StorefrontService) GetProduct(ctx context.Context, projectPublicID string, productPublicID string) (*dto.StorefrontProductDetailResponse, error) {
	projectID, err := s.resolveProject(ctx, projectPublicID)
	if err != nil {
		return nil, err
	}

	productUUID, err := uuid.Parse(productPublicID)
	if err != nil {
		return nil, ErrProductNotFound
	}

	product, err := s.repos.Storefront.GetByPublicIDAndProjectID(ctx, productUUID, projectID)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, ErrProductNotFound
	}

	category := ""
	if product.Category != nil {
		category = *product.Category
	}
	related, err := s.repos.Storefront.ListRelated(ctx, projectID, category, product.ID, 8)
	if err != nil {
		return nil, err
	}

	return s.toStorefrontProductDetail(product, related), nil
}

func (s *StorefrontService) ListCategories(ctx context.Context, projectPublicID string) (*dto.StorefrontCategoriesResponse, error) {
	projectID, err := s.resolveProject(ctx, projectPublicID)
	if err != nil {
		return nil, err
	}

	counts, err := s.repos.Storefront.ListCategoriesWithCount(ctx, projectID)
	if err != nil {
		return nil, err
	}

	resp := &dto.StorefrontCategoriesResponse{
		Categories: make([]dto.StorefrontCategoryItem, len(counts)),
	}
	total := 0
	for i, c := range counts {
		resp.Categories[i] = dto.StorefrontCategoryItem{
			Key:   c.Category,
			Count: int(c.Count),
		}
		total += int(c.Count)
	}
	resp.TotalProducts = total
	return resp, nil
}

// --- Mapping helpers ---

func (s *StorefrontService) resolvePhotoURL(ph model.ProductPhoto) string {
	if ph.ExternalURL != nil && *ph.ExternalURL != "" {
		return *ph.ExternalURL
	}
	if ph.ObjectKey != "" {
		return s.storage.GetObjectURL(photoBucket, ph.ObjectKey)
	}
	return ""
}

func (s *StorefrontService) toStorefrontProduct(p *model.Product) dto.StorefrontProductResponse {
	photos := make([]dto.StorefrontPhotoResponse, 0, len(p.Photos))
	for _, ph := range p.Photos {
		url := s.resolvePhotoURL(ph)
		if url == "" {
			continue
		}
		photos = append(photos, dto.StorefrontPhotoResponse{URL: url, SortOrder: ph.SortOrder})
	}

	sizes := []string(p.Sizes)
	if sizes == nil {
		sizes = []string{}
	}

	return dto.StorefrontProductResponse{
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
		IsNew:         time.Since(p.CreatedAt) <= 30*24*time.Hour,
		Photos:        photos,
	}
}

func (s *StorefrontService) toStorefrontProductDetail(p *model.Product, related []*model.Product) *dto.StorefrontProductDetailResponse {
	photos := make([]dto.StorefrontPhotoResponse, 0, len(p.Photos))
	for _, ph := range p.Photos {
		url := s.resolvePhotoURL(ph)
		if url == "" {
			continue
		}
		photos = append(photos, dto.StorefrontPhotoResponse{URL: url, SortOrder: ph.SortOrder})
	}

	relatedDTOs := make([]dto.StorefrontRelatedProduct, 0, len(related))
	for _, r := range related {
		relatedPhotos := make([]dto.StorefrontPhotoResponse, 0, len(r.Photos))
		for _, ph := range r.Photos {
			url := s.resolvePhotoURL(ph)
			if url == "" {
				continue
			}
			relatedPhotos = append(relatedPhotos, dto.StorefrontPhotoResponse{URL: url, SortOrder: ph.SortOrder})
		}
		relatedDTOs = append(relatedDTOs, dto.StorefrontRelatedProduct{
			ID:       r.PublicID.String(),
			Name:     r.Name,
			Brand:    r.Brand,
			Price:    r.Price,
			Currency: r.Currency,
			Photos:   relatedPhotos,
		})
	}

	sizes := []string(p.Sizes)
	if sizes == nil {
		sizes = []string{}
	}
	season := []string(p.Season)
	if season == nil {
		season = []string{}
	}

	return &dto.StorefrontProductDetailResponse{
		ID:              p.PublicID.String(),
		Name:            p.Name,
		Brand:           p.Brand,
		Category:        p.Category,
		Subcategory:     p.Subcategory,
		Price:           p.Price,
		DiscountPrice:   p.DiscountPrice,
		Currency:        p.Currency,
		Color:           p.Color,
		Material:        p.Material,
		Sizes:           sizes,
		Description:     p.Description,
		Season:          season,
		IsNew:           time.Since(p.CreatedAt) <= 30*24*time.Hour,
		Photos:          photos,
		RelatedProducts: relatedDTOs,
	}
}
