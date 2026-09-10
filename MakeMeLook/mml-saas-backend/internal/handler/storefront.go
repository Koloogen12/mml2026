package handler

import (
	"errors"
	"net/http"
	"strconv"

	"mml-saas-backend/internal/repository"
	"mml-saas-backend/internal/service"

	"github.com/go-chi/chi/v5"
)

type StorefrontHandler struct {
	service *service.StorefrontService
}

func NewStorefront(svc *service.StorefrontService) *StorefrontHandler {
	return &StorefrontHandler{service: svc}
}

// GET /api/storefront/v1/{projectPublicId}/products
func (h *StorefrontHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	projectPublicID := chi.URLParam(r, "projectPublicId")

	q := r.URL.Query()
	filter := repository.StorefrontFilter{
		Category: q.Get("category"),
		Gender:   q.Get("gender"),
		Brand:    q.Get("brand"),
		Color:    q.Get("color"),
		Search:   q.Get("search"),
		Sort:     q.Get("sort"),
	}

	if groupIDStr := q.Get("group_id"); groupIDStr != "" {
		if gid, err := strconv.Atoi(groupIDStr); err == nil {
			filter.GroupID = gid
		}
	}

	filter.Offset, _ = strconv.Atoi(q.Get("offset"))
	filter.Limit, _ = strconv.Atoi(q.Get("limit"))
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 100 {
		filter.Limit = 100
	}

	resp, err := h.service.ListProducts(r.Context(), projectPublicID, filter)
	if err != nil {
		mapStorefrontError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/storefront/v1/{projectPublicId}/products/{productPublicId}
func (h *StorefrontHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	projectPublicID := chi.URLParam(r, "projectPublicId")
	productPublicID := chi.URLParam(r, "productPublicId")

	resp, err := h.service.GetProduct(r.Context(), projectPublicID, productPublicID)
	if err != nil {
		mapStorefrontError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/storefront/v1/{projectPublicId}/categories
func (h *StorefrontHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	projectPublicID := chi.URLParam(r, "projectPublicId")

	resp, err := h.service.ListCategories(r.Context(), projectPublicID)
	if err != nil {
		mapStorefrontError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

func mapStorefrontError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrStorefrontNotFound):
		WriteError(w, http.StatusNotFound, "not_found", "Project not found")
	case errors.Is(err, service.ErrProductNotFound):
		WriteError(w, http.StatusNotFound, "not_found", "Product not found")
	default:
		WriteError(w, http.StatusInternalServerError, "internal_error", err.Error())
	}
}
