package handler

import (
	"net/http"
	"strconv"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/service"

	"github.com/go-chi/chi/v5"
)

type EcommerceHandler struct {
	ecommerceSvc *service.EcommerceService
}

func NewEcommerce(ecommerceSvc *service.EcommerceService) *EcommerceHandler {
	return &EcommerceHandler{ecommerceSvc: ecommerceSvc}
}

// POST /api/v1/projects/{id}/integrations
func (h *EcommerceHandler) CreateStore(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	var req dto.CreateEcommerceStoreRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.ecommerceSvc.CreateStore(r.Context(), userID, projectID, req)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// GET /api/v1/projects/{id}/integrations
func (h *EcommerceHandler) ListStores(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.ecommerceSvc.ListStores(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/integrations/{storeId}
func (h *EcommerceHandler) GetStore(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	storeID, err := strconv.Atoi(chi.URLParam(r, "storeId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid store ID")
		return
	}

	resp, err := h.ecommerceSvc.GetStore(r.Context(), userID, projectID, storeID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// PUT /api/v1/projects/{id}/integrations/{storeId}
func (h *EcommerceHandler) UpdateStore(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	storeID, err := strconv.Atoi(chi.URLParam(r, "storeId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid store ID")
		return
	}

	var req dto.UpdateEcommerceStoreRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.ecommerceSvc.UpdateStore(r.Context(), userID, projectID, storeID, req)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// DELETE /api/v1/projects/{id}/integrations/{storeId}
func (h *EcommerceHandler) DeleteStore(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	storeID, err := strconv.Atoi(chi.URLParam(r, "storeId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid store ID")
		return
	}

	if err := h.ecommerceSvc.DeleteStore(r.Context(), userID, projectID, storeID); err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Integration deleted"})
}

// POST /api/v1/projects/{id}/integrations/{storeId}/test
func (h *EcommerceHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	storeID, err := strconv.Atoi(chi.URLParam(r, "storeId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid store ID")
		return
	}

	resp, err := h.ecommerceSvc.TestConnection(r.Context(), userID, projectID, storeID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// POST /api/v1/projects/{id}/integrations/{storeId}/sync
func (h *EcommerceHandler) StartSync(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	storeID, err := strconv.Atoi(chi.URLParam(r, "storeId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid store ID")
		return
	}

	resp, err := h.ecommerceSvc.StartSync(r.Context(), userID, projectID, storeID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusAccepted, resp)
}

// POST /api/v1/projects/{id}/integrations/{storeId}/fetch-categories
func (h *EcommerceHandler) FetchCategories(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	storeID, err := strconv.Atoi(chi.URLParam(r, "storeId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid store ID")
		return
	}

	resp, err := h.ecommerceSvc.FetchAndSaveCategories(r.Context(), userID, projectID, storeID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/integrations/{storeId}/categories
func (h *EcommerceHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	storeID, err := strconv.Atoi(chi.URLParam(r, "storeId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid store ID")
		return
	}

	resp, err := h.ecommerceSvc.ListCategories(r.Context(), userID, projectID, storeID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/integrations/{storeId}/mappings
func (h *EcommerceHandler) ListMappings(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	storeID, err := strconv.Atoi(chi.URLParam(r, "storeId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid store ID")
		return
	}

	resp, err := h.ecommerceSvc.ListMappings(r.Context(), userID, projectID, storeID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// PUT /api/v1/projects/{id}/integrations/{storeId}/mappings
func (h *EcommerceHandler) SaveMappings(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	storeID, err := strconv.Atoi(chi.URLParam(r, "storeId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid store ID")
		return
	}

	var req dto.SaveCategoryMappingsRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.ecommerceSvc.SaveMappings(r.Context(), userID, projectID, storeID, req)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/integrations/{storeId}/status
func (h *EcommerceHandler) GetSyncStatus(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	storeID, err := strconv.Atoi(chi.URLParam(r, "storeId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid store ID")
		return
	}

	resp, err := h.ecommerceSvc.GetSyncStatus(r.Context(), userID, projectID, storeID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}
