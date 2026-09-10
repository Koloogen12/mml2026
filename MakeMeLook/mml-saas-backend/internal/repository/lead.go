package repository

import (
	"context"

	"mml-saas-backend/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LeadRepository struct {
	db *gorm.DB
}

func newLeadRepository(db *gorm.DB) *LeadRepository {
	return &LeadRepository{db: db}
}

func (r *LeadRepository) Create(ctx context.Context, lead *model.Lead) error {
	return dbErr(r.db.WithContext(ctx).Create(lead).Error)
}

func (r *LeadRepository) GetBySessionToken(ctx context.Context, token uuid.UUID) (*model.Lead, error) {
	var lead model.Lead
	err := r.db.WithContext(ctx).
		Where("session_token = ? AND deleted_at IS NULL", token).
		First(&lead).Error
	return queryResult(&lead, err)
}

func (r *LeadRepository) GetByID(ctx context.Context, id int64) (*model.Lead, error) {
	var lead model.Lead
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&lead).Error
	return queryResult(&lead, err)
}

func (r *LeadRepository) Update(ctx context.Context, lead *model.Lead) error {
	return dbErr(r.db.WithContext(ctx).Save(lead).Error)
}

// UpdateParams updates only body parameters and visit tracking fields.
func (r *LeadRepository) UpdateParams(ctx context.Context, id int64, updates map[string]any) error {
	return dbErr(r.db.WithContext(ctx).
		Model(&model.Lead{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates).Error)
}

// CountTryOnsThisMonth counts try-ons for a project in the current calendar month.
func (r *LeadRepository) CountTryOnsThisMonth(ctx context.Context, projectID int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.LeadTryOn{}).
		Joins("JOIN leads ON leads.id = lead_try_ons.lead_id").
		Where("leads.project_id = ? AND leads.deleted_at IS NULL AND lead_try_ons.deleted_at IS NULL", projectID).
		Where("lead_try_ons.created_at >= date_trunc('month', CURRENT_TIMESTAMP)").
		Count(&count).Error
	return count, dbErr(err)
}

// CountTryOnsThisMonthByLead counts try-ons for a specific lead in the current calendar month.
// Error-status records are excluded so failed attempts don't consume the user's quota.
func (r *LeadRepository) CountTryOnsThisMonthByLead(ctx context.Context, leadID int64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.LeadTryOn{}).
		Where("lead_id = ? AND deleted_at IS NULL AND status != ?", leadID, model.TryOnStatusError).
		Where("created_at >= date_trunc('month', CURRENT_TIMESTAMP)").
		Count(&count).Error
	return count, dbErr(err)
}

// ── Admin methods (SaaS cabinet) ────────────────────────────────────────────

// LeadListFilter holds filters for listing leads in the admin panel.
type LeadListFilter struct {
	ProjectID int
	Search    string // search by email
	Gender    string
	Size      string
	Period    string // today, 7d, 30d, 90d
	SortBy    string // created_at, visit_count, tryon_count
	SortOrder string // asc, desc
	Offset    int
	Limit     int
}

func (r *LeadRepository) applyAdminFilters(q *gorm.DB, f LeadListFilter) *gorm.DB {
	q = q.Where("leads.project_id = ? AND leads.deleted_at IS NULL", f.ProjectID)
	if f.Search != "" {
		q = q.Where("leads.email ILIKE ?", "%"+f.Search+"%")
	}
	if f.Gender != "" {
		q = q.Where("leads.gender = ?", f.Gender)
	}
	if f.Size != "" {
		q = q.Where("leads.size = ?", f.Size)
	}
	switch f.Period {
	case "today":
		q = q.Where("leads.created_at >= date_trunc('day', CURRENT_TIMESTAMP)")
	case "7d":
		q = q.Where("leads.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'")
	case "30d":
		q = q.Where("leads.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'")
	case "90d":
		q = q.Where("leads.created_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'")
	}
	return q
}

// LeadWithTryOnCount is a lead with a precomputed try-on count.
type LeadWithTryOnCount struct {
	model.Lead
	TryOnCount int `gorm:"column:tryon_count"`
}

// ListByProjectID returns leads for a project with filters and pagination.
func (r *LeadRepository) ListByProjectID(ctx context.Context, f LeadListFilter) ([]*LeadWithTryOnCount, error) {
	var leads []*LeadWithTryOnCount

	q := r.db.WithContext(ctx).
		Table("leads").
		Select("leads.*, (SELECT COUNT(*) FROM lead_try_ons WHERE lead_try_ons.lead_id = leads.id AND lead_try_ons.deleted_at IS NULL) AS tryon_count")

	q = r.applyAdminFilters(q, f)

	orderCol := "leads.created_at"
	orderDir := "DESC"
	switch f.SortBy {
	case "visit_count":
		orderCol = "leads.visit_count"
	case "tryon_count":
		orderCol = "tryon_count"
	}
	if f.SortOrder == "asc" {
		orderDir = "ASC"
	}
	q = q.Order(orderCol + " " + orderDir)

	err := q.Offset(f.Offset).Limit(f.Limit).Find(&leads).Error
	return leads, dbErr(err)
}

// CountByProjectID returns the total number of leads matching filters.
func (r *LeadRepository) CountByProjectID(ctx context.Context, f LeadListFilter) (int64, error) {
	var count int64
	q := r.applyAdminFilters(r.db.WithContext(ctx).Model(&model.Lead{}), f)
	return count, dbErr(q.Count(&count).Error)
}

// GetDetailByID returns a lead with all associations for the detail page.
func (r *LeadRepository) GetDetailByID(ctx context.Context, id int64, projectID int) (*model.Lead, error) {
	var lead model.Lead
	err := r.db.WithContext(ctx).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("created_at DESC")
		}).
		Preload("Favorites", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("created_at DESC")
		}).
		Preload("CartItems", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("created_at DESC").Preload("Product")
		}).
		Where("id = ? AND project_id = ? AND deleted_at IS NULL", id, projectID).
		First(&lead).Error
	return queryResult(&lead, err)
}

// CountByOwnerProjects counts total leads across all projects of a user.
func (r *LeadRepository) CountByOwnerProjects(ctx context.Context, ownerID int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.Lead{}).
		Joins("JOIN projects ON projects.id = leads.project_id").
		Where("projects.owner_id = ? AND projects.deleted_at IS NULL AND leads.deleted_at IS NULL", ownerID).
		Count(&count).Error
	return count, dbErr(err)
}

// CountByOwnerProjectsInPeriod counts leads created in a time period across all owner's projects.
func (r *LeadRepository) CountByOwnerProjectsInPeriod(ctx context.Context, ownerID int, interval string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.Lead{}).
		Joins("JOIN projects ON projects.id = leads.project_id").
		Where("projects.owner_id = ? AND projects.deleted_at IS NULL AND leads.deleted_at IS NULL", ownerID).
		Where("leads.created_at >= CURRENT_TIMESTAMP - CAST(? AS INTERVAL)", interval).
		Count(&count).Error
	return count, dbErr(err)
}

// CountTryOnsByOwnerProjects counts total try-ons across all owner's projects.
func (r *LeadRepository) CountTryOnsByOwnerProjects(ctx context.Context, ownerID int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.LeadTryOn{}).
		Joins("JOIN leads ON leads.id = lead_try_ons.lead_id").
		Joins("JOIN projects ON projects.id = leads.project_id").
		Where("projects.owner_id = ? AND projects.deleted_at IS NULL AND leads.deleted_at IS NULL AND lead_try_ons.deleted_at IS NULL", ownerID).
		Count(&count).Error
	return count, dbErr(err)
}

// CountCartItemsByOwnerProjects counts total cart items (conversions) across all owner's projects.
func (r *LeadRepository) CountCartItemsByOwnerProjects(ctx context.Context, ownerID int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.LeadCartItem{}).
		Joins("JOIN leads ON leads.id = lead_cart_items.lead_id").
		Joins("JOIN projects ON projects.id = leads.project_id").
		Where("projects.owner_id = ? AND projects.deleted_at IS NULL AND leads.deleted_at IS NULL AND lead_cart_items.deleted_at IS NULL", ownerID).
		Count(&count).Error
	return count, dbErr(err)
}

// CountTryOnsByOwnerProjectsInPeriod counts try-ons created in a time period across all owner's projects.
func (r *LeadRepository) CountTryOnsByOwnerProjectsInPeriod(ctx context.Context, ownerID int, interval string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.LeadTryOn{}).
		Joins("JOIN leads ON leads.id = lead_try_ons.lead_id").
		Joins("JOIN projects ON projects.id = leads.project_id").
		Where("projects.owner_id = ? AND projects.deleted_at IS NULL AND leads.deleted_at IS NULL AND lead_try_ons.deleted_at IS NULL", ownerID).
		Where("lead_try_ons.created_at >= CURRENT_TIMESTAMP - CAST(? AS INTERVAL)", interval).
		Count(&count).Error
	return count, dbErr(err)
}

// CountCartItemsByOwnerProjectsInPeriod counts cart items created in a time period across all owner's projects.
func (r *LeadRepository) CountCartItemsByOwnerProjectsInPeriod(ctx context.Context, ownerID int, interval string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.LeadCartItem{}).
		Joins("JOIN leads ON leads.id = lead_cart_items.lead_id").
		Joins("JOIN projects ON projects.id = leads.project_id").
		Where("projects.owner_id = ? AND projects.deleted_at IS NULL AND leads.deleted_at IS NULL AND lead_cart_items.deleted_at IS NULL", ownerID).
		Where("lead_cart_items.created_at >= CURRENT_TIMESTAMP - CAST(? AS INTERVAL)", interval).
		Count(&count).Error
	return count, dbErr(err)
}
