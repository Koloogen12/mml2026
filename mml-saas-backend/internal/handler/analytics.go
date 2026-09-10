package handler

import (
	"net/http"

	"mml-saas-backend/internal/service"
)

type AnalyticsHandler struct {
	analyticsSvc *service.AnalyticsService
}

func NewAnalytics(analyticsSvc *service.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{analyticsSvc: analyticsSvc}
}

func parsePeriod(r *http.Request) string {
	p := r.URL.Query().Get("period")
	switch p {
	case "1d", "7d", "30d", "90d":
		return p
	default:
		return "30d"
	}
}

// GET /api/v1/projects/{id}/analytics/summary?period=30d
func (h *AnalyticsHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.analyticsSvc.GetSummary(r.Context(), userID, projectID, parsePeriod(r))
	if err != nil {
		mapServiceError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/analytics/funnel?period=30d
func (h *AnalyticsHandler) GetFunnel(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.analyticsSvc.GetFunnel(r.Context(), userID, projectID, parsePeriod(r))
	if err != nil {
		mapServiceError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/analytics/trends?period=30d&metric=tryon
func (h *AnalyticsHandler) GetTrends(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	metric := r.URL.Query().Get("metric")
	resp, err := h.analyticsSvc.GetTrends(r.Context(), userID, projectID, parsePeriod(r), metric)
	if err != nil {
		mapServiceError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/analytics/top-products?period=30d&sort_by=tryon
func (h *AnalyticsHandler) GetTopProducts(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	sortBy := r.URL.Query().Get("sort_by")
	resp, err := h.analyticsSvc.GetTopProducts(r.Context(), userID, projectID, parsePeriod(r), sortBy)
	if err != nil {
		mapServiceError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/analytics/audience?period=30d
func (h *AnalyticsHandler) GetAudience(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.analyticsSvc.GetAudience(r.Context(), userID, projectID, parsePeriod(r))
	if err != nil {
		mapServiceError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}
