package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
)

type ProjectDomainRepository struct {
	db *gorm.DB
}

func newProjectDomainRepository(db *gorm.DB) *ProjectDomainRepository {
	return &ProjectDomainRepository{db: db}
}

// Create
func (r *ProjectDomainRepository) Create(ctx context.Context, domain *model.ProjectDomain) error {
	return dbErr(r.db.WithContext(ctx).Create(domain).Error)
}

// List by project
func (r *ProjectDomainRepository) ListByProjectID(ctx context.Context, projectID int) ([]*model.ProjectDomain, error) {
	var domains []*model.ProjectDomain
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		Order("domain ASC").
		Find(&domains).Error
	return domains, dbErr(err)
}

// Get by ID
func (r *ProjectDomainRepository) GetByID(ctx context.Context, id int) (*model.ProjectDomain, error) {
	var domain model.ProjectDomain
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		First(&domain, id).Error
	return queryResult(&domain, err)
}

// Check domain exists for project
func (r *ProjectDomainRepository) ExistsByProjectAndDomain(ctx context.Context, projectID int, domain string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ProjectDomain{}).
		Where("project_id = ? AND domain = ? AND deleted_at IS NULL", projectID, domain).
		Count(&count).Error
	return count > 0, dbErr(err)
}

// Soft delete with projectID check (atomic)
func (r *ProjectDomainRepository) Delete(ctx context.Context, id int, projectID int) (int64, error) {
	result := r.db.WithContext(ctx).
		Model(&model.ProjectDomain{}).
		Where("id = ? AND project_id = ? AND deleted_at IS NULL", id, projectID).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP"))
	return affectedRows(result)
}
