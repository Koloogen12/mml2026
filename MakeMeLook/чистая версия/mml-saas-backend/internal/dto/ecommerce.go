package dto

type CreateEcommerceStoreRequest struct {
	Platform     string `json:"platform" validate:"required,oneof=cs-cart opencart"`
	Name         string `json:"name" validate:"required,min=1,max=255"`
	ApiURL       string `json:"api_url" validate:"required,url,max=500"`
	ApiEmail     string `json:"api_email" validate:"omitempty,email,max=255"`
	ApiKey       string `json:"api_key" validate:"required,min=1,max=500"`
	SyncInterval string `json:"sync_interval" validate:"omitempty,oneof=15m 30m 1h 6h 12h 24h"`
}

type UpdateEcommerceStoreRequest struct {
	Name         *string `json:"name" validate:"omitempty,min=1,max=255"`
	ApiURL       *string `json:"api_url" validate:"omitempty,url,max=500"`
	ApiEmail     *string `json:"api_email" validate:"omitempty,email,max=255"`
	ApiKey       *string `json:"api_key" validate:"omitempty,min=1,max=500"`
	IsActive     *bool   `json:"is_active"`
	SyncInterval *string `json:"sync_interval" validate:"omitempty,oneof=15m 30m 1h 6h 12h 24h"`
}

type EcommerceStoreResponse struct {
	ID            int     `json:"id"`
	ProjectID     int     `json:"project_id"`
	Platform      string  `json:"platform"`
	Name          string  `json:"name"`
	ApiURL        string  `json:"api_url"`
	IsActive      bool    `json:"is_active"`
	SyncInterval  string  `json:"sync_interval"`
	LastSyncedAt  *string `json:"last_synced_at"`
	ProductsCount int     `json:"products_count"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
}

type EcommerceStoreListResponse struct {
	Stores []EcommerceStoreResponse `json:"stores"`
}

type EcommerceSyncStatusResponse struct {
	StoreID       int     `json:"store_id"`
	Status        string  `json:"status"`
	Total         int     `json:"total"`
	Processed     int     `json:"processed"`
	Created       int     `json:"created"`
	Updated       int     `json:"updated"`
	Skipped       int     `json:"skipped"`
	Errors        int     `json:"errors"`
	ErrorMessages []string `json:"error_messages"`
}

type EcommerceTestResponse struct {
	Success       bool   `json:"success"`
	ProductsCount int    `json:"products_count"`
	Message       string `json:"message"`
}

type StoreCategoryResponse struct {
	ID         int     `json:"id"`
	StoreID    int     `json:"store_id"`
	ExternalID string  `json:"external_id"`
	Name       string  `json:"name"`
	ParentName *string `json:"parent_name"`
	FullPath   *string `json:"full_path"`
}

type StoreCategoryListResponse struct {
	Categories []StoreCategoryResponse `json:"categories"`
}

type CategoryMappingResponse struct {
	ID              int     `json:"id"`
	StoreID         int     `json:"store_id"`
	StoreCategoryID int     `json:"store_category_id"`
	CategoryName    string  `json:"category_name"`
	CategoryPath    *string `json:"category_path"`
	ProductType     string  `json:"product_type"`
	Gender          *string `json:"gender"`
}

type CategoryMappingListResponse struct {
	Mappings []CategoryMappingResponse `json:"mappings"`
}

type SaveCategoryMappingRequest struct {
	StoreCategoryID int     `json:"store_category_id" validate:"required"`
	ProductType     string  `json:"product_type" validate:"required,oneof=tops bottoms outerwear shoes accessories"`
	Gender          *string `json:"gender" validate:"omitempty,oneof=male female unisex"`
}

type SaveCategoryMappingsRequest struct {
	Mappings []SaveCategoryMappingRequest `json:"mappings" validate:"required,dive"`
}
