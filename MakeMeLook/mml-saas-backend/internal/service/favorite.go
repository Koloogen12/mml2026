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
)

type FavoriteService struct {
	repos   *repository.Repositories
	storage *StorageService
	cfg     *config.Config
}

func NewFavorite(repos *repository.Repositories, storage *StorageService, cfg *config.Config) *FavoriteService {
	return &FavoriteService{repos: repos, storage: storage, cfg: cfg}
}

func (s *FavoriteService) Add(ctx context.Context, leadID int64, req *dto.AddFavoriteRequest) (*dto.FavoriteResponse, error) {
	fav := &model.LeadFavorite{
		LeadID:   leadID,
		ImageKey: req.ImageKey,
	}

	if req.TryOnID != nil && *req.TryOnID != "" {
		tryOnID, err := strconv.ParseInt(*req.TryOnID, 10, 64)
		if err == nil {
			fav.TryOnID = &tryOnID
		}
	}

	if err := s.repos.LeadFavorite.Create(ctx, fav); err != nil {
		return nil, fmt.Errorf("create favorite: %w", err)
	}

	return &dto.FavoriteResponse{
		ID:        strconv.FormatInt(fav.ID, 10),
		PublicID:  fav.PublicID.String(),
		ImageURL:  s.storage.GetObjectURL(s.cfg.MinioBucket, fav.ImageKey),
		CreatedAt: fav.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (s *FavoriteService) List(ctx context.Context, leadID int64) ([]dto.FavoriteResponse, error) {
	favs, err := s.repos.LeadFavorite.ListByLeadID(ctx, leadID)
	if err != nil {
		return nil, fmt.Errorf("list favorites: %w", err)
	}

	result := make([]dto.FavoriteResponse, 0, len(favs))
	for _, f := range favs {
		r := dto.FavoriteResponse{
			ID:        strconv.FormatInt(f.ID, 10),
			PublicID:  f.PublicID.String(),
			ImageURL:  s.storage.GetObjectURL(s.cfg.MinioBucket, f.ImageKey),
			CreatedAt: f.CreatedAt.Format(time.RFC3339),
		}
		if f.TryOnID != nil {
			r.TryOnID = strconv.FormatInt(*f.TryOnID, 10)
		}
		result = append(result, r)
	}
	return result, nil
}

func (s *FavoriteService) Delete(ctx context.Context, publicID string, leadID int64) error {
	rows, err := s.repos.LeadFavorite.DeleteByPublicID(ctx, publicID, leadID)
	if err != nil {
		return fmt.Errorf("delete favorite: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("favorite not found")
	}
	return nil
}
