package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"

	"github.com/lib/pq"
)

var (
	ErrProjectNotFound       = errors.New("project not found")
	ErrUnauthorized          = errors.New("unauthorized")
	ErrDomainExists          = errors.New("domain already exists")
	ErrCannotDeleteLocalhost = errors.New("localhost domain cannot be deleted")
	ErrLeadNotFound          = errors.New("lead not found")
)

const (
	maxLogoSize = 2 * 1024 * 1024 // 2MB
	logoBucket  = "project-logos"
)

var allowedLogoExts = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".webp": "image/webp",
	".svg":  "image/svg+xml",
}

type ProjectService struct {
	repos   *repository.Repositories
	cfg     *config.Config
	storage *StorageService
}

func NewProject(repos *repository.Repositories, cfg *config.Config, storage *StorageService) *ProjectService {
	return &ProjectService{
		repos:   repos,
		cfg:     cfg,
		storage: storage,
	}
}

// Create project (with auto-localhost domain)
func (s *ProjectService) CreateProject(ctx context.Context, ownerID int, req dto.CreateProjectRequest, logoFile io.Reader, logoFilename string, logoSize int64) (*dto.ProjectResponse, error) {
	// Upload logo (optional)
	var logoKey *string
	if logoFile != nil {
		key, err := s.uploadLogo(ctx, logoFile, logoFilename, logoSize)
		if err != nil {
			return nil, fmt.Errorf("upload logo: %w", err)
		}
		logoKey = &key
	}

	var project *model.Project

	// Create project + localhost domain in transaction
	err := s.repos.Transaction(func(txRepos *repository.Repositories) error {
		project = &model.Project{
			OwnerID:        ownerID,
			Name:           req.Name,
			SiteURL:        req.SiteURL,
			Category:       req.Category,
			TargetAudience: pq.StringArray(req.TargetAudience),
			Description:    req.Description,
			LogoKey:        logoKey,
			Status:         model.ProjectStatusDraft,
		}

		if err := txRepos.Project.Create(ctx, project); err != nil {
			return fmt.Errorf("create project: %w", err)
		}

		// Auto-create localhost domain
		localhost := &model.ProjectDomain{
			ProjectID:  project.ID,
			Domain:     "localhost",
			IsVerified: true,
		}
		if err := txRepos.ProjectDomain.Create(ctx, localhost); err != nil {
			return fmt.Errorf("create localhost domain: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.projectToDTO(project), nil
}

// Get project (with ownership check)
func (s *ProjectService) GetProject(ctx context.Context, userID int, projectID int) (*dto.ProjectResponse, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}
	return s.projectToDTO(project), nil
}

// List projects
func (s *ProjectService) ListProjects(ctx context.Context, userID int, offset, limit int) (*dto.ProjectListResponse, error) {
	projects, err := s.repos.Project.ListByOwnerID(ctx, userID, offset, limit)
	if err != nil {
		return nil, fmt.Errorf("list projects: %w", err)
	}

	total, err := s.repos.Project.CountByOwnerID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("count projects: %w", err)
	}

	dtos := make([]dto.ProjectResponse, len(projects))
	for i, p := range projects {
		dtos[i] = *s.projectToDTO(p)
	}

	return &dto.ProjectListResponse{
		Projects: dtos,
		Total:    int(total),
	}, nil
}

// Update project (atomic with ownership check)
func (s *ProjectService) UpdateProject(ctx context.Context, userID int, projectID int, req dto.UpdateProjectRequest, logoFile io.Reader, logoFilename string, logoSize int64) (*dto.ProjectResponse, error) {
	// Upload new logo (optional)
	var logoKey *string
	if logoFile != nil {
		key, err := s.uploadLogo(ctx, logoFile, logoFilename, logoSize)
		if err != nil {
			return nil, fmt.Errorf("upload logo: %w", err)
		}
		logoKey = &key
	}

	// Update (atomic with ownership check)
	data := &repository.UpdateProjectData{
		Name:           &req.Name,
		SiteURL:        &req.SiteURL,
		Category:       req.Category,
		TargetAudience: pq.StringArray(req.TargetAudience),
		Description:    req.Description,
	}
	if logoKey != nil {
		data.LogoKey = logoKey
	}

	affected, err := s.repos.Project.Update(ctx, projectID, userID, data)
	if err != nil {
		return nil, fmt.Errorf("update project: %w", err)
	}
	if affected == 0 {
		return nil, ErrProjectNotFound
	}

	// Re-fetch updated project
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get updated project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	return s.projectToDTO(project), nil
}

// Delete project (atomic with ownership check)
func (s *ProjectService) DeleteProject(ctx context.Context, userID int, projectID int) error {
	affected, err := s.repos.Project.Delete(ctx, projectID, userID)
	if err != nil {
		return fmt.Errorf("delete project: %w", err)
	}
	if affected == 0 {
		return ErrProjectNotFound
	}
	return nil
}

// Update status (atomic with ownership check)
func (s *ProjectService) UpdateStatus(ctx context.Context, userID int, projectID int, req dto.UpdateProjectStatusRequest) (*dto.ProjectResponse, error) {
	status := model.ProjectStatus(req.Status)
	affected, err := s.repos.Project.Update(ctx, projectID, userID, &repository.UpdateProjectData{
		Status: &status,
	})
	if err != nil {
		return nil, fmt.Errorf("update status: %w", err)
	}
	if affected == 0 {
		return nil, ErrProjectNotFound
	}

	// Re-fetch updated project
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get updated project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	return s.projectToDTO(project), nil
}

// Get stats
func (s *ProjectService) GetStats(ctx context.Context, userID int, projectID int) (*dto.ProjectStatsResponse, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	stats, err := s.repos.Project.GetStats(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("get stats: %w", err)
	}

	conversionRate := 0.0
	if stats.TryOns > 0 {
		conversionRate = float64(stats.Conversions) / float64(stats.TryOns) * 100
	}

	return &dto.ProjectStatsResponse{
		TryOns:         stats.TryOns,
		Leads:          stats.Leads,
		Conversions:    stats.Conversions,
		ConversionRate: conversionRate,
	}, nil
}

// Get onboarding status
func (s *ProjectService) GetOnboardingStatus(ctx context.Context, userID int, projectID int) (*dto.OnboardingStatusResponse, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	status, err := s.repos.Project.GetOnboardingStatus(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("get onboarding status: %w", err)
	}

	return &dto.OnboardingStatusResponse{
		ProjectCreated:   true,
		WidgetConfigured: status.WidgetConfigured,
		ProductsAdded:    status.ProductsCount >= 1,
		CodeViewed:       status.HasDomain,
		FirstTryOn:       status.FirstTryOn,
	}, nil
}

func (s *ProjectService) GetRecentProjects(ctx context.Context, userID int) ([]dto.ProjectResponse, error) {
	projects, err := s.repos.Project.ListByOwnerID(ctx, userID, 0, 4)
	if err != nil {
		return nil, fmt.Errorf("list recent projects: %w", err)
	}

	dtos := make([]dto.ProjectResponse, len(projects))
	for i, p := range projects {
		dtos[i] = *s.projectToDTO(p)
	}
	return dtos, nil
}

func (s *ProjectService) GetDashboardStats(ctx context.Context, userID int) (*dto.DashboardStatsResponse, error) {
	total, err := s.repos.Project.CountByOwnerID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("count projects: %w", err)
	}

	activeWidgets, err := s.repos.WidgetConfig.CountActiveByOwnerID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("count active widgets: %w", err)
	}

	totalLeads, err := s.repos.Lead.CountByOwnerProjects(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("count leads: %w", err)
	}

	// Leads trend: compare last 30 days vs previous 30 days
	leadsLast30, err := s.repos.Lead.CountByOwnerProjectsInPeriod(ctx, userID, "30 days")
	if err != nil {
		return nil, fmt.Errorf("count leads last 30: %w", err)
	}
	leadsPrev30, err := s.repos.Lead.CountByOwnerProjectsInPeriod(ctx, userID, "60 days")
	if err != nil {
		return nil, fmt.Errorf("count leads prev 30: %w", err)
	}
	leadsPrev30Only := leadsPrev30 - leadsLast30
	var leadsTrend float64
	if leadsPrev30Only > 0 {
		leadsTrend = float64(leadsLast30-leadsPrev30Only) / float64(leadsPrev30Only) * 100
	}

	// Conversion rate: cart items / try-ons
	totalTryOns, err := s.repos.Lead.CountTryOnsByOwnerProjects(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("count try-ons: %w", err)
	}
	totalCartItems, err := s.repos.Lead.CountCartItemsByOwnerProjects(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("count cart items: %w", err)
	}
	var conversionRate float64
	if totalTryOns > 0 {
		conversionRate = float64(totalCartItems) / float64(totalTryOns) * 100
	}

	// Conversion rate trend: compare last 30 days vs previous 30 days
	tryOnsLast30, err := s.repos.Lead.CountTryOnsByOwnerProjectsInPeriod(ctx, userID, "30 days")
	if err != nil {
		return nil, fmt.Errorf("count try-ons last 30: %w", err)
	}
	cartLast30, err := s.repos.Lead.CountCartItemsByOwnerProjectsInPeriod(ctx, userID, "30 days")
	if err != nil {
		return nil, fmt.Errorf("count cart items last 30: %w", err)
	}
	tryOnsPrev60, err := s.repos.Lead.CountTryOnsByOwnerProjectsInPeriod(ctx, userID, "60 days")
	if err != nil {
		return nil, fmt.Errorf("count try-ons prev 60: %w", err)
	}
	cartPrev60, err := s.repos.Lead.CountCartItemsByOwnerProjectsInPeriod(ctx, userID, "60 days")
	if err != nil {
		return nil, fmt.Errorf("count cart items prev 60: %w", err)
	}
	tryOnsPrevOnly := tryOnsPrev60 - tryOnsLast30
	cartPrevOnly := cartPrev60 - cartLast30
	var convRateLast30 float64
	if tryOnsLast30 > 0 {
		convRateLast30 = float64(cartLast30) / float64(tryOnsLast30) * 100
	}
	var convRatePrev30 float64
	if tryOnsPrevOnly > 0 {
		convRatePrev30 = float64(cartPrevOnly) / float64(tryOnsPrevOnly) * 100
	}
	var conversionRateTrend float64
	if convRatePrev30 > 0 {
		conversionRateTrend = (convRateLast30 - convRatePrev30) / convRatePrev30 * 100
	}

	return &dto.DashboardStatsResponse{
		TotalProjects:       int(total),
		TotalLeads:          int(totalLeads),
		LeadsTrend:          leadsTrend,
		ConversionRate:      conversionRate,
		ConversionRateTrend: conversionRateTrend,
		ActiveWidgets:       int(activeWidgets),
	}, nil
}

// Helpers
func (s *ProjectService) projectToDTO(p *model.Project) *dto.ProjectResponse {
	var logoURL *string
	if p.LogoKey != nil && *p.LogoKey != "" {
		url := s.storage.GetObjectURL(logoBucket, *p.LogoKey)
		logoURL = &url
	}

	return &dto.ProjectResponse{
		ID:                  p.ID,
		PublicID:            p.PublicID.String(),
		Name:                p.Name,
		SiteURL:             p.SiteURL,
		Category:            p.Category,
		TargetAudience:      []string(p.TargetAudience),
		Description:         p.Description,
		LogoURL:             logoURL,
		Status:              string(p.Status),
		OnboardingCompleted: p.OnboardingCompleted,
		CreatedAt:           p.CreatedAt.Format(time.RFC3339),
		UpdatedAt:           p.UpdatedAt.Format(time.RFC3339),
	}
}

func (s *ProjectService) uploadLogo(ctx context.Context, file io.Reader, filename string, size int64) (string, error) {
	return s.storage.UploadImage(ctx, logoBucket, file, filename, size, maxLogoSize, allowedLogoExts)
}
