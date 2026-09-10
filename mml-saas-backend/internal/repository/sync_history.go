package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type SyncHistoryRepository struct {
	db *gorm.DB
}

func newSyncHistoryRepository(db *gorm.DB) *SyncHistoryRepository {
	return &SyncHistoryRepository{db: db}
}

func (r *SyncHistoryRepository) Create(ctx context.Context, h *model.SyncHistory) error {
	return dbErr(r.db.WithContext(ctx).Create(h).Error)
}

// ListByStoreID returns up to `limit` recent sync runs for a store, newest first.
// Caller is responsible for verifying that the store belongs to the user's project.
func (r *SyncHistoryRepository) ListByStoreID(ctx context.Context, storeID int, limit int) ([]*model.SyncHistory, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var rows []*model.SyncHistory
	err := r.db.WithContext(ctx).
		Where("store_id = ?", storeID).
		Order("started_at DESC").
		Limit(limit).
		Find(&rows).Error
	if err != nil {
		return nil, dbErr(err)
	}
	return rows, nil
}
