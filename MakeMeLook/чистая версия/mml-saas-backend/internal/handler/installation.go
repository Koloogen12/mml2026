package handler

import (
	"fmt"
	"net/http"

	"mml-saas-backend/internal/service"
)

type InstallationHandler struct {
	service *service.InstallationService
}

func NewInstallation(svc *service.InstallationService) *InstallationHandler {
	return &InstallationHandler{service: svc}
}

// GET /api/v1/projects/:id/widget-code
func (h *InstallationHandler) GetWidgetCode(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.service.GetWidgetCode(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/:id/installation/readiness
func (h *InstallationHandler) GetReadiness(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.service.GetReadiness(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// POST /api/v1/projects/:id/diagnostics/run
func (h *InstallationHandler) RunDiagnostics(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.service.RunDiagnostics(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/:id/diagnostics
func (h *InstallationHandler) GetDiagnostics(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.service.GetDiagnostics(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/:id/addons/cscart
func (h *InstallationHandler) DownloadCSCartAddon(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	data, err := h.service.DownloadCSCartAddon(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/gzip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"makemelook.tgz\""))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	w.WriteHeader(http.StatusOK)
	w.Write(data) //nolint:errcheck
}
