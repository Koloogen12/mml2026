package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
)

var ErrStorefrontNotFound = errors.New("storefront: not found")

type StorefrontService struct {
	repos   *repository.Repositories
	storage *StorageService
}

func NewStorefront(repos *repository.Repositories, storage *StorageService) *StorefrontService {
	return &StorefrontService{repos: repos, storage: storage}
}

// resolveProject парсит UUID строку → internal project ID
func (s *StorefrontService) resolveProject(ctx context.Context, publicIDStr string) (int, error) {
	uid, err := uuid.Parse(publicIDStr)
	if err != nil {
		return 0, ErrStorefrontNotFound
	}
	project, err := s.repos.Project.GetByPublicID(ctx, uid)
	if err != nil {
		return 0, ErrStorefrontNotFound
	}
	return project.ID, nil
}

// resolvePhotoURL — ExternalURL приоритет, иначе Minio
func (s *StorefrontService) resolvePhotoURL(ph model.ProductPhoto) string {
	if ph.ExternalURL != nil && *ph.ExternalURL != "" {
		return *ph.ExternalURL
	}
	if ph.ObjectKey == "" {
		return ""
	}
	return s.storage.GetObjectURL(photoBucket, ph.ObjectKey)
}

func (s *StorefrontService) toStorefrontProduct(p model.Product) dto.StorefrontProductResponse {
	var photos []dto.StorefrontPhotoResponse
	for _, ph := range p.Photos {
		u := s.resolvePhotoURL(ph)
		if u != "" {
			photos = append(photos, dto.StorefrontPhotoResponse{URL: u, SortOrder: ph.SortOrder})
		}
	}
	if photos == nil {
		photos = []dto.StorefrontPhotoResponse{}
	}
	return dto.StorefrontProductResponse{
		ID:         p.PublicID.String(),
		Name:       p.Name,
		Brand:      p.Brand,
		Category:   p.Category,
		Gender:     p.Gender,
		Price:      p.Price,
		Currency:   p.Currency,
		Color:      p.Color,
		Photos:     photos,
		ProductURL: p.ProductURL,
	}
}

func (s *StorefrontService) toStorefrontProductDetail(p model.Product, related []model.Product) dto.StorefrontProductDetailResponse {
	var photos []dto.StorefrontPhotoResponse
	for _, ph := range p.Photos {
		u := s.resolvePhotoURL(ph)
		if u != "" {
			photos = append(photos, dto.StorefrontPhotoResponse{URL: u, SortOrder: ph.SortOrder})
		}
	}
	if photos == nil {
		photos = []dto.StorefrontPhotoResponse{}
	}

	sizes := p.Sizes
	if sizes == nil {
		sizes = []string{}
	}

	var relatedDTOs []dto.StorefrontRelatedProduct
	for _, rp := range related {
		var rphotos []dto.StorefrontPhotoResponse
		for _, ph := range rp.Photos {
			u := s.resolvePhotoURL(ph)
			if u != "" {
				rphotos = append(rphotos, dto.StorefrontPhotoResponse{URL: u, SortOrder: ph.SortOrder})
				break // только первое фото
			}
		}
		if rphotos == nil {
			rphotos = []dto.StorefrontPhotoResponse{}
		}
		relatedDTOs = append(relatedDTOs, dto.StorefrontRelatedProduct{
			ID:       rp.PublicID.String(),
			Name:     rp.Name,
			Brand:    rp.Brand,
			Price:    rp.Price,
			Currency: rp.Currency,
			Photos:   rphotos,
		})
	}
	if relatedDTOs == nil {
		relatedDTOs = []dto.StorefrontRelatedProduct{}
	}

	return dto.StorefrontProductDetailResponse{
		ID:              p.PublicID.String(),
		Name:            p.Name,
		Brand:           p.Brand,
		Category:        p.Category,
		Subcategory:     p.Subcategory,
		Gender:          p.Gender,
		Price:           p.Price,
		DiscountPrice:   p.DiscountPrice,
		Currency:        p.Currency,
		Color:           p.Color,
		Material:        p.Material,
		Sizes:           sizes,
		Description:     p.Description,
		ProductURL:      p.ProductURL,
		Photos:          photos,
		RelatedProducts: relatedDTOs,
	}
}

// ListProducts — публичный листинг товаров
func (s *StorefrontService) ListProducts(ctx context.Context, projectPublicID string, f repository.StorefrontFilter) (*dto.StorefrontProductListResponse, error) {
	projectID, err := s.resolveProject(ctx, projectPublicID)
	if err != nil {
		return nil, err
	}
	f.ProjectID = projectID

	products, err := s.repos.Storefront.List(ctx, f)
	if err != nil {
		return nil, err
	}
	total, err := s.repos.Storefront.Count(ctx, f)
	if err != nil {
		return nil, err
	}
	agg, err := s.repos.Storefront.GetFiltersAgg(ctx, projectID)
	if err != nil {
		return nil, err
	}

	items := make([]dto.StorefrontProductResponse, 0, len(products))
	for _, p := range products {
		items = append(items, s.toStorefrontProduct(p))
	}

	return &dto.StorefrontProductListResponse{
		Items:  items,
		Total:  total,
		Offset: f.Offset,
		Limit:  f.Limit,
		Filters: dto.StorefrontFiltersAgg{
			Categories: nonNil(agg.Categories),
			Brands:     nonNil(agg.Brands),
			Colors:     nonNil(agg.Colors),
			PriceMin:   agg.PriceMin,
			PriceMax:   agg.PriceMax,
		},
	}, nil
}

// GetProduct — публичная детальная карточка
func (s *StorefrontService) GetProduct(ctx context.Context, projectPublicID, productPublicID string) (*dto.StorefrontProductDetailResponse, error) {
	projectID, err := s.resolveProject(ctx, projectPublicID)
	if err != nil {
		return nil, err
	}
	product, err := s.repos.Storefront.GetByPublicIDAndProjectID(ctx, productPublicID, projectID)
	if err != nil {
		return nil, ErrStorefrontNotFound
	}
	category := ""
	if product.Category != nil {
		category = *product.Category
	}
	related, _ := s.repos.Storefront.ListRelated(ctx, projectID, product.ID, category, 8)
	result := s.toStorefrontProductDetail(*product, related)
	return &result, nil
}

// ListCategories — публичные категории с количеством
func (s *StorefrontService) ListCategories(ctx context.Context, projectPublicID string) (*dto.StorefrontCategoriesResponse, error) {
	projectID, err := s.resolveProject(ctx, projectPublicID)
	if err != nil {
		return nil, err
	}
	cats, err := s.repos.Storefront.ListCategoriesWithCount(ctx, projectID)
	if err != nil {
		return nil, err
	}
	items := make([]dto.StorefrontCategoryItem, 0, len(cats))
	for _, c := range cats {
		items = append(items, dto.StorefrontCategoryItem{
			Category: c.Category,
			Count:    c.Count,
		})
	}
	return &dto.StorefrontCategoriesResponse{Items: items}, nil
}

func nonNil(s []string) []string {
	// убираем пустые строки
	var result []string
	for _, v := range s {
		if strings.TrimSpace(v) != "" {
			result = append(result, v)
		}
	}
	if result == nil {
		return []string{}
	}
	return result
}
