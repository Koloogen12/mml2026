package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/service"
	"mml-saas-backend/pkg/validator"

	"github.com/go-chi/chi/v5"
)

type ProjectHandler struct {
	projectService       *service.ProjectService
	projectDomainService *service.ProjectDomainService
	widgetConfigService  *service.WidgetConfigService
}

func NewProject(projectSvc *service.ProjectService, domainSvc *service.ProjectDomainService, widgetConfigSvc *service.WidgetConfigService) *ProjectHandler {
	return &ProjectHandler{
		projectService:       projectSvc,
		projectDomainService: domainSvc,
		widgetConfigService:  widgetConfigSvc,
	}
}

// POST /api/v1/projects
func (h *ProjectHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid multipart form")
		return
	}

	// Parse target_audience from JSON string in form
	var targetAudience []string
	if taStr := r.FormValue("target_audience"); taStr != "" {
		if err := json.Unmarshal([]byte(taStr), &targetAudience); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid target_audience format")
			return
		}
	}

	req := dto.CreateProjectRequest{
		Name:           r.FormValue("name"),
		SiteURL:        r.FormValue("site_url"),
		Category:       strPtrFromForm(r, "category"),
		TargetAudience: targetAudience,
		Description:    strPtrFromForm(r, "description"),
	}

	if err := validator.Struct(req); err != nil {
		WriteError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Handle logo upload (optional)
	logo, logoFilename, logoSize, cleanup, err := parseFile(r, "logo", false)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid logo file")
		return
	}
	defer cleanup()

	resp, err := h.projectService.CreateProject(r.Context(), userID, req, logo, logoFilename, logoSize)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// GET /api/v1/projects
func (h *ProjectHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	offsetStr := r.URL.Query().Get("offset")
	offset := 0
	if offsetStr != "" {
		var parseErr error
		offset, parseErr = strconv.Atoi(offsetStr)
		if parseErr != nil || offset < 0 {
			WriteError(w, http.StatusBadRequest, "invalid_parameter", "offset must be a non-negative integer")
			return
		}
	}
	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		var parseErr error
		limit, parseErr = strconv.Atoi(limitStr)
		if parseErr != nil || limit <= 0 {
			WriteError(w, http.StatusBadRequest, "invalid_parameter", "limit must be a positive integer")
			return
		}
	}
	if limit > 200 {
		limit = 200
	}

	resp, err := h.projectService.ListProjects(r.Context(), userID, offset, limit)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/:id
func (h *ProjectHandler) GetProject(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.projectService.GetProject(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// PUT /api/v1/projects/:id
func (h *ProjectHandler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid multipart form")
		return
	}

	// Parse target_audience from JSON string in form
	var targetAudience []string
	if taStr := r.FormValue("target_audience"); taStr != "" {
		if err := json.Unmarshal([]byte(taStr), &targetAudience); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid target_audience format")
			return
		}
	}

	req := dto.UpdateProjectRequest{
		Name:           r.FormValue("name"),
		SiteURL:        r.FormValue("site_url"),
		Category:       strPtrFromForm(r, "category"),
		TargetAudience: targetAudience,
		Description:    strPtrFromForm(r, "description"),
	}

	if err := validator.Struct(req); err != nil {
		WriteError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Handle logo upload (optional)
	logo, logoFilename, logoSize, cleanup, err := parseFile(r, "logo", false)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid logo file")
		return
	}
	defer cleanup()

	resp, err := h.projectService.UpdateProject(r.Context(), userID, projectID, req, logo, logoFilename, logoSize)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// DELETE /api/v1/projects/:id
func (h *ProjectHandler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	if err := h.projectService.DeleteProject(r.Context(), userID, projectID); err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Project deleted"})
}

// PUT /api/v1/projects/:id/status
func (h *ProjectHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	var req dto.UpdateProjectStatusRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.projectService.UpdateStatus(r.Context(), userID, projectID, req)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/:id/stats
func (h *ProjectHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.projectService.GetStats(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/:id/onboarding
func (h *ProjectHandler) GetOnboardingStatus(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.projectService.GetOnboardingStatus(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// Domains

// GET /api/v1/projects/:id/domains
func (h *ProjectHandler) ListDomains(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.projectDomainService.ListDomains(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// POST /api/v1/projects/:id/domains
func (h *ProjectHandler) AddDomain(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	var req dto.AddDomainRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.projectDomainService.AddDomain(r.Context(), userID, projectID, req)
	if err != nil {
		if err == service.ErrDomainExists {
			WriteError(w, http.StatusConflict, "domain_exists", "Domain already exists")
			return
		}
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// DELETE /api/v1/projects/:id/domains/:domainId
func (h *ProjectHandler) DeleteDomain(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	domainID, err := strconv.Atoi(chi.URLParam(r, "domainId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid domain ID")
		return
	}

	if err := h.projectDomainService.DeleteDomain(r.Context(), userID, projectID, domainID); err != nil {
		if err == service.ErrCannotDeleteLocalhost {
			WriteError(w, http.StatusForbidden, "forbidden", "Cannot delete localhost domain")
			return
		}
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Domain deleted"})
}

// GET /api/v1/dashboard/recent-projects
func (h *ProjectHandler) GetRecentProjects(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	resp, err := h.projectService.GetRecentProjects(r.Context(), userID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/dashboard/stats
func (h *ProjectHandler) GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return
	}

	resp, err := h.projectService.GetDashboardStats(r.Context(), userID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// mapServiceError maps service layer errors to HTTP responses
func mapServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrProjectNotFound):
		WriteError(w, http.StatusNotFound, "not_found", "Project not found")
	case errors.Is(err, service.ErrUnauthorized):
		WriteError(w, http.StatusForbidden, "forbidden", "Access denied")
	case errors.Is(err, service.ErrDomainExists):
		WriteError(w, http.StatusConflict, "domain_exists", "Domain already exists")
	case errors.Is(err, service.ErrCannotDeleteLocalhost):
		WriteError(w, http.StatusForbidden, "forbidden", "Cannot delete localhost domain")
	case errors.Is(err, service.ErrProductNotFound):
		WriteError(w, http.StatusNotFound, "not_found", "Product not found")
	case errors.Is(err, service.ErrPhotoNotFound):
		WriteError(w, http.StatusNotFound, "not_found", "Photo not found")
	case errors.Is(err, service.ErrGroupNotFound):
		WriteError(w, http.StatusNotFound, "not_found", "Product group not found")
	case errors.Is(err, service.ErrGroupRequired):
		WriteError(w, http.StatusBadRequest, "validation_error", service.ErrGroupRequired.Error())
	case errors.Is(err, service.ErrUnsupportedFileType):
		WriteError(w, http.StatusBadRequest, "invalid_file_type", service.ErrUnsupportedFileType.Error())
	case errors.Is(err, service.ErrFileTooLarge):
		WriteError(w, http.StatusBadRequest, "file_too_large", service.ErrFileTooLarge.Error())
	case errors.Is(err, service.ErrImportNotFound):
		WriteError(w, http.StatusNotFound, "not_found", "Import job not found")
	case errors.Is(err, service.ErrStoreNotFound):
		WriteError(w, http.StatusNotFound, "not_found", "Integration not found")
	case errors.Is(err, service.ErrSyncRunning):
		WriteError(w, http.StatusConflict, "sync_running", "Sync is already running")
	case errors.Is(err, service.ErrLeadNotFound):
		WriteError(w, http.StatusNotFound, "not_found", "Lead not found")
	default:
		WriteError(w, http.StatusInternalServerError, "internal_error", err.Error())
	}
}
