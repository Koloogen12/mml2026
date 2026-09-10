package repository

import (
	"context"

	"mml-saas-backend/internal/model"
	"mml-saas-backend/pkg/logger"

	"gorm.io/gorm"
)

type DiagnosticResultRepository struct {
	db *gorm.DB
}

func newDiagnosticResultRepository(db *gorm.DB) *DiagnosticResultRepository {
	return &DiagnosticResultRepository{db: db}
}

// Upsert saves diagnostic result for a domain, replacing any previous result.
func (r *DiagnosticResultRepository) Upsert(ctx context.Context, result *model.DiagnosticResult) error {
	// Soft-delete previous results for same project+domain
	if err := r.db.WithContext(ctx).
		Model(&model.DiagnosticResult{}).
		Where("project_id = ? AND domain = ? AND deleted_at IS NULL", result.ProjectID, result.Domain).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")).Error; err != nil {
		logger.Error("diagnostic_result_repo", "failed to soft-delete previous results", "project_id", result.ProjectID, "domain", result.Domain, "error", err)
	}

	return dbErr(r.db.WithContext(ctx).Create(result).Error)
}

// GetLatestByProject returns the most recent diagnostic result per domain for a project.
func (r *DiagnosticResultRepository) GetLatestByProject(ctx context.Context, projectID int) ([]*model.DiagnosticResult, error) {
	var results []*model.DiagnosticResult
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		Order("domain ASC, checked_at DESC").
		Find(&results).Error
	return results, dbErr(err)
}

// GetActiveProjectIDs returns IDs of projects with status='active' (for cron).
func (r *DiagnosticResultRepository) GetActiveProjectIDs(ctx context.Context) ([]int, error) {
	var ids []int
	err := r.db.WithContext(ctx).
		Model(&model.Project{}).
		Where("status = 'active' AND deleted_at IS NULL").
		Pluck("id", &ids).Error
	return ids, dbErr(err)
}
