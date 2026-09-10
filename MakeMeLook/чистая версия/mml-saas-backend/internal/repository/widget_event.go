package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type WidgetEventRepository struct {
	db *gorm.DB
}

func newWidgetEventRepository(db *gorm.DB) *WidgetEventRepository {
	return &WidgetEventRepository{db: db}
}

func (r *WidgetEventRepository) CreateBatch(ctx context.Context, events []*model.WidgetEvent) error {
	if len(events) == 0 {
		return nil
	}
	return dbErr(r.db.WithContext(ctx).Create(events).Error)
}
