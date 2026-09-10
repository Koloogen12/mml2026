package repository

import (
	"context"
	"math"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type AvatarRepository struct {
	db *gorm.DB
}

func newAvatarRepository(db *gorm.DB) *AvatarRepository {
	return &AvatarRepository{db: db}
}

func (r *AvatarRepository) List(ctx context.Context, gender string) ([]*model.Avatar, error) {
	var avatars []*model.Avatar
	q := r.db.WithContext(ctx).Where("is_active = true AND deleted_at IS NULL")
	if gender != "" {
		q = q.Where("gender = ?", gender)
	}
	err := q.Order("sort_order ASC, id ASC").Find(&avatars).Error
	return avatars, dbErr(err)
}

func (r *AvatarRepository) GetByPublicID(ctx context.Context, publicID string) (*model.Avatar, error) {
	var avatar model.Avatar
	err := r.db.WithContext(ctx).
		Where("public_id = ? AND is_active = true AND deleted_at IS NULL", publicID).
		First(&avatar).Error
	return queryResult(&avatar, err)
}

// Match finds the best matching avatar based on body parameters.
// Returns avatars matching gender and figure type, sorted by how well height/weight ranges match.
func (r *AvatarRepository) Match(ctx context.Context, gender string, height, weight int, figureType string) ([]*model.Avatar, error) {
	var avatars []*model.Avatar
	q := r.db.WithContext(ctx).
		Where("gender = ? AND is_active = true AND deleted_at IS NULL", gender)
	if figureType != "" {
		q = q.Where("figure_type = ?", figureType)
	}
	err := q.Order("sort_order ASC").Find(&avatars).Error
	if err != nil {
		return nil, dbErr(err)
	}

	// Score and sort by best match (in-memory — small dataset)
	type scored struct {
		avatar *model.Avatar
		score  float64
	}
	var scored_ []scored
	for _, a := range avatars {
		s := 0.0
		if a.HeightMin != nil && a.HeightMax != nil {
			mid := float64(*a.HeightMin+*a.HeightMax) / 2
			s += math.Abs(float64(height) - mid)
		}
		if a.WeightMin != nil && a.WeightMax != nil {
			mid := float64(*a.WeightMin+*a.WeightMax) / 2
			s += math.Abs(float64(weight) - mid)
		}
		scored_ = append(scored_, scored{avatar: a, score: s})
	}

	// Sort by score ascending (best match first)
	for i := 0; i < len(scored_); i++ {
		for j := i + 1; j < len(scored_); j++ {
			if scored_[j].score < scored_[i].score {
				scored_[i], scored_[j] = scored_[j], scored_[i]
			}
		}
	}

	result := make([]*model.Avatar, len(scored_))
	for i, s := range scored_ {
		result[i] = s.avatar
	}
	return result, nil
}
