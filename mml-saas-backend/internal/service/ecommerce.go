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
	ErrStoreNotFound        = errors.New("ecommerce store not found")
	ErrSyncRunning          = errors.New("sync is already running for this store")
	ErrCustomFeedNeedsHTTPS = errors.New("custom-feed URL must use HTTPS")
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

	// Custom-feed requires HTTPS — checked here (not in DTO oneof) so the
	// error message points at the actual field, with a platform-specific
	// reason. Other platforms accept any URL the validator allows.
	if model.EcommercePlatform(req.Platform) == model.EcommercePlatformCustomFeed {
		if err := validateCustomFeedURL(req.ApiURL); err != nil {
			return nil, err
		}
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

	// If the caller is changing the URL on a custom-feed store, re-validate
	// the scheme — keep the create-time guarantee in sync with updates.
	if req.ApiURL != nil && store.Platform == model.EcommercePlatformCustomFeed {
		if err := validateCustomFeedURL(*req.ApiURL); err != nil {
			return nil, err
		}
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

// ListSyncHistory returns the most recent sync runs for a store, newest first,
// capped at `limit` (defaults to 50, max 200).
func (s *EcommerceService) ListSyncHistory(ctx context.Context, userID int, projectID int, storeID int, limit int) (*dto.SyncHistoryListResponse, error) {
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

	rows, err := s.repos.SyncHistory.ListByStoreID(ctx, storeID, limit)
	if err != nil {
		return nil, fmt.Errorf("list history: %w", err)
	}

	resp := &dto.SyncHistoryListResponse{
		History: make([]dto.SyncHistoryEntry, 0, len(rows)),
	}
	for _, h := range rows {
		var msgs []string
		if h.ErrorMessages != nil {
			_ = json.Unmarshal(*h.ErrorMessages, &msgs)
		}
		resp.History = append(resp.History, dto.SyncHistoryEntry{
			ID:            h.ID,
			StoreID:       h.StoreID,
			StartedAt:     h.StartedAt.Format(time.RFC3339),
			FinishedAt:    h.FinishedAt.Format(time.RFC3339),
			DurationMs:    h.FinishedAt.Sub(h.StartedAt).Milliseconds(),
			Status:        h.Status,
			Total:         h.Total,
			Processed:     h.Processed,
			Created:       h.CreatedCount,
			Updated:       h.UpdatedCount,
			Skipped:       h.SkippedCount,
			Errors:        h.ErrorsCount,
			ErrorMessages: msgs,
		})
	}
	return resp, nil
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
			StoreID:        store.ID,
			ExternalID:     cat.ExternalID,
			Name:           cat.Name,
			ParentName:     cat.ParentName,
			FullPath:       cat.FullPath,
			IsMarketingTag: cat.IsMarketingTag,
			UpdatedAt:      time.Now(),
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
	// CategoryIDs is the full list of platform category memberships (CS-Cart
	// products carry an array of all categories they belong to). The sync
	// pipeline resolves these against store_categories to derive a more
	// accurate subcategory + full path + marketing tag than CategoryPath
	// alone (which only describes the primary category).
	CategoryIDs      []string
	IsActive         bool
	IsParent         bool
	GroupKey         string
	ProductURL       string
	AvailableSizes   []string
	SizeVariantIDs   map[string]string
	RawData          json.RawMessage
	// Direct values from the platform — used when the platform delivers
	// normalized category/gender directly in the feed (e.g. custom-feed),
	// bypassing the CategoryMapping lookup. Empty string falls back to mapping.
	Category         string
	Gender           string
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
	// IsMarketingTag flags categories that are merchandising chips rather
	// than actual product hierarchies (e.g. "Новинки", "Sale", "Скидки").
	// The widget surfaces these as priority chips at the top of each layer
	// instead of mixing them with hierarchy categories.
	IsMarketingTag bool
}

func (s *EcommerceService) fetchProducts(store *model.EcommerceStore, page int, limit int) (*platformResult, error) {
	switch store.Platform {
	case model.EcommercePlatformCSCart:
		return s.fetchCSCartProducts(store, page, limit)
	case model.EcommercePlatformOpenCart:
		return s.fetchOpenCartProducts(store, page, limit)
	case model.EcommercePlatformCustomFeed:
		// Custom-feed returns the entire catalog in one shot, so we only
		// honor page=1 and ignore subsequent pages (runSync stops after
		// the first incomplete page).
		if page > 1 {
			return &platformResult{Products: nil, Total: 0}, nil
		}
		return s.fetchCustomFeedProducts(store)
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
	case model.EcommercePlatformCustomFeed:
		// Custom-feed delivers normalized category names directly per product —
		// no separate category endpoint exists, and no mapping UI is needed.
		return nil, nil
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
	// CategoryIDs holds ALL CS-Cart category memberships for the product
	// (the catalogue tree plus any merchandising chips like Новинки/Sale).
	// We resolve these against store_categories to assemble both the
	// proper full path and the marketing tag.
	CategoryIDs       json.RawMessage            `json:"category_ids"`
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

		// CS-Cart's category_ids field is sometimes a JSON array of strings,
		// sometimes a comma-separated string ("19,29,70") depending on
		// installation. parseStringArray handles both shapes.
		categoryIDs := parseStringArray(p.CategoryIDs)

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
			CategoryIDs:    categoryIDs,
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

// marketingCategoryNames are CS-Cart categories that act as merchandising
// chips rather than real product hierarchies. The widget surfaces them as
// priority chips at the top of each layer instead of mixing with the actual
// hierarchy. Match is case-insensitive against the category leaf name.
var marketingCategoryNames = map[string]bool{
	"новинки":            true,
	"скоро в продаже":    true,
	"sale":               true,
	"скидки":             true,
	"распродажа":         true,
	"новая коллекция":    true,
	"акции":              true,
	"специальное предложение": true,
}

func isMarketingCategory(name string) bool {
	return marketingCategoryNames[strings.ToLower(strings.TrimSpace(name))]
}

func (s *EcommerceService) fetchCSCartCategories(store *model.EcommerceStore) ([]platformCategory, error) {
	// Pass 1: fetch all categories from CS-Cart, build id → category map.
	type rawCat struct {
		ExternalID string
		Name       string
		ParentID   string
		IDPath     string
	}
	rawCats := make(map[string]rawCat) // external_id → cat
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
			rawCats[c.CategoryID] = rawCat{
				ExternalID: c.CategoryID,
				Name:       c.Category,
				ParentID:   c.ParentID,
				IDPath:     c.IDPath,
			}
		}

		if len(raw.Categories) < 250 {
			break
		}
		page++
	}

	// Pass 2: walk id_path to assemble human-readable full path.
	// CS-Cart's id_path format is "1/19/25" — chain of category IDs from
	// root to this category (inclusive). We map each ID to its name and
	// join with " / ".
	all := make([]platformCategory, 0, len(rawCats))
	for _, c := range rawCats {
		var pathSegs []string
		var parentName *string

		if c.IDPath != "" {
			ids := strings.Split(c.IDPath, "/")
			for _, id := range ids {
				id = strings.TrimSpace(id)
				if id == "" {
					continue
				}
				if pc, ok := rawCats[id]; ok {
					pathSegs = append(pathSegs, pc.Name)
				}
			}
			if len(pathSegs) >= 2 {
				p := pathSegs[len(pathSegs)-2]
				parentName = &p
			}
		}

		var fullPath *string
		if len(pathSegs) > 0 {
			fp := strings.Join(pathSegs, " / ")
			fullPath = &fp
		}

		all = append(all, platformCategory{
			ExternalID:     c.ExternalID,
			Name:           c.Name,
			ParentName:     parentName,
			FullPath:       fullPath,
			IsMarketingTag: isMarketingCategory(c.Name),
		})
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
	startedAt := time.Now()

	mappings := s.loadCategoryMappings(ctx, store.ID)

	// Preload the project's full category tree once per sync so we can
	// resolve each product's category_ids[] into proper subcategory + full
	// path + marketing tag. This depends on the admin having clicked
	// "Получить категории" (FetchAndSaveCategories) at least once. If the
	// tree is empty the resolver falls back to platform-provided primary
	// path, matching legacy behaviour.
	storeCats, _ := s.repos.StoreCategory.ListByStoreID(ctx, store.ID)
	storeCatsByID := make(map[string]*model.StoreCategory, len(storeCats))
	for _, c := range storeCats {
		storeCatsByID[c.ExternalID] = c
	}
	if len(storeCatsByID) == 0 {
		logger.Warn("ecommerce", "sync started without preloaded store_categories — subcategory resolution falls back to primary path",
			"store_id", store.ID, "project_id", store.ProjectID)
	}

	page := 1
	limit := 50

	// For platforms where the feed is expected to be a complete snapshot
	// of the catalog (currently only custom-feed), we collect every
	// external_id we see across all pages so we can deactivate stale
	// products at the end. Other platforms keep this nil.
	var seenExternalIDs []string
	if store.Platform == model.EcommercePlatformCustomFeed {
		seenExternalIDs = make([]string, 0, 256)
	}
	feedFetchFailed := false

	for {
		result, err := s.fetchProducts(store, page, limit)
		if err != nil {
			job.ErrorMessages = append(job.ErrorMessages, err.Error())
			job.Errors++
			feedFetchFailed = true
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

			// Track every external_id present in the feed (only used when
			// seenExternalIDs is initialized — i.e. for custom-feed).
			if seenExternalIDs != nil && p.ExternalID != "" {
				seenExternalIDs = append(seenExternalIDs, p.ExternalID)
			}

			existing, err := s.repos.Product.GetByProjectIDAndExternalID(ctx, store.ProjectID, p.ExternalID)
			if err != nil {
				job.ErrorMessages = append(job.ErrorMessages, fmt.Sprintf("lookup product %s: %s", p.ExternalID, err.Error()))
				job.Errors++
				job.Processed++
				continue
			}

			if existing == nil && p.SKU != "" {
				// Multi-vendor CS-Cart shops list the same physical model
				// under different product_ids (one per vendor). external_id
				// then differs across pages, but SKU stays the same — without
				// the SKU fallback we'd insert a fresh row each time and end
				// up with N copies of the same garment in the catalog.
				if p.Color != "" {
					existing, _ = s.repos.Product.GetByProjectIDAndSKUAndColor(ctx, store.ProjectID, p.SKU, p.Color)
				} else {
					existing, _ = s.repos.Product.GetByProjectIDAndSKU(ctx, store.ProjectID, p.SKU)
				}
			}

			// Prefer direct values from the feed (custom-feed delivers normalized
			// category/gender inline). Fall back to category-mapping lookup
			// for platforms that ship raw external category IDs (CS-Cart).
			productType, gender := p.Category, p.Gender
			if productType == "" {
				productType, gender = s.resolveMapping(mappings, p.CategoryID)
			}

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
				// Resolve subcategory + full path + marketing tag from the
				// product's category_ids[] using the preloaded store_categories
				// tree. Falls back to platform's primary CategoryPath when the
				// tree isn't populated.
				if len(p.CategoryIDs) > 0 || p.CategoryPath != "" {
					sub, full, mTag := resolveProductCategoryByIDs(p.CategoryIDs, p.CategoryPath, storeCatsByID)
					if full != "" {
						updates["category_full_path"] = full
					}
					if sub != "" {
						updates["subcategory"] = sub
					}
					if mTag != "" {
						updates["marketing_tag"] = mTag
					} else {
						// Explicit clear: product fell out of any marketing category.
						updates["marketing_tag"] = nil
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
				if len(p.CategoryIDs) > 0 || p.CategoryPath != "" {
					sub, full, mTag := resolveProductCategoryByIDs(p.CategoryIDs, p.CategoryPath, storeCatsByID)
					if sub != "" {
						product.Subcategory = &sub
					}
					if full != "" {
						product.CategoryFullPath = &full
					}
					if mTag != "" {
						product.MarketingTag = &mTag
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

	// Deactivation pass for snapshot-style feeds: products that previously
	// existed for this store but did NOT appear in the current feed are
	// soft-deleted (is_active=false). Guarded by:
	//   1. feed fetch must have succeeded — we never deactivate based on a
	//      partial pull (would wipe the catalog on a transient network blip)
	//   2. the new feed must contain at least 50% of currently-active items
	//      — if a misconfigured feed drops most of the catalog, we'd rather
	//      let an operator notice than auto-destroy the data
	if !feedFetchFailed && seenExternalIDs != nil {
		s.maybeDeactivateMissingProducts(ctx, store, seenExternalIDs, job)
	}

	now := time.Now()
	job.Status = "completed"

	_ = s.repos.EcommerceStore.Update(ctx, store.ID, map[string]any{
		"last_synced_at": now,
		"products_count": job.Created + job.Updated,
		"updated_at":     now,
	})

	// Persist this run as an audit record. Best-effort — a failure to
	// write history must not crash the sync (the live data is already
	// committed to products/store; history is a UX nice-to-have).
	historyStatus := "success"
	if job.Errors > 0 {
		if job.Created+job.Updated == 0 {
			historyStatus = "failed"
		} else {
			historyStatus = "partial"
		}
	}
	var msgsJSON *json.RawMessage
	if len(job.ErrorMessages) > 0 {
		if b, err := json.Marshal(job.ErrorMessages); err == nil {
			raw := json.RawMessage(b)
			msgsJSON = &raw
		}
	}
	if err := s.repos.SyncHistory.Create(ctx, &model.SyncHistory{
		StoreID:       store.ID,
		StartedAt:     startedAt,
		FinishedAt:    now,
		Status:        historyStatus,
		Total:         job.Total,
		Processed:     job.Processed,
		CreatedCount:  job.Created,
		UpdatedCount:  job.Updated,
		SkippedCount:  job.Skipped,
		ErrorsCount:   job.Errors,
		ErrorMessages: msgsJSON,
		CreatedAt:     now,
	}); err != nil {
		logger.Error("ecommerce", "Failed to persist sync history",
			"store_id", store.ID, "error", err)
	}

	logger.Info("ecommerce", "Sync completed",
		"store_id", store.ID,
		"created", job.Created,
		"updated", job.Updated,
		"errors", job.Errors,
	)
}

// maybeDeactivateMissingProducts soft-deletes products belonging to the
// store that weren't seen in the current feed, with a safety threshold
// to avoid wiping the catalog on a degraded feed.
func (s *EcommerceService) maybeDeactivateMissingProducts(
	ctx context.Context, store *model.EcommerceStore, seenExternalIDs []string, job *SyncJob,
) {
	currentlyActive, err := s.repos.Product.CountActiveByStore(ctx, store.ID)
	if err != nil {
		logger.Error("ecommerce", "Skipping deactivation pass — count failed",
			"store_id", store.ID, "error", err)
		return
	}

	// First-ever sync (no active products yet) — nothing to deactivate.
	if currentlyActive == 0 {
		return
	}

	// Sanity check: if the feed contains less than 50% of what we already
	// have active for this store, abort the deactivation pass. This guards
	// against a misconfigured/truncated feed accidentally clearing the
	// catalog. Operator can rerun the sync once the feed is fixed.
	seenCount := int64(len(seenExternalIDs))
	threshold := currentlyActive / 2
	if seenCount < threshold {
		msg := fmt.Sprintf(
			"Deactivation pass skipped: feed returned %d items, store has %d active (threshold: %d). "+
				"Fix the feed and rerun sync to apply deactivations.",
			seenCount, currentlyActive, threshold,
		)
		logger.Error("ecommerce", msg, "store_id", store.ID)
		job.ErrorMessages = append(job.ErrorMessages, msg)
		job.Errors++
		return
	}

	deactivated, err := s.repos.Product.DeactivateMissingFromFeed(ctx, store.ID, seenExternalIDs)
	if err != nil {
		logger.Error("ecommerce", "Deactivation pass failed", "store_id", store.ID, "error", err)
		job.ErrorMessages = append(job.ErrorMessages, fmt.Sprintf("deactivate missing products: %s", err.Error()))
		job.Errors++
		return
	}

	if deactivated > 0 {
		logger.Info("ecommerce", "Deactivated products missing from feed",
			"store_id", store.ID, "deactivated", deactivated, "feed_size", seenCount)
		// Surface as an info-style line in ErrorMessages (which is really
		// "operator-visible messages from this run"). Don't bump Errors —
		// this is a successful operation, not a failure.
		job.ErrorMessages = append(job.ErrorMessages, fmt.Sprintf(
			"Deactivated %d product(s) missing from current feed.", deactivated))
	}
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

// parseStringArray normalises a JSON value that may be either an array of
// strings/numbers ([19,29,70] or ["19","29"]) or a comma-separated string
// ("19,29,70"). Returns nil for empty/missing input.
func parseStringArray(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return nil
	}
	// Try array of strings first.
	var asStrs []string
	if err := json.Unmarshal(raw, &asStrs); err == nil {
		out := make([]string, 0, len(asStrs))
		for _, s := range asStrs {
			s = strings.TrimSpace(s)
			if s != "" {
				out = append(out, s)
			}
		}
		return out
	}
	// Array of numbers.
	var asNums []json.Number
	if err := json.Unmarshal(raw, &asNums); err == nil {
		out := make([]string, 0, len(asNums))
		for _, n := range asNums {
			s := strings.TrimSpace(string(n))
			if s != "" {
				out = append(out, s)
			}
		}
		return out
	}
	// Single string ("19,29,70").
	var single string
	if err := json.Unmarshal(raw, &single); err == nil {
		parts := strings.Split(single, ",")
		out := make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				out = append(out, p)
			}
		}
		return out
	}
	return nil
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

// resolveProductCategoryByIDs picks the best category data for a product
// from its CS-Cart category_ids[] using the project's full store_categories
// table. CS-Cart products typically belong to MULTIPLE categories — both
// hierarchical (catalogue tree) AND flat merchandising tags ("Новинки",
// "Sale"). The store's category_path field only describes ONE primary
// category, which is often too generic.
//
// The function returns:
//
//   - subcategory: the first meaningful segment of the deepest non-marketing
//     full path (drives the chip label inside each widget layer).
//   - fullPath: the full hierarchical path of the chosen category, useful
//     for showing breadcrumbs in the widget if needed.
//   - marketingTag: name of the first matched marketing category, if any
//     (drives the priority chip at the top of each widget layer).
//
// "Deepest" here means most slashes in the FullPath — i.e. most specific.
// For two products with category_ids = [Платья, Сарафаны], we pick
// "Сарафаны" because it sits below "Платья" in the tree.
//
// Falls back to firstMeaningfulCategorySegment(primaryPath) when category
// IDs don't resolve (e.g. store_categories haven't been fetched yet).
func resolveProductCategoryByIDs(categoryIDs []string, primaryPath string, storeCatsByID map[string]*model.StoreCategory) (subcategory, fullPath, marketingTag string) {
	if len(categoryIDs) == 0 || len(storeCatsByID) == 0 {
		return firstMeaningfulCategorySegment(primaryPath), primaryPath, ""
	}

	var bestPath string
	var bestDepth int
	for _, id := range categoryIDs {
		cat, ok := storeCatsByID[id]
		if !ok || cat == nil {
			continue
		}
		// Marketing categories: capture but do not consider as the hierarchy path.
		if cat.IsMarketingTag {
			if marketingTag == "" {
				marketingTag = cat.Name
			}
			continue
		}
		if cat.FullPath == nil || *cat.FullPath == "" {
			continue
		}
		depth := strings.Count(*cat.FullPath, "/")
		if depth > bestDepth || bestPath == "" {
			bestPath = *cat.FullPath
			bestDepth = depth
		}
	}

	if bestPath == "" {
		// No hierarchical category resolved — fall back to the platform's
		// primary path string.
		bestPath = primaryPath
	}

	return firstMeaningfulCategorySegment(bestPath), bestPath, marketingTag
}

// firstMeaningfulCategorySegment extracts the FIRST useful segment from a
// CS-Cart category path like "Женская одежда / Платья / Повседневные".
// Two classes of segments are skipped:
//
//  1. Generic roots ("Женская одежда", "Все товары") — shared across every
//     product, no information value.
//  2. Names that EQUAL one of our internal 5 try-on layers (Аксессуары,
//     Обувь, Верхняя одежда). The widget already shows the layer as the
//     parent header, so the segment would be redundant; we drop one level
//     deeper to surface real subcategories (Сумки, Ремни, Сапоги, Пальто).
//
// Example outputs:
//
//	"Женская одежда / Платья / Повседневные" → "Платья"
//	"Аксессуары / Сумки"                      → "Сумки"
//	"Обувь / Сапоги"                          → "Сапоги"
//	"Обувь"                                   → "Обувь" (fallback — only one segment)
//	"Жакеты и костюмы / С брюками"            → "Жакеты и костюмы"
//	"Товары без категории"                    → "Товары без категории"
func firstMeaningfulCategorySegment(path string) string {
	if path == "" {
		return ""
	}
	skipRoots := map[string]bool{
		"Женская одежда":  true,
		"Мужская одежда":  true,
		"Все товары":      true,
		// Same as our widget try-on layer names — drop one level deeper.
		"Аксессуары":      true,
		"Обувь":           true,
		"Верхняя одежда":  true,
	}
	parts := strings.Split(path, "/")
	for _, p := range parts {
		seg := strings.TrimSpace(p)
		if seg == "" {
			continue
		}
		if skipRoots[seg] {
			continue
		}
		return seg
	}
	// All segments were skipped — fall back to last non-empty segment.
	for i := len(parts) - 1; i >= 0; i-- {
		if seg := strings.TrimSpace(parts[i]); seg != "" {
			return seg
		}
	}
	return ""
}
