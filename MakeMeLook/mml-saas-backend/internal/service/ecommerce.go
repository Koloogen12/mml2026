package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

var (
	ErrStoreNotFound = errors.New("ecommerce store not found")
	ErrSyncRunning   = errors.New("sync is already running for this store")
)

type EcommerceService struct {
	repos    *repository.Repositories
	storage  *StorageService
	syncMu   sync.RWMutex
	syncJobs map[int]*SyncJob
}

type SyncJob struct {
	StoreID       int
	Status        string
	Total         int
	Processed     int
	Created       int
	Updated       int
	Skipped       int
	Errors        int
	ErrorMessages []string
}

func NewEcommerce(repos *repository.Repositories, storage *StorageService) *EcommerceService {
	return &EcommerceService{
		repos:    repos,
		storage:  storage,
		syncJobs: make(map[int]*SyncJob),
	}
}

func (s *EcommerceService) CreateStore(ctx context.Context, userID int, projectID int, req dto.CreateEcommerceStoreRequest) (*dto.EcommerceStoreResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	syncInterval := req.SyncInterval
	if syncInterval == "" {
		syncInterval = "1h"
	}

	store := &model.EcommerceStore{
		ProjectID:    projectID,
		Platform:     model.EcommercePlatform(req.Platform),
		Name:         req.Name,
		ApiURL:       strings.TrimRight(req.ApiURL, "/"),
		ApiEmail:     req.ApiEmail,
		ApiKey:       req.ApiKey,
		IsActive:     true,
		SyncInterval: syncInterval,
	}

	if err := s.repos.EcommerceStore.Create(ctx, store); err != nil {
		return nil, fmt.Errorf("create store: %w", err)
	}

	return s.storeToDTO(store), nil
}

func (s *EcommerceService) GetStore(ctx context.Context, userID int, projectID int, storeID int) (*dto.EcommerceStoreResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	store, err := s.repos.EcommerceStore.GetByIDAndProjectID(ctx, storeID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get store: %w", err)
	}
	if store == nil {
		return nil, ErrStoreNotFound
	}

	return s.storeToDTO(store), nil
}

func (s *EcommerceService) ListStores(ctx context.Context, userID int, projectID int) (*dto.EcommerceStoreListResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	stores, err := s.repos.EcommerceStore.ListByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("list stores: %w", err)
	}

	resp := &dto.EcommerceStoreListResponse{
		Stores: make([]dto.EcommerceStoreResponse, 0, len(stores)),
	}
	for _, store := range stores {
		resp.Stores = append(resp.Stores, *s.storeToDTO(store))
	}
	return resp, nil
}

func (s *EcommerceService) UpdateStore(ctx context.Context, userID int, projectID int, storeID int, req dto.UpdateEcommerceStoreRequest) (*dto.EcommerceStoreResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	store, err := s.repos.EcommerceStore.GetByIDAndProjectID(ctx, storeID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get store: %w", err)
	}
	if store == nil {
		return nil, ErrStoreNotFound
	}

	updates := map[string]any{"updated_at": time.Now()}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.ApiURL != nil {
		updates["api_url"] = strings.TrimRight(*req.ApiURL, "/")
	}
	if req.ApiEmail != nil {
		updates["api_email"] = *req.ApiEmail
	}
	if req.ApiKey != nil {
		updates["api_key"] = *req.ApiKey
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.SyncInterval != nil {
		updates["sync_interval"] = *req.SyncInterval
	}

	if err := s.repos.EcommerceStore.Update(ctx, storeID, updates); err != nil {
		return nil, fmt.Errorf("update store: %w", err)
	}

	store, err = s.repos.EcommerceStore.GetByIDAndProjectID(ctx, storeID, projectID)
	if err != nil {
		return nil, fmt.Errorf("re-fetch store: %w", err)
	}

	return s.storeToDTO(store), nil
}

func (s *EcommerceService) DeleteStore(ctx context.Context, userID int, projectID int, storeID int) error {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return err
	}

	rows, err := s.repos.EcommerceStore.Delete(ctx, storeID, projectID)
	if err != nil {
		return fmt.Errorf("delete store: %w", err)
	}
	if rows == 0 {
		return ErrStoreNotFound
	}
	return nil
}

func (s *EcommerceService) TestConnection(ctx context.Context, userID int, projectID int, storeID int) (*dto.EcommerceTestResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	store, err := s.repos.EcommerceStore.GetByIDAndProjectID(ctx, storeID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get store: %w", err)
	}
	if store == nil {
		return nil, ErrStoreNotFound
	}

	result, err := s.fetchProducts(store, 1, 1)
	if err != nil {
		return &dto.EcommerceTestResponse{
			Success: false,
			Message: fmt.Sprintf("Connection failed: %s", err.Error()),
		}, nil
	}

	return &dto.EcommerceTestResponse{
		Success:       true,
		ProductsCount: result.Total,
		Message:       "Connection successful",
	}, nil
}

func (s *EcommerceService) StartSync(ctx context.Context, userID int, projectID int, storeID int) (*dto.EcommerceSyncStatusResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	store, err := s.repos.EcommerceStore.GetByIDAndProjectID(ctx, storeID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get store: %w", err)
	}
	if store == nil {
		return nil, ErrStoreNotFound
	}

	s.syncMu.Lock()
	if job, exists := s.syncJobs[storeID]; exists && job.Status == "running" {
		s.syncMu.Unlock()
		return s.syncJobToDTO(job), nil
	}

	job := &SyncJob{
		StoreID:       storeID,
		Status:        "running",
		ErrorMessages: []string{},
	}
	s.syncJobs[storeID] = job
	s.syncMu.Unlock()

	go s.runSync(store, job)

	return s.syncJobToDTO(job), nil
}

func (s *EcommerceService) GetSyncStatus(ctx context.Context, userID int, projectID int, storeID int) (*dto.EcommerceSyncStatusResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	s.syncMu.RLock()
	job, exists := s.syncJobs[storeID]
	s.syncMu.RUnlock()

	if !exists {
		return &dto.EcommerceSyncStatusResponse{
			StoreID: storeID,
			Status:  "idle",
		}, nil
	}

	return s.syncJobToDTO(job), nil
}

func (s *EcommerceService) RunScheduledSync(ctx context.Context) {
	stores, err := s.repos.EcommerceStore.GetActiveStores(ctx)
	if err != nil {
		logger.Error("ecommerce", "Failed to get active stores", "error", err)
		return
	}

	now := time.Now()
	for _, store := range stores {
		if store.LastSyncedAt == nil || s.shouldSync(store, now) {
			s.syncMu.Lock()
			if job, exists := s.syncJobs[store.ID]; exists && job.Status == "running" {
				s.syncMu.Unlock()
				continue
			}
			job := &SyncJob{
				StoreID:       store.ID,
				Status:        "running",
				ErrorMessages: []string{},
			}
			s.syncJobs[store.ID] = job
			s.syncMu.Unlock()

			go s.runSync(store, job)
		}
	}
}

// --- Category management ---

func (s *EcommerceService) FetchAndSaveCategories(ctx context.Context, userID int, projectID int, storeID int) (*dto.StoreCategoryListResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	store, err := s.repos.EcommerceStore.GetByIDAndProjectID(ctx, storeID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get store: %w", err)
	}
	if store == nil {
		return nil, ErrStoreNotFound
	}

	categories, err := s.fetchPlatformCategories(store)
	if err != nil {
		return nil, fmt.Errorf("fetch categories: %w", err)
	}

	for _, cat := range categories {
		storeCat := &model.StoreCategory{
			StoreID:    store.ID,
			ExternalID: cat.ExternalID,
			Name:       cat.Name,
			ParentName: cat.ParentName,
			FullPath:   cat.FullPath,
			UpdatedAt:  time.Now(),
		}
		if err := s.repos.StoreCategory.Upsert(ctx, storeCat); err != nil {
			logger.Error("ecommerce", "Failed to upsert category", "external_id", cat.ExternalID, "error", err)
		}
	}

	return s.ListCategories(ctx, userID, projectID, storeID)
}

func (s *EcommerceService) ListCategories(ctx context.Context, userID int, projectID int, storeID int) (*dto.StoreCategoryListResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	store, err := s.repos.EcommerceStore.GetByIDAndProjectID(ctx, storeID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get store: %w", err)
	}
	if store == nil {
		return nil, ErrStoreNotFound
	}

	cats, err := s.repos.StoreCategory.ListByStoreID(ctx, storeID)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}

	resp := &dto.StoreCategoryListResponse{
		Categories: make([]dto.StoreCategoryResponse, 0, len(cats)),
	}
	for _, cat := range cats {
		resp.Categories = append(resp.Categories, dto.StoreCategoryResponse{
			ID:         cat.ID,
			StoreID:    cat.StoreID,
			ExternalID: cat.ExternalID,
			Name:       cat.Name,
			ParentName: cat.ParentName,
			FullPath:   cat.FullPath,
		})
	}
	return resp, nil
}

func (s *EcommerceService) ListMappings(ctx context.Context, userID int, projectID int, storeID int) (*dto.CategoryMappingListResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	store, err := s.repos.EcommerceStore.GetByIDAndProjectID(ctx, storeID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get store: %w", err)
	}
	if store == nil {
		return nil, ErrStoreNotFound
	}

	mappings, err := s.repos.CategoryMapping.ListByStoreID(ctx, storeID)
	if err != nil {
		return nil, fmt.Errorf("list mappings: %w", err)
	}

	resp := &dto.CategoryMappingListResponse{
		Mappings: make([]dto.CategoryMappingResponse, 0, len(mappings)),
	}
	for _, m := range mappings {
		item := dto.CategoryMappingResponse{
			ID:              m.ID,
			StoreID:         m.StoreID,
			StoreCategoryID: m.StoreCategoryID,
			ProductType:     m.ProductType,
			Gender:          m.Gender,
		}
		if m.StoreCategory != nil {
			item.CategoryName = m.StoreCategory.Name
			item.CategoryPath = m.StoreCategory.FullPath
		}
		resp.Mappings = append(resp.Mappings, item)
	}
	return resp, nil
}

func (s *EcommerceService) SaveMappings(ctx context.Context, userID int, projectID int, storeID int, req dto.SaveCategoryMappingsRequest) (*dto.CategoryMappingListResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	store, err := s.repos.EcommerceStore.GetByIDAndProjectID(ctx, storeID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get store: %w", err)
	}
	if store == nil {
		return nil, ErrStoreNotFound
	}

	for _, m := range req.Mappings {
		mapping := &model.CategoryMapping{
			StoreID:         storeID,
			StoreCategoryID: m.StoreCategoryID,
			ProductType:     m.ProductType,
			Gender:          m.Gender,
			UpdatedAt:       time.Now(),
		}
		if err := s.repos.CategoryMapping.Upsert(ctx, mapping); err != nil {
			return nil, fmt.Errorf("save mapping: %w", err)
		}
	}

	return s.ListMappings(ctx, userID, projectID, storeID)
}

// --- shouldSync ---

func (s *EcommerceService) shouldSync(store *model.EcommerceStore, now time.Time) bool {
	if store.LastSyncedAt == nil {
		return true
	}

	var interval time.Duration
	switch store.SyncInterval {
	case "15m":
		interval = 15 * time.Minute
	case "30m":
		interval = 30 * time.Minute
	case "1h":
		interval = 1 * time.Hour
	case "6h":
		interval = 6 * time.Hour
	case "12h":
		interval = 12 * time.Hour
	case "24h":
		interval = 24 * time.Hour
	default:
		interval = 1 * time.Hour
	}

	return now.Sub(*store.LastSyncedAt) >= interval
}

// --- Unified product format ---

type platformProduct struct {
	ExternalID       string
	Name             string
	Price            float64
	ImageURL         string
	ImageURLs        []string
	SKU              string
	Brand            string
	Color            string
	Description      string
	CategoryID       string
	CategoryPath     string
	IsActive         bool
	IsParent         bool
	GroupKey         string
	ProductURL       string
	AvailableSizes   []string
	SizeVariantIDs   map[string]string
	RawData          json.RawMessage
}

type platformResult struct {
	Products []platformProduct
	Total    int
}

type platformCategory struct {
	ExternalID string
	Name       string
	ParentName *string
	FullPath   *string
}

func (s *EcommerceService) fetchProducts(store *model.EcommerceStore, page int, limit int) (*platformResult, error) {
	switch store.Platform {
	case model.EcommercePlatformCSCart:
		return s.fetchCSCartProducts(store, page, limit)
	case model.EcommercePlatformOpenCart:
		return s.fetchOpenCartProducts(store, page, limit)
	default:
		return nil, fmt.Errorf("unsupported platform: %s", store.Platform)
	}
}

func (s *EcommerceService) fetchPlatformCategories(store *model.EcommerceStore) ([]platformCategory, error) {
	switch store.Platform {
	case model.EcommercePlatformCSCart:
		return s.fetchCSCartCategories(store)
	case model.EcommercePlatformOpenCart:
		return nil, fmt.Errorf("opencart category fetching not implemented")
	default:
		return nil, fmt.Errorf("unsupported platform: %s", store.Platform)
	}
}

// --- CS-Cart adapter ---

type csCartResponse struct {
	Products []json.RawMessage `json:"products"`
	Params   csCartParams      `json:"params"`
}

type csCartProduct struct {
	ProductID         string                     `json:"product_id"`
	Product           string                     `json:"product"`
	ProductCode       string                     `json:"product_code"`
	Price             string                     `json:"price"`
	ListPrice         string                     `json:"list_price"`
	Status            string                     `json:"status"`
	ShortDescription  string                     `json:"short_description"`
	FullDescription   string                     `json:"full_description"`
	MainPair          *csCartMainPair            `json:"main_pair"`
	ImagePairs        map[string]csCartImagePair `json:"image_pairs"`
	MainCategory      json.RawMessage            `json:"main_category"`
	CategoryPath      string                     `json:"category_path"`
	ProductFeatures   json.RawMessage            `json:"product_features"`
	ParentProductID      string                     `json:"parent_product_id"`
	VariationSubGroupID  string                     `json:"variation_sub_group_id"`
	VariationFeatures    json.RawMessage            `json:"variation_features"`
}

type csCartMainPair struct {
	Detailed *csCartImage `json:"detailed"`
}

type csCartImagePair struct {
	Detailed *csCartImage `json:"detailed"`
}

type csCartImage struct {
	ImagePath string `json:"image_path"`
}

type csCartFeature struct {
	InternalName string `json:"internal_name"`
	Variant      string `json:"variant"`
}

type csCartVariation struct {
	Description string `json:"description"`
	Variant     string `json:"variant"`
}

type csCartParams struct {
	TotalItems   string `json:"total_items"`
	Page         int    `json:"page"`
	ItemsPerPage int    `json:"items_per_page"`
}

type csCartCategoryResponse struct {
	Categories []csCartCategory `json:"categories"`
}

type csCartCategory struct {
	CategoryID string `json:"category_id"`
	Category   string `json:"category"`
	ParentID   string `json:"parent_id"`
	IDPath     string `json:"id_path"`
}

func (s *EcommerceService) fetchCSCartProducts(store *model.EcommerceStore, page int, limit int) (*platformResult, error) {
	url := fmt.Sprintf("%s/api/products?page=%d&items_per_page=%d&status=A&include_child_variations=false", store.ApiURL, page, limit)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.SetBasicAuth(store.ApiEmail, store.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return nil, fmt.Errorf("API returned %d (body unreadable: %v)", resp.StatusCode, readErr)
		}
		return nil, fmt.Errorf("API returned %d: %s", resp.StatusCode, string(body))
	}

	var raw csCartResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	result := &platformResult{
		Total:    parseTotalItems(raw.Params.TotalItems),
		Products: make([]platformProduct, 0, len(raw.Products)),
	}

	for _, rawProduct := range raw.Products {
		var p csCartProduct
		if err := json.Unmarshal(rawProduct, &p); err != nil {
			logger.Error("ecommerce", "Failed to parse CS-Cart product", "error", err)
			continue
		}

		imageURL := ""
		if p.MainPair != nil && p.MainPair.Detailed != nil {
			imageURL = p.MainPair.Detailed.ImagePath
		}

		var imageURLs []string
		if imageURL != "" {
			imageURLs = append(imageURLs, imageURL)
		}
		for _, pair := range p.ImagePairs {
			if pair.Detailed != nil && pair.Detailed.ImagePath != "" {
				imageURLs = append(imageURLs, pair.Detailed.ImagePath)
			}
		}

		var productFeaturesMap map[string]csCartFeature
		json.Unmarshal(p.ProductFeatures, &productFeaturesMap) //nolint:errcheck
		brand := s.extractCSCartFeature(productFeaturesMap, "Бренд", "Brand")
		color := s.extractCSCartFeature(productFeaturesMap, "Цвет", "Color")

		description := p.FullDescription
		if description == "" {
			description = p.ShortDescription
		}

		categoryID := parseRawString(p.MainCategory)

		isActive := p.Status == "A"
		isParent := p.ParentProductID == "0" || p.ParentProductID == ""

		var sizes []string
		var sizeVariantIDs map[string]string
		if isParent {
			sizes, sizeVariantIDs = s.fetchCSCartSizeVariants(store, p.ProductID)
		}

		productURL := fmt.Sprintf("%s/index.php?dispatch=products.view&product_id=%s", strings.TrimRight(store.ApiURL, "/"), p.ProductID)

		pp := platformProduct{
			ExternalID:     p.ProductID,
			Name:           p.Product,
			Price:          parsePrice(p.Price),
			ImageURL:       imageURL,
			ImageURLs:      imageURLs,
			SKU:            p.ProductCode,
			Brand:          brand,
			Color:          color,
			Description:    description,
			CategoryID:     categoryID,
			CategoryPath:   p.CategoryPath,
			IsActive:       isActive,
			IsParent:       isParent,
			GroupKey:        p.VariationSubGroupID,
			ProductURL:      productURL,
			AvailableSizes:  sizes,
			SizeVariantIDs:  sizeVariantIDs,
			RawData:         rawProduct,
		}
		result.Products = append(result.Products, pp)
	}

	return result, nil
}

func (s *EcommerceService) extractCSCartFeature(features map[string]csCartFeature, names ...string) string {
	for _, f := range features {
		for _, name := range names {
			if strings.EqualFold(f.InternalName, name) {
				return f.Variant
			}
		}
	}
	return ""
}

// fetchCSCartSizeVariants fetches child variation products and returns both the list of
// normalized sizes and a mapping of normalizedSize → CS-Cart child product_id.
func (s *EcommerceService) fetchCSCartSizeVariants(store *model.EcommerceStore, parentProductID string) ([]string, map[string]string) {
	url := fmt.Sprintf("%s/api/products?parent_product_id=%s&items_per_page=100", store.ApiURL, parentProductID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, nil
	}
	req.SetBasicAuth(store.ApiEmail, store.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, nil
	}

	var raw struct {
		Products []struct {
			ProductID         string          `json:"product_id"`
			VariationFeatures json.RawMessage `json:"variation_features"`
		} `json:"products"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, nil
	}

	var sizes []string
	variantIDs := make(map[string]string)
	seen := make(map[string]bool)
	for _, p := range raw.Products {
		var vfMap map[string]csCartVariation
		if err := json.Unmarshal(p.VariationFeatures, &vfMap); err != nil {
			continue
		}
		for _, vf := range vfMap {
			if strings.EqualFold(vf.Description, "Размер") || strings.EqualFold(vf.Description, "Size") {
				if vf.Variant != "" && p.ProductID != "" {
					normalized := normalizeSize(vf.Variant)
					if !seen[normalized] {
						sizes = append(sizes, normalized)
						variantIDs[normalized] = p.ProductID
						seen[normalized] = true
					}
				}
			}
		}
	}
	return sizes, variantIDs
}

func (s *EcommerceService) fetchCSCartCategories(store *model.EcommerceStore) ([]platformCategory, error) {
	var all []platformCategory
	page := 1

	for {
		url := fmt.Sprintf("%s/api/categories?page=%d&items_per_page=250", store.ApiURL, page)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("create request: %w", err)
		}
		req.SetBasicAuth(store.ApiEmail, store.ApiKey)
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("request failed: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			body, readErr := io.ReadAll(resp.Body)
			resp.Body.Close()
			if readErr != nil {
				return nil, fmt.Errorf("API returned %d (body unreadable: %v)", resp.StatusCode, readErr)
			}
			return nil, fmt.Errorf("API returned %d: %s", resp.StatusCode, string(body))
		}

		var raw csCartCategoryResponse
		err = json.NewDecoder(resp.Body).Decode(&raw)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("decode response: %w", err)
		}

		if len(raw.Categories) == 0 {
			break
		}

		for _, c := range raw.Categories {
			cat := platformCategory{
				ExternalID: c.CategoryID,
				Name:       c.Category,
			}
			if c.ParentID != "0" && c.ParentID != "" {
				path := c.Category
				cat.FullPath = &path
			}
			all = append(all, cat)
		}

		if len(raw.Categories) < 250 {
			break
		}
		page++
	}

	return all, nil
}

// --- OpenCart adapter ---

type openCartResponse struct {
	Products   []openCartProduct `json:"products"`
	Total      json.RawMessage   `json:"total"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	TotalPages int               `json:"total_pages"`
}

type openCartProduct struct {
	ProductID json.RawMessage `json:"product_id"`
	Name      string          `json:"name"`
	Price     string          `json:"price"`
	Image     string          `json:"image"`
	Thumb     string          `json:"thumb"`
	Model     string          `json:"model"`
	SKU       string          `json:"sku"`
}

func (s *EcommerceService) fetchOpenCartProducts(store *model.EcommerceStore, page int, limit int) (*platformResult, error) {
	url := fmt.Sprintf("%s?page=%d&limit=%d", store.ApiURL, page, limit)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Api-Key", store.ApiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return nil, fmt.Errorf("API returned %d (body unreadable: %v)", resp.StatusCode, readErr)
		}
		return nil, fmt.Errorf("API returned %d: %s", resp.StatusCode, string(body))
	}

	var raw openCartResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	total := parseRawInt(raw.Total)

	result := &platformResult{
		Total:    total,
		Products: make([]platformProduct, 0, len(raw.Products)),
	}
	for _, p := range raw.Products {
		imageURL := p.Image
		if imageURL == "" {
			imageURL = p.Thumb
		}
		result.Products = append(result.Products, platformProduct{
			ExternalID: parseRawString(p.ProductID),
			Name:       p.Name,
			Price:      parsePrice(p.Price),
			ImageURL:   imageURL,
			SKU:        p.SKU,
			IsActive:   true,
			IsParent:   true,
		})
	}

	return result, nil
}

// --- Sync ---

func (s *EcommerceService) runSync(store *model.EcommerceStore, job *SyncJob) {
	ctx := context.Background()

	mappings := s.loadCategoryMappings(ctx, store.ID)
	page := 1
	limit := 50

	for {
		result, err := s.fetchProducts(store, page, limit)
		if err != nil {
			job.ErrorMessages = append(job.ErrorMessages, err.Error())
			job.Errors++
			break
		}

		if job.Total == 0 {
			job.Total = result.Total
		}

		for _, p := range result.Products {
			if !p.IsParent {
				job.Skipped++
				job.Processed++
				continue
			}

			existing, err := s.repos.Product.GetByProjectIDAndExternalID(ctx, store.ProjectID, p.ExternalID)
			if err != nil {
				job.ErrorMessages = append(job.ErrorMessages, fmt.Sprintf("lookup product %s: %s", p.ExternalID, err.Error()))
				job.Errors++
				job.Processed++
				continue
			}

			if existing == nil && p.SKU != "" && p.Color != "" {
				existing, _ = s.repos.Product.GetByProjectIDAndSKUAndColor(ctx, store.ProjectID, p.SKU, p.Color)
			}

			productType, gender := s.resolveMapping(mappings, p.CategoryID)

			storeID := store.ID

			if existing != nil {
				updates := map[string]any{
					"name":       p.Name,
					"price":      p.Price,
					"is_active":  p.IsActive,
					"updated_at": time.Now(),
				}
				if p.SKU != "" {
					updates["sku"] = p.SKU
				}
				if p.Brand != "" {
					updates["brand"] = p.Brand
				}
				if p.Color != "" {
					updates["color"] = p.Color
				}
				if p.Description != "" {
					updates["description"] = p.Description
				}
				if p.ProductURL != "" {
					updates["product_url"] = p.ProductURL
				}
				if productType != "" {
					updates["category"] = productType
				}
				if p.CategoryPath != "" {
					parts := strings.Split(p.CategoryPath, "/")
					if len(parts) > 0 {
						updates["subcategory"] = strings.TrimSpace(parts[len(parts)-1])
					}
				}
				if gender != "" {
					updates["gender"] = gender
				}
				if len(p.AvailableSizes) > 0 {
					updates["sizes"] = pq.StringArray(p.AvailableSizes)
				}
				if len(p.SizeVariantIDs) > 0 {
					sv, _ := json.Marshal(p.SizeVariantIDs)
					raw := json.RawMessage(sv)
					updates["size_variants"] = raw
				}
				if p.RawData != nil {
					updates["raw_data"] = p.RawData
				}
				if err := s.repos.Product.UpdateAll(ctx, existing.ID, updates); err != nil {
					job.ErrorMessages = append(job.ErrorMessages, fmt.Sprintf("update product %s: %s", p.ExternalID, err.Error()))
					job.Errors++
				} else {
					s.upsertProductPhotos(ctx, existing.ID, store.ProjectID, p.ImageURLs)
					job.Updated++
				}
			} else {
				var rawData *json.RawMessage
				if p.RawData != nil {
					rawData = &p.RawData
				}
				product := &model.Product{
					PublicID:    uuid.New(),
					ProjectID:  store.ProjectID,
					Name:       p.Name,
					Price:      &p.Price,
					IsActive:   p.IsActive,
					Source:      model.ProductSourceAPI,
					ExternalID: &p.ExternalID,
					StoreID:    &storeID,
					RawData:    rawData,
				}
				if p.SKU != "" {
					product.SKU = &p.SKU
				}
				if p.Brand != "" {
					product.Brand = &p.Brand
				}
				if p.Color != "" {
					product.Color = &p.Color
				}
				if p.Description != "" {
					product.Description = &p.Description
				}
				if p.ProductURL != "" {
					product.ProductURL = &p.ProductURL
				}
				if productType != "" {
					product.Category = &productType
				}
				if p.CategoryPath != "" {
					parts := strings.Split(p.CategoryPath, "/")
					if len(parts) > 0 {
						subcat := strings.TrimSpace(parts[len(parts)-1])
						product.Subcategory = &subcat
					}
				}
				if gender != "" {
					product.Gender = &gender
				}
				if len(p.AvailableSizes) > 0 {
					product.Sizes = pq.StringArray(p.AvailableSizes)
				}
				if len(p.SizeVariantIDs) > 0 {
					sv, _ := json.Marshal(p.SizeVariantIDs)
					raw := json.RawMessage(sv)
					product.SizeVariants = &raw
				}
				if err := s.repos.Product.Create(ctx, product); err != nil {
					job.ErrorMessages = append(job.ErrorMessages, fmt.Sprintf("create product %s: %s", p.ExternalID, err.Error()))
					job.Errors++
				} else {
					s.upsertProductPhotos(ctx, product.ID, store.ProjectID, p.ImageURLs)
					job.Created++
				}
			}

			job.Processed++
		}

		if len(result.Products) < limit {
			break
		}
		page++
	}

	now := time.Now()
	job.Status = "completed"

	_ = s.repos.EcommerceStore.Update(ctx, store.ID, map[string]any{
		"last_synced_at": now,
		"products_count": job.Created + job.Updated,
		"updated_at":     now,
	})

	logger.Info("ecommerce", "Sync completed",
		"store_id", store.ID,
		"created", job.Created,
		"updated", job.Updated,
		"errors", job.Errors,
	)
}

func (s *EcommerceService) loadCategoryMappings(ctx context.Context, storeID int) map[string]*model.CategoryMapping {
	mappings, err := s.repos.CategoryMapping.ListByStoreID(ctx, storeID)
	if err != nil {
		logger.Error("ecommerce", "Failed to load category mappings", "error", err)
		return nil
	}

	result := make(map[string]*model.CategoryMapping, len(mappings))
	for _, m := range mappings {
		if m.StoreCategory != nil {
			result[m.StoreCategory.ExternalID] = m
		}
	}
	return result
}

func (s *EcommerceService) resolveMapping(mappings map[string]*model.CategoryMapping, categoryID string) (productType string, gender string) {
	if mappings == nil || categoryID == "" {
		return "", ""
	}
	m, ok := mappings[categoryID]
	if !ok {
		return "", ""
	}
	g := ""
	if m.Gender != nil {
		g = *m.Gender
	}
	return m.ProductType, g
}

// --- Helpers ---

var numericSizeMap = map[string]string{
	"38": "XXS",
	"40": "XS",
	"42": "S",
	"44": "M",
	"46": "L",
	"48": "XL",
	"50": "XXL",
	"52": "XXXL",
}

var knownSizes = map[string]bool{
	"XXS": true, "XS": true, "S": true, "M": true,
	"L": true, "XL": true, "XXL": true, "XXXL": true,
}

func normalizeSize(raw string) string {
	raw = strings.TrimSpace(raw)
	upper := strings.ToUpper(raw)
	if knownSizes[upper] {
		return upper
	}

	parts := strings.Fields(raw)
	if len(parts) == 0 {
		return upper
	}
	for _, p := range parts {
		up := strings.ToUpper(p)
		if knownSizes[up] {
			return up
		}
	}

	num := parts[0]
	if mapped, ok := numericSizeMap[num]; ok {
		return mapped
	}

	return upper
}

func parsePrice(s string) float64 {
	var price float64
	fmt.Sscanf(s, "%f", &price)
	return price
}

// parseTotalItems converts a string total to int. Returns 0 on failure intentionally —
// a missing or malformed total is treated as zero items rather than an error.
func parseTotalItems(s string) int {
	n, _ := strconv.Atoi(s)
	return n
}

// parseRawInt tries to decode a JSON value as int (or string-encoded int).
// Returns 0 on failure intentionally — APIs may omit or null-out totals,
// and callers treat zero as "unknown count" rather than an error.
func parseRawInt(raw json.RawMessage) int {
	var n int
	if json.Unmarshal(raw, &n) == nil {
		return n
	}
	var s string
	if json.Unmarshal(raw, &s) == nil {
		n, _ = strconv.Atoi(s)
		return n
	}
	return 0
}

func parseRawString(raw json.RawMessage) string {
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return s
	}
	var n int
	if json.Unmarshal(raw, &n) == nil {
		return strconv.Itoa(n)
	}
	return string(raw)
}

func (s *EcommerceService) upsertProductPhotos(ctx context.Context, productID int, projectID int, imageURLs []string) {
	if len(imageURLs) == 0 {
		return
	}

	existing, _ := s.repos.ProductPhoto.ListByProductID(ctx, productID)
	if len(existing) > 0 {
		return
	}

	for _, imageURL := range imageURLs {
		s.downloadAndSavePhoto(ctx, productID, projectID, imageURL)
	}
}

func (s *EcommerceService) downloadAndSavePhoto(ctx context.Context, productID int, projectID int, imageURL string) {
	if imageURL == "" {
		return
	}

	resp, err := http.Get(imageURL)
	if err != nil {
		logger.Error("ecommerce", "Failed to download image", "url", imageURL, "error", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	ext := ".jpg"
	switch contentType {
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	}

	objectKey := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	if err := s.storage.UploadBytes(ctx, "product-photos", objectKey, data, contentType); err != nil {
		logger.Error("ecommerce", "Failed to upload image to S3", "error", err)
		return
	}

	photo := &model.ProductPhoto{
		ProductID:   &productID,
		ProjectID:   &projectID,
		ObjectKey:   objectKey,
		ExternalURL: &imageURL,
	}
	_ = s.repos.ProductPhoto.Create(ctx, photo)
}

func (s *EcommerceService) requireProjectAccess(ctx context.Context, userID int, projectID int) (*model.Project, error) {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}
	return project, nil
}

func (s *EcommerceService) storeToDTO(store *model.EcommerceStore) *dto.EcommerceStoreResponse {
	resp := &dto.EcommerceStoreResponse{
		ID:            store.ID,
		ProjectID:     store.ProjectID,
		Platform:      string(store.Platform),
		Name:          store.Name,
		ApiURL:        store.ApiURL,
		IsActive:      store.IsActive,
		SyncInterval:  store.SyncInterval,
		ProductsCount: store.ProductsCount,
		CreatedAt:     store.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     store.UpdatedAt.Format(time.RFC3339),
	}
	if store.LastSyncedAt != nil {
		t := store.LastSyncedAt.Format(time.RFC3339)
		resp.LastSyncedAt = &t
	}
	return resp
}

func (s *EcommerceService) syncJobToDTO(job *SyncJob) *dto.EcommerceSyncStatusResponse {
	return &dto.EcommerceSyncStatusResponse{
		StoreID:       job.StoreID,
		Status:        job.Status,
		Total:         job.Total,
		Processed:     job.Processed,
		Created:       job.Created,
		Updated:       job.Updated,
		Skipped:       job.Skipped,
		Errors:        job.Errors,
		ErrorMessages: job.ErrorMessages,
	}
}
