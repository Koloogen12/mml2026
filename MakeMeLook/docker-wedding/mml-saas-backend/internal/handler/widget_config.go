package handler

import (
	"errors"
	"net/http"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/service"
)

type WidgetConfigHandler struct {
	widgetConfigService *service.WidgetConfigService
}

func NewWidgetConfig(svc *service.WidgetConfigService) *WidgetConfigHandler {
	return &WidgetConfigHandler{widgetConfigService: svc}
}

// GET /api/v1/projects/:id/widget-config
func (h *WidgetConfigHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.widgetConfigService.GetOrCreate(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// PUT /api/v1/projects/:id/widget-config
func (h *WidgetConfigHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	var req dto.UpdateWidgetConfigRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.widgetConfigService.Update(r.Context(), userID, projectID, req)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/:id/widget-config/presets
func (h *WidgetConfigHandler) GetPresets(w http.ResponseWriter, r *http.Request) {
	_, _, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	WriteJSON(w, http.StatusOK, h.widgetConfigService.GetPresets())
}

// POST /api/v1/projects/:id/widget-config/apply-preset
func (h *WidgetConfigHandler) ApplyPreset(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	var req dto.ApplyPresetRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.widgetConfigService.ApplyPreset(r.Context(), userID, projectID, req.PresetID)
	if err != nil {
		if errors.Is(err, service.ErrPresetNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "Preset not found")
			return
		}
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// POST /api/v1/projects/:id/widget-config/logo
func (h *WidgetConfigHandler) UploadLogo(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid multipart form")
		return
	}

	file, filename, size, cleanup, err := parseFile(r, "logo", true)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Logo file is required")
		return
	}
	defer cleanup()

	resp, err := h.widgetConfigService.UploadLogo(r.Context(), userID, projectID, file, filename, size)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// DELETE /api/v1/projects/:id/widget-config/logo
func (h *WidgetConfigHandler) DeleteLogo(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.widgetConfigService.DeleteLogo(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}
