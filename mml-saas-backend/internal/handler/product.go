package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/internal/service"
	"mml-saas-backend/pkg/logger"

	"github.com/go-chi/chi/v5"
)

type ProductHandler struct {
	productService *service.ProductService
	groupService   *service.ProductGroupService
}

func NewProduct(productSvc *service.ProductService, groupSvc *service.ProductGroupService) *ProductHandler {
	return &ProductHandler{productService: productSvc, groupService: groupSvc}
}

// GET /api/v1/projects/{id}/products
func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	q := r.URL.Query()

	filter := repository.ProductListFilter{
		Search:   q.Get("search"),
		Category: q.Get("category"),
		Gender:   q.Get("gender"),
	}

	if groupIDStr := q.Get("group_id"); groupIDStr != "" {
		if gid, err := strconv.Atoi(groupIDStr); err == nil {
			filter.GroupID = gid
		}
	}

	if statusStr := q.Get("status"); statusStr != "" {
		active := statusStr == "active"
		filter.IsActive = &active
	}

	filter.Offset, _ = strconv.Atoi(q.Get("offset"))
	filter.Limit, _ = strconv.Atoi(q.Get("limit"))
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 200 {
		filter.Limit = 200
	}

	resp, err := h.productService.ListProducts(r.Context(), userID, projectID, filter)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// POST /api/v1/projects/{id}/products
func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	var req dto.CreateProductRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.productService.CreateProduct(r.Context(), userID, projectID, req)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// GET /api/v1/projects/{id}/products/{productId}
func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	productID, err := strconv.Atoi(chi.URLParam(r, "productId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid product ID")
		return
	}

	resp, err := h.productService.GetProduct(r.Context(), userID, projectID, productID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// PUT /api/v1/projects/{id}/products/{productId}
func (h *ProductHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	productID, err := strconv.Atoi(chi.URLParam(r, "productId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid product ID")
		return
	}

	var req dto.CreateProductRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.productService.UpdateProduct(r.Context(), userID, projectID, productID, req)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// DELETE /api/v1/projects/{id}/products/{productId}
func (h *ProductHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	productID, err := strconv.Atoi(chi.URLParam(r, "productId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid product ID")
		return
	}

	if err := h.productService.DeleteProduct(r.Context(), userID, projectID, productID); err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Product deleted"})
}

// POST /api/v1/projects/{id}/products/bulk
func (h *ProductHandler) BulkAction(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	var req dto.BulkProductActionRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.productService.BulkAction(r.Context(), userID, projectID, req)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// POST /api/v1/projects/{id}/photos
// Uploads a photo before a product is created; returns {id, url} for use in photo_ids.
func (h *ProductHandler) UploadProjectPhoto(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	if err := r.ParseMultipartForm(6 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid multipart form")
		return
	}

	file, filename, size, cleanup, err := parseFile(r, "photo", false)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid photo file")
		return
	}
	defer cleanup()

	if file == nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "photo field is required")
		return
	}

	resp, err := h.productService.UploadProjectPhoto(r.Context(), userID, projectID, file, filename, size)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// POST /api/v1/projects/{id}/products/{productId}/photos
func (h *ProductHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	productID, err := strconv.Atoi(chi.URLParam(r, "productId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid product ID")
		return
	}

	if err := r.ParseMultipartForm(6 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid multipart form")
		return
	}

	file, filename, size, cleanup, err := parseFile(r, "photo", false)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid photo file")
		return
	}
	defer cleanup()

	if file == nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "photo field is required")
		return
	}

	resp, err := h.productService.UploadPhoto(r.Context(), userID, projectID, productID, file, filename, size)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// DELETE /api/v1/projects/{id}/products/{productId}/photos/{photoId}
func (h *ProductHandler) DeletePhoto(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	productID, err := strconv.Atoi(chi.URLParam(r, "productId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid product ID")
		return
	}

	photoID, err := strconv.Atoi(chi.URLParam(r, "photoId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid photo ID")
		return
	}

	if err := h.productService.DeletePhoto(r.Context(), userID, projectID, productID, photoID); err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Photo deleted"})
}

// PUT /api/v1/projects/{id}/products/{productId}/photos/reorder
func (h *ProductHandler) ReorderPhotos(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	productID, err := strconv.Atoi(chi.URLParam(r, "productId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid product ID")
		return
	}

	var req dto.ReorderPhotosRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	if err := h.productService.ReorderPhotos(r.Context(), userID, projectID, productID, req); err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Photos reordered"})
}

// GET /api/v1/projects/{id}/products/import/template
func (h *ProductHandler) GetImportTemplate(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	data, err := h.productService.GetImportTemplate(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=\"products_template.csv\"")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(data); err != nil {
		logger.Error("handler", "Failed to write CSV response", "error", err)
	}
}

// POST /api/v1/projects/{id}/products/import/parse-headers
func (h *ProductHandler) ParseImportHeaders(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	if err := r.ParseMultipartForm(11 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid multipart form")
		return
	}

	file, _, _, cleanup, err := parseFile(r, "file", true)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	defer cleanup()

	delimiterStr := r.FormValue("delimiter")

	resp, err := h.productService.ParseImportHeaders(r.Context(), userID, projectID, file, delimiterStr)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// POST /api/v1/projects/{id}/products/import/validate
func (h *ProductHandler) ValidateImportCSV(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	if err := r.ParseMultipartForm(11 << 20); err != nil { // 11MB limit
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid multipart form")
		return
	}

	file, _, _, cleanup, err := parseFile(r, "file", true)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	defer cleanup()

	delimiterStr := r.FormValue("delimiter")
	var mapping map[string]string
	if mappingJSON := r.FormValue("mapping"); mappingJSON != "" {
		if err := json.Unmarshal([]byte(mappingJSON), &mapping); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid mapping JSON")
			return
		}
	}

	resp, err := h.productService.ValidateImportCSV(r.Context(), userID, projectID, file, delimiterStr, mapping)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// POST /api/v1/projects/{id}/products/import/execute
func (h *ProductHandler) ExecuteImport(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	if err := r.ParseMultipartForm(11 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid multipart form")
		return
	}

	file, _, _, cleanup, err := parseFile(r, "file", true)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	defer cleanup()

	duplicateHandling := r.FormValue("duplicate_handling")
	if duplicateHandling != "skip" && duplicateHandling != "update" {
		duplicateHandling = "skip"
	}

	delimiterStr := r.FormValue("delimiter")
	var mapping map[string]string
	if mappingJSON := r.FormValue("mapping"); mappingJSON != "" {
		if err := json.Unmarshal([]byte(mappingJSON), &mapping); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid mapping JSON")
			return
		}
	}

	resp, err := h.productService.ExecuteImport(r.Context(), userID, projectID, file, duplicateHandling, delimiterStr, mapping)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusAccepted, resp)
}

// GET /api/v1/projects/{id}/products/import/{importId}/status
func (h *ProductHandler) GetImportStatus(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	importID := chi.URLParam(r, "importId")
	if importID == "" {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid import ID")
		return
	}

	resp, err := h.productService.GetImportStatus(r.Context(), userID, projectID, importID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// GET /api/v1/projects/{id}/product-groups
func (h *ProductHandler) ListGroups(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	resp, err := h.groupService.ListGroups(r.Context(), userID, projectID)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// POST /api/v1/projects/{id}/product-groups
func (h *ProductHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	var req dto.CreateProductGroupRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.groupService.CreateGroup(r.Context(), userID, projectID, req)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// PUT /api/v1/projects/{id}/product-groups/{groupId}
func (h *ProductHandler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	groupID, err := strconv.Atoi(chi.URLParam(r, "groupId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid group ID")
		return
	}

	var req dto.CreateProductGroupRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.groupService.UpdateGroup(r.Context(), userID, projectID, groupID, req)
	if err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// DELETE /api/v1/projects/{id}/product-groups/{groupId}
func (h *ProductHandler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	groupID, err := strconv.Atoi(chi.URLParam(r, "groupId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid group ID")
		return
	}

	if err := h.groupService.DeleteGroup(r.Context(), userID, projectID, groupID); err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Group deleted"})
}

// POST /api/v1/projects/{id}/product-groups/{groupId}/products
func (h *ProductHandler) AddProductsToGroup(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	groupID, err := strconv.Atoi(chi.URLParam(r, "groupId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid group ID")
		return
	}

	var req dto.AddProductsToGroupRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	if err := h.groupService.AddProducts(r.Context(), userID, projectID, groupID, req); err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Products added to group"})
}

// DELETE /api/v1/projects/{id}/product-groups/{groupId}/products/{productId}
func (h *ProductHandler) RemoveProductFromGroup(w http.ResponseWriter, r *http.Request) {
	userID, projectID, ok := parseProjectRequest(w, r)
	if !ok {
		return
	}

	groupID, err := strconv.Atoi(chi.URLParam(r, "groupId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid group ID")
		return
	}

	productID, err := strconv.Atoi(chi.URLParam(r, "productId"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid product ID")
		return
	}

	if err := h.groupService.RemoveProduct(r.Context(), userID, projectID, groupID, productID); err != nil {
		mapServiceError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Product removed from group"})
}
