package service

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"

	"github.com/google/uuid"
)

type CartService struct {
	repos   *repository.Repositories
	storage *StorageService
	cfg     *config.Config
}

func NewCart(repos *repository.Repositories, storage *StorageService, cfg *config.Config) *CartService {
	return &CartService{repos: repos, storage: storage, cfg: cfg}
}

func (s *CartService) Add(ctx context.Context, leadID int64, req *dto.AddCartItemRequest) (*dto.CartItemResponse, error) {
	productPublicID, err := uuid.Parse(req.ProductID)
	if err != nil {
		return nil, fmt.Errorf("invalid product_id: %w", err)
	}

	product, err := s.repos.Product.GetByPublicID(ctx, productPublicID)
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	if product == nil {
		return nil, fmt.Errorf("product not found")
	}

	item := &model.LeadCartItem{
		LeadID:    leadID,
		ProductID: product.ID,
	}

	if req.TryOnID != nil && *req.TryOnID != "" {
		tryOnID, err := strconv.ParseInt(*req.TryOnID, 10, 64)
		if err == nil {
			item.TryOnID = &tryOnID
		}
	}

	if err := s.repos.LeadCartItem.Create(ctx, item); err != nil {
		return nil, fmt.Errorf("create cart item: %w", err)
	}

	wp := s.buildProductPublic(product)

	return &dto.CartItemResponse{
		ID:        strconv.FormatInt(item.ID, 10),
		PublicID:  item.PublicID.String(),
		Product:   wp,
		CreatedAt: item.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (s *CartService) List(ctx context.Context, leadID int64) ([]dto.CartItemResponse, error) {
	items, err := s.repos.LeadCartItem.ListByLeadID(ctx, leadID)
	if err != nil {
		return nil, fmt.Errorf("list cart items: %w", err)
	}

	result := make([]dto.CartItemResponse, 0, len(items))
	for _, item := range items {
		r := dto.CartItemResponse{
			ID:        strconv.FormatInt(item.ID, 10),
			PublicID:  item.PublicID.String(),
			CreatedAt: item.CreatedAt.Format(time.RFC3339),
		}
		if item.TryOnID != nil {
			r.TryOnID = strconv.FormatInt(*item.TryOnID, 10)
		}
		if item.Product != nil {
			r.Product = s.buildProductPublic(item.Product)
		}
		result = append(result, r)
	}
	return result, nil
}

func (s *CartService) Delete(ctx context.Context, publicID string, leadID int64) error {
	rows, err := s.repos.LeadCartItem.DeleteByPublicID(ctx, publicID, leadID)
	if err != nil {
		return fmt.Errorf("delete cart item: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("cart item not found")
	}
	return nil
}

func (s *CartService) buildProductPublic(p *model.Product) dto.WidgetProductPublic {
	wp := dto.WidgetProductPublic{
		ID:       strconv.Itoa(p.ID),
		PublicID: p.PublicID.String(),
		Name:     p.Name,
		Price:    p.Price,
		Currency: p.Currency,
	}
	if p.Category != nil {
		wp.Category = *p.Category
	}
	if p.ProductURL != nil {
		wp.ProductURL = p.ProductURL
	}
	if len(p.Photos) > 0 {
		wp.PhotoURL = s.storage.GetObjectURL(s.cfg.MinioBucket, p.Photos[0].ObjectKey)
		wp.ThumbnailURL = wp.PhotoURL
	}
	return wp
}
