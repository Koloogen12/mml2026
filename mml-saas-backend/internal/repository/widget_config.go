package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type WidgetConfigRepository struct {
	db *gorm.DB
}

func newWidgetConfigRepository(db *gorm.DB) *WidgetConfigRepository {
	return &WidgetConfigRepository{db: db}
}

func (r *WidgetConfigRepository) GetByProjectID(ctx context.Context, projectID int) (*model.WidgetConfig, error) {
	var cfg model.WidgetConfig
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		First(&cfg).Error
	return queryResult(&cfg, err)
}

func (r *WidgetConfigRepository) Create(ctx context.Context, cfg *model.WidgetConfig) error {
	return dbErr(r.db.WithContext(ctx).Create(cfg).Error)
}

func (r *WidgetConfigRepository) Update(ctx context.Context, cfg *model.WidgetConfig) error {
	return dbErr(r.db.WithContext(ctx).Save(cfg).Error)
}

// CountActiveByOwnerID counts widget configs that exist for projects owned by the user.
func (r *WidgetConfigRepository) CountActiveByOwnerID(ctx context.Context, ownerID int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Table("widget_configs").
		Joins("JOIN projects ON projects.id = widget_configs.project_id").
		Where("projects.owner_id = ? AND projects.deleted_at IS NULL AND widget_configs.deleted_at IS NULL", ownerID).
		Count(&count).Error
	if err != nil {
		return 0, dbErr(err)
	}
	return count, nil
}
