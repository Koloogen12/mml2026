package handler

import (
	"net/http"
	"strconv"

	"mml-saas-backend/internal/repository"
	"mml-saas-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type StorefrontHandler struct {
	productService *service.ProductService
}

func NewStorefront(productSvc *service.ProductService) *StorefrontHandler {
	return &StorefrontHandler{productService: productSvc}
}

// GET /api/storefront/v1/{projectPublicId}/products
func (h *StorefrontHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	projectPublicID, err := uuid.Parse(chi.URLParam(r, "projectPublicId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid project ID")
		return
	}

	q := r.URL.Query()

	filter := repository.ProductListFilter{
		Search:   q.Get("search"),
		Category: q.Get("category"),
		Gender:   q.Get("gender"),
		Sort:     q.Get("sort"),
	}

	filter.Offset, _ = strconv.Atoi(q.Get("offset"))
	filter.Limit, _ = strconv.Atoi(q.Get("limit"))
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 200 {
		filter.Limit = 200
	}

	resp, err := h.productService.ListProductsPublic(r.Context(), projectPublicID, filter)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/storefront/v1/{projectPublicId}/products/{productPublicId}
func (h *StorefrontHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	projectPublicID, err := uuid.Parse(chi.URLParam(r, "projectPublicId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid project ID")
		return
	}

	productPublicID, err := uuid.Parse(chi.URLParam(r, "productPublicId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid product ID")
		return
	}

	resp, err := h.productService.GetProductPublic(r.Context(), projectPublicID, productPublicID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/storefront/v1/{projectPublicId}/categories
func (h *StorefrontHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	projectPublicID, err := uuid.Parse(chi.URLParam(r, "projectPublicId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid project ID")
		return
	}

	resp, err := h.productService.GetCategoriesPublic(r.Context(), projectPublicID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}
