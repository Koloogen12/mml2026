package service

import (
	"context"
	"fmt"
	"strconv"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/repository"
)

type AvatarService struct {
	repos   *repository.Repositories
	storage *StorageService
	cfg     *config.Config
}

func NewAvatar(repos *repository.Repositories, storage *StorageService, cfg *config.Config) *AvatarService {
	return &AvatarService{repos: repos, storage: storage, cfg: cfg}
}

func (s *AvatarService) List(ctx context.Context, gender string) ([]dto.AvatarResponse, error) {
	avatars, err := s.repos.Avatar.List(ctx, gender)
	if err != nil {
		return nil, fmt.Errorf("list avatars: %w", err)
	}

	result := make([]dto.AvatarResponse, 0, len(avatars))
	for _, a := range avatars {
		r := dto.AvatarResponse{
			ID:         strconv.Itoa(int(a.ID)),
			PublicID:   a.PublicID.String(),
			Gender:     a.Gender,
			FigureType: a.FigureType,
			HeightMin:  a.HeightMin,
			HeightMax:  a.HeightMax,
			WeightMin:  a.WeightMin,
			WeightMax:  a.WeightMax,
			SizeEU:     a.SizeEU,
			PhotoURL:   s.storage.GetObjectURL(s.cfg.MinioBucket, a.PhotoKey),
		}
		if a.ThumbnailKey != nil {
			r.ThumbnailURL = s.storage.GetObjectURL(s.cfg.MinioBucket, *a.ThumbnailKey)
		} else {
			r.ThumbnailURL = r.PhotoURL
		}
		result = append(result, r)
	}
	return result, nil
}

func (s *AvatarService) Match(ctx context.Context, gender string, height, weight int, figureType string) ([]dto.AvatarResponse, error) {
	avatars, err := s.repos.Avatar.Match(ctx, gender, height, weight, figureType)
	if err != nil {
		return nil, fmt.Errorf("match avatars: %w", err)
	}

	result := make([]dto.AvatarResponse, 0, len(avatars))
	for _, a := range avatars {
		r := dto.AvatarResponse{
			ID:         strconv.Itoa(int(a.ID)),
			PublicID:   a.PublicID.String(),
			Gender:     a.Gender,
			FigureType: a.FigureType,
			HeightMin:  a.HeightMin,
			HeightMax:  a.HeightMax,
			WeightMin:  a.WeightMin,
			WeightMax:  a.WeightMax,
			SizeEU:     a.SizeEU,
			PhotoURL:   s.storage.GetObjectURL(s.cfg.MinioBucket, a.PhotoKey),
		}
		if a.ThumbnailKey != nil {
			r.ThumbnailURL = s.storage.GetObjectURL(s.cfg.MinioBucket, *a.ThumbnailKey)
		} else {
			r.ThumbnailURL = r.PhotoURL
		}
		result = append(result, r)
	}
	return result, nil
}
