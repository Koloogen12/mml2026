package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type ProjectRepository struct {
	db *gorm.DB
}

func newProjectRepository(db *gorm.DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

// Create
func (r *ProjectRepository) Create(ctx context.Context, project *model.Project) error {
	return dbErr(r.db.WithContext(ctx).Create(project).Error)
}

// Get by ID
func (r *ProjectRepository) GetByID(ctx context.Context, id int) (*model.Project, error) {
	var project model.Project
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		First(&project, id).Error
	return queryResult(&project, err)
}

// Get by ID and OwnerID (for ownership check)
func (r *ProjectRepository) GetByIDAndOwnerID(ctx context.Context, id int, ownerID int) (*model.Project, error) {
	var project model.Project
	err := r.db.WithContext(ctx).
		Where("id = ? AND owner_id = ? AND deleted_at IS NULL", id, ownerID).
		First(&project).Error
	return queryResult(&project, err)
}

// Get by PublicID
func (r *ProjectRepository) GetByPublicID(ctx context.Context, publicID uuid.UUID) (*model.Project, error) {
	var project model.Project
	err := r.db.WithContext(ctx).
		Where("public_id = ? AND deleted_at IS NULL", publicID).
		First(&project).Error
	return queryResult(&project, err)
}

// List by owner
func (r *ProjectRepository) ListByOwnerID(ctx context.Context, ownerID int, offset, limit int) ([]*model.Project, error) {
	var projects []*model.Project
	err := r.db.WithContext(ctx).
		Where("owner_id = ? AND deleted_at IS NULL", ownerID).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&projects).Error
	return projects, dbErr(err)
}

// Count by owner
func (r *ProjectRepository) CountByOwnerID(ctx context.Context, ownerID int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.Project{}).
		Where("owner_id = ? AND deleted_at IS NULL", ownerID).
		Count(&count).Error
	return count, dbErr(err)
}

// UpdateProjectData contains fields that can be updated in project.
type UpdateProjectData struct {
	Name           *string
	SiteURL        *string
	Category       *string
	TargetAudience pq.StringArray
	Description    *string
	LogoKey        *string
	Status         *model.ProjectStatus
	TryonProvider  *model.TryonProvider
}

// Update updates project fields with ownership check (atomic).
func (r *ProjectRepository) Update(ctx context.Context, id int, ownerID int, data *UpdateProjectData) (int64, error) {
	updates := make(map[string]any)
	if data.Name != nil {
		updates["name"] = *data.Name
	}
	if data.SiteURL != nil {
		updates["site_url"] = *data.SiteURL
	}
	if data.Category != nil {
		updates["category"] = *data.Category
	}
	if data.TargetAudience != nil {
		updates["target_audience"] = data.TargetAudience
	}
	if data.Description != nil {
		updates["description"] = *data.Description
	}
	if data.LogoKey != nil {
		updates["logo_key"] = *data.LogoKey
	}
	if data.Status != nil {
		updates["status"] = *data.Status
	}
	if data.TryonProvider != nil {
		updates["tryon_provider"] = *data.TryonProvider
	}

	result := r.db.WithContext(ctx).
		Model(&model.Project{}).
		Where("id = ? AND owner_id = ? AND deleted_at IS NULL", id, ownerID).
		Updates(updates)
	return affectedRows(result)
}

// Soft delete with ownership check (atomic)
func (r *ProjectRepository) Delete(ctx context.Context, id int, ownerID int) (int64, error) {
	result := r.db.WithContext(ctx).
		Model(&model.Project{}).
		Where("id = ? AND owner_id = ? AND deleted_at IS NULL", id, ownerID).
		Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP"))
	return affectedRows(result)
}

// Stats (last 7 days)
type ProjectStats struct {
	TryOns      int
	Leads       int
	Conversions int
}

func (r *ProjectRepository) GetStats(ctx context.Context, projectID int) (*ProjectStats, error) {
	stats := &ProjectStats{}

	var leadsCount int64
	r.db.WithContext(ctx).
		Model(&model.Lead{}).
		Where("project_id = ? AND deleted_at IS NULL AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'", projectID).
		Count(&leadsCount)
	stats.Leads = int(leadsCount)

	var tryOnCount int64
	r.db.WithContext(ctx).
		Model(&model.LeadTryOn{}).
		Joins("JOIN leads ON leads.id = lead_try_ons.lead_id").
		Where("leads.project_id = ? AND leads.deleted_at IS NULL AND lead_try_ons.deleted_at IS NULL", projectID).
		Where("lead_try_ons.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'").
		Count(&tryOnCount)
	stats.TryOns = int(tryOnCount)

	var cartCount int64
	r.db.WithContext(ctx).
		Model(&model.LeadCartItem{}).
		Joins("JOIN leads ON leads.id = lead_cart_items.lead_id").
		Where("leads.project_id = ? AND leads.deleted_at IS NULL AND lead_cart_items.deleted_at IS NULL", projectID).
		Where("lead_cart_items.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'").
		Count(&cartCount)
	stats.Conversions = int(cartCount)

	return stats, nil
}

// Onboarding status
type OnboardingStatus struct {
	WidgetConfigured bool
	ProductsCount    int
	HasDomain        bool
	FirstTryOn       bool
}

func (r *ProjectRepository) GetOnboardingStatus(ctx context.Context, projectID int) (*OnboardingStatus, error) {
	status := &OnboardingStatus{}

	// Widget configured
	var widgetCount int64
	r.db.WithContext(ctx).
		Table("widget_configs").
		Where("project_id = ?", projectID).
		Count(&widgetCount)
	status.WidgetConfigured = widgetCount > 0

	// Products count
	var productsCount int64
	r.db.WithContext(ctx).
		Table("products").
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		Count(&productsCount)
	status.ProductsCount = int(productsCount)

	// Has domain configured (means user viewed install code)
	var domainCount int64
	r.db.WithContext(ctx).
		Table("project_domains").
		Where("project_id = ?", projectID).
		Count(&domainCount)
	status.HasDomain = domainCount > 0

	// First try-on
	var tryOnCount int64
	r.db.WithContext(ctx).
		Table("lead_try_ons").
		Joins("JOIN leads ON leads.id = lead_try_ons.lead_id").
		Where("leads.project_id = ?", projectID).
		Count(&tryOnCount)
	status.FirstTryOn = tryOnCount > 0

	return status, nil
}
