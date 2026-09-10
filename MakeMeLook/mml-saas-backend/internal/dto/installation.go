package dto

// GET /api/v1/projects/:id/widget-code
type WidgetCodeResponse struct {
	Snippet   string `json:"snippet"`
	ProjectID string `json:"project_id"`
	CDNUrl    string `json:"cdn_url"`
}

// GET /api/v1/projects/:id/installation/readiness
type ReadinessResponse struct {
	WidgetConfigured bool `json:"widget_configured"`
	ProductsCount    int  `json:"products_count"`
	ActiveProducts   int  `json:"active_products"`
	HasDomain        bool `json:"has_domain"`
	AllReady         bool `json:"all_ready"`
}

// POST /api/v1/projects/:id/diagnostics/run
// GET /api/v1/projects/:id/diagnostics
type DiagnosticsResponse struct {
	Domains []DomainDiagnostics `json:"domains"`
}

type DomainDiagnostics struct {
	Domain    string            `json:"domain"`
	CheckedAt *string           `json:"checked_at"`
	Status    string            `json:"status"` // pending, ok, warning, error
	Checks    []DiagnosticCheck `json:"checks"`
}

type DiagnosticCheck struct {
	Name    string  `json:"name"`
	Status  string  `json:"status"` // pass, fail, warn, pending
	Message string  `json:"message"`
	Detail  *string `json:"detail,omitempty"`
}
