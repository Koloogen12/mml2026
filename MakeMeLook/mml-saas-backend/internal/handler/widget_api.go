package handler

import (
	"errors"
	"net/http"

	"mml-saas-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type WidgetAPIHandler struct {
	svc *service.WidgetAPIService
}

func NewWidgetAPI(svc *service.WidgetAPIService) *WidgetAPIHandler {
	return &WidgetAPIHandler{svc: svc}
}

// GetConfig handles GET /api/widget/v1/config/{projectId}
func (h *WidgetAPIHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	projectIDStr := chi.URLParam(r, "projectId")

	projectPublicID, err := uuid.Parse(projectIDStr)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid project ID")
		return
	}

	resp, err := h.svc.GetConfig(r.Context(), projectPublicID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrProjectNotFound):
			WriteError(w, http.StatusNotFound, "not_found", "Project not found")
		case errors.Is(err, service.ErrDomainNotAllowed):
			WriteError(w, http.StatusForbidden, "domain_not_allowed", "This domain is not authorized to use this widget")
		case errors.Is(err, service.ErrWidgetConfigNotFound):
			WriteError(w, http.StatusNotFound, "not_found", "Widget not configured")
		default:
			WriteError(w, http.StatusInternalServerError, "internal_error", "Failed to load widget configuration")
		}
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}
