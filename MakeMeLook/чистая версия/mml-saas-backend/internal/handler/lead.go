package handler

import (
	"net/http"
	"strconv"

	"mml-saas-backend/internal/repository"
	"mml-saas-backend/internal/service"
	"mml-saas-backend/pkg/logger"

	"github.com/go-chi/chi/v5"
)

type LeadHandler struct {
	leadAdminService *service.LeadAdminService
}

func NewLead(leadAdminSvc *service.LeadAdminService) *LeadHandler {
	return &LeadHandler{leadAdminService: leadAdminSvc}
}

// GET /api/v1/projects/{id}/leads
func (h *LeadHandler) ListLeads(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	q := r.URL.Query()

	filter := repository.LeadListFilter{
		Search:    q.Get("search"),
		Gender:    q.Get("gender"),
		Size:      q.Get("size"),
		Period:    q.Get("period"),
		SortBy:    q.Get("sort_by"),
		SortOrder: q.Get("sort_order"),
	}

	if offsetStr := q.Get("offset"); offsetStr != "" {
		v, parseErr := strconv.Atoi(offsetStr)
		if parseErr != nil || v < 0 {
			WriteError(w, http.StatusBadRequest, "invalid_parameter", "offset must be a non-negative integer")
			return
		}
		filter.Offset = v
	}
	if limitStr := q.Get("limit"); limitStr != "" {
		v, parseErr := strconv.Atoi(limitStr)
		if parseErr != nil || v <= 0 {
			WriteError(w, http.StatusBadRequest, "invalid_parameter", "limit must be a positive integer")
			return
		}
		filter.Limit = v
	}
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 200 {
		filter.Limit = 200
	}

	resp, err := h.leadAdminService.ListLeads(r.Context(), userID, projectID, filter)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/leads/{leadId}
func (h *LeadHandler) GetLead(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	leadID, err := strconv.ParseInt(chi.URLParam(r, "leadId"), 10, 64)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid lead ID")
		return
	}

	resp, err := h.leadAdminService.GetLeadDetail(r.Context(), userID, projectID, leadID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/leads/{leadId}/tryon-history
func (h *LeadHandler) GetTryOnHistory(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	leadID, err := strconv.ParseInt(chi.URLParam(r, "leadId"), 10, 64)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid lead ID")
		return
	}

	resp, err := h.leadAdminService.GetTryOnHistory(r.Context(), userID, projectID, leadID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// POST /api/v1/projects/{id}/leads/export
func (h *LeadHandler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	q := r.URL.Query()

	filter := repository.LeadListFilter{
		Search: q.Get("search"),
		Gender: q.Get("gender"),
		Size:   q.Get("size"),
		Period: q.Get("period"),
	}

	data, err := h.leadAdminService.ExportCSV(r.Context(), userID, projectID, filter)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=\"leads-export.csv\"")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(data); err != nil {
		logger.Error("handler", "Failed to write CSV response", "error", err)
	}
}
