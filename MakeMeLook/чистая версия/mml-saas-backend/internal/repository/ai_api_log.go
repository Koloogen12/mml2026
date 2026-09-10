package repository

import (
	"context"
	"time"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type AiApiLogRepository struct {
	db *gorm.DB
}

func newAiApiLogRepository(db *gorm.DB) *AiApiLogRepository {
	return &AiApiLogRepository{db: db}
}

func (r *AiApiLogRepository) Create(ctx context.Context, log *model.AiApiLog) error {
	return dbErr(r.db.WithContext(ctx).Create(log).Error)
}

func (r *AiApiLogRepository) Update(ctx context.Context, log *model.AiApiLog) error {
	return dbErr(r.db.WithContext(ctx).Save(log).Error)
}

// DailyStats holds aggregated token usage for a single day.
type DailyStats struct {
	Date         time.Time `json:"date"`
	TotalTokens  int64     `json:"total_tokens"`
	RequestCount int64     `json:"request_count"`
}

func (r *AiApiLogRepository) GetDailyStats(ctx context.Context, projectID int, from, to time.Time) ([]DailyStats, error) {
	var stats []DailyStats
	err := r.db.WithContext(ctx).
		Model(&model.AiApiLog{}).
		Select("date_trunc('day', created_at) as date, COALESCE(SUM(total_tokens), 0) as total_tokens, COUNT(*) as request_count").
		Where("project_id = ? AND created_at >= ? AND created_at < ? AND deleted_at IS NULL", projectID, from, to).
		Group("date_trunc('day', created_at)").
		Order("date ASC").
		Scan(&stats).Error
	return stats, dbErr(err)
}

// ModelUsage holds token usage grouped by model name.
type ModelUsage struct {
	Model        string `json:"model"`
	TotalTokens  int64  `json:"total_tokens"`
	RequestCount int64  `json:"request_count"`
}

func (r *AiApiLogRepository) GetModelUsage(ctx context.Context, projectID int, from, to time.Time) ([]ModelUsage, error) {
	var usage []ModelUsage
	err := r.db.WithContext(ctx).
		Model(&model.AiApiLog{}).
		Select("model, COALESCE(SUM(total_tokens), 0) as total_tokens, COUNT(*) as request_count").
		Where("project_id = ? AND created_at >= ? AND created_at < ? AND deleted_at IS NULL", projectID, from, to).
		Group("model").
		Order("total_tokens DESC").
		Scan(&usage).Error
	return usage, dbErr(err)
}
