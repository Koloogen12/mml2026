package dto

type CreateProjectRequest struct {
	Name           string   `json:"name" validate:"required,min=2,max=255"`
	SiteURL        string   `json:"site_url" validate:"required,url,max=255"`
	Category       *string  `json:"category" validate:"omitempty,oneof=clothing shoes accessories multi"`
	TargetAudience []string `json:"target_audience" validate:"required,min=1,dive,oneof=female male kids unisex"`
	Description    *string  `json:"description" validate:"omitempty,max=1000"`
}

type UpdateProjectRequest struct {
	Name           string   `json:"name" validate:"required,min=2,max=255"`
	SiteURL        string   `json:"site_url" validate:"required,url,max=255"`
	Category       *string  `json:"category" validate:"omitempty,oneof=clothing shoes accessories multi"`
	TargetAudience []string `json:"target_audience" validate:"required,min=1,dive,oneof=female male kids unisex"`
	Description    *string  `json:"description" validate:"omitempty,max=1000"`
}

type UpdateProjectStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=draft active paused"`
}

type ProjectResponse struct {
	ID                  int      `json:"id"`
	PublicID            string   `json:"public_id"`
	Name                string   `json:"name"`
	SiteURL             string   `json:"site_url"`
	Category            *string  `json:"category"`
	TargetAudience      []string `json:"target_audience"`
	Description         *string  `json:"description"`
	LogoURL             *string  `json:"logo_url"`
	Status              string   `json:"status"`
	OnboardingCompleted bool     `json:"onboarding_completed"`
	CreatedAt           string   `json:"created_at"`
	UpdatedAt           string   `json:"updated_at"`
}

type ProjectListResponse struct {
	Projects []ProjectResponse `json:"projects"`
	Total    int               `json:"total"`
}

type ProjectStatsResponse struct {
	TryOns         int     `json:"try_ons"`
	Leads          int     `json:"leads"`
	Conversions    int     `json:"conversions"`
	ConversionRate float64 `json:"conversion_rate"`
}

type OnboardingStatusResponse struct {
	ProjectCreated   bool `json:"project_created"`
	WidgetConfigured bool `json:"widget_configured"`
	ProductsAdded    bool `json:"products_added"`
	CodeViewed       bool `json:"code_viewed"`
	FirstTryOn       bool `json:"first_try_on"`
}

type DashboardStatsResponse struct {
	TotalProjects       int     `json:"total_projects"`
	TotalLeads          int     `json:"total_leads"`
	LeadsTrend          float64 `json:"leads_trend"`
	ConversionRate      float64 `json:"conversion_rate"`
	ConversionRateTrend float64 `json:"conversion_rate_trend"`
	ActiveWidgets       int     `json:"active_widgets"`
}
