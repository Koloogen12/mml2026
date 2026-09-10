package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"mml-saas-backend/internal/repository"
	"mml-saas-backend/internal/service"
)

type StorefrontHandler struct {
	svc *service.StorefrontService
}

func NewStorefront(svc *service.StorefrontService) *StorefrontHandler {
	return &StorefrontHandler{svc: svc}
}

// ListProducts GET /api/storefront/v1/{projectPublicId}/products
func (h *StorefrontHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectPublicId")
	q := r.URL.Query()

	limit := 24
	if l, err := strconv.Atoi(q.Get("limit")); err == nil && l > 0 {
		if l > 1000 {
			l = 1000
		}
		limit = l
	}
	offset := 0
	if o, err := strconv.Atoi(q.Get("offset")); err == nil && o >= 0 {
		offset = o
	}

	filter := repository.StorefrontFilter{
		Category: q.Get("category"),
		Gender:   q.Get("gender"),
		Brand:    q.Get("brand"),
		Color:    q.Get("color"),
		Search:   q.Get("search"),
		Sort:     q.Get("sort"),
		Offset:   offset,
		Limit:    limit,
	}

	resp, err := h.svc.ListProducts(r.Context(), projectID, filter)
	if err != nil {
		mapStorefrontError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

// GetProduct GET /api/storefront/v1/{projectPublicId}/products/{productPublicId}
func (h *StorefrontHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectPublicId")
	productID := chi.URLParam(r, "productPublicId")

	resp, err := h.svc.GetProduct(r.Context(), projectID, productID)
	if err != nil {
		mapStorefrontError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

// ListCategories GET /api/storefront/v1/{projectPublicId}/categories
func (h *StorefrontHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectPublicId")

	resp, err := h.svc.ListCategories(r.Context(), projectID)
	if err != nil {
		mapStorefrontError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

func mapStorefrontError(w http.ResponseWriter, err error) {
	if errors.Is(err, service.ErrStorefrontNotFound) || errors.Is(err, service.ErrProductNotFound) {
		WriteError(w, http.StatusNotFound, "not_found", "Not found")
		return
	}
	WriteError(w, http.StatusInternalServerError, "internal_error", "Internal server error")
}
