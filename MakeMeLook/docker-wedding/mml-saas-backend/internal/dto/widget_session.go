package dto

// --- Session (Lead) ---

type CreateSessionRequest struct {
	ProjectID    string  `json:"project_id" validate:"required"`
	Gender       *string `json:"gender"`
	Height       *int    `json:"height"`
	Weight       *int    `json:"weight"`
	Chest        *int    `json:"chest"`
	Waist        *int    `json:"waist"`
	Hip          *int    `json:"hip"`
	Size         *string `json:"size"`
	BellyShape   *string `json:"belly_shape"`
	FigureType   *string `json:"figure_type"`
	IP           string  `json:"-"`
	UserAgent    string  `json:"-"`
	Origin       string  `json:"-"` // for domain verification
	SessionToken string  `json:"-"` // generated server-side
}

type UpdateSessionRequest struct {
	Gender     *string `json:"gender"`
	Height     *int    `json:"height"`
	Weight     *int    `json:"weight"`
	Chest      *int    `json:"chest"`
	Waist      *int    `json:"waist"`
	Hip        *int    `json:"hip"`
	Size       *string `json:"size"`
	BellyShape *string `json:"belly_shape"`
	FigureType *string `json:"figure_type"`
	Email      *string `json:"email"`
}

type SessionResponse struct {
	SessionToken  string              `json:"session_token"`
	Gender        string              `json:"gender,omitempty"`
	Height        int                 `json:"height,omitempty"`
	Weight        int                 `json:"weight,omitempty"`
	Chest         int                 `json:"chest,omitempty"`
	Waist         int                 `json:"waist,omitempty"`
	Hip           int                 `json:"hip,omitempty"`
	Size          string              `json:"size,omitempty"`
	BellyShape    string              `json:"belly_shape,omitempty"`
	FigureType    string              `json:"figure_type,omitempty"`
	Email         string              `json:"email,omitempty"`
	Phone         string              `json:"phone,omitempty"`
	ModelPhotoID    *string              `json:"model_photo_id,omitempty"`
	ModelPhotoURL   *string              `json:"model_photo_url,omitempty"`
	LastTryOn       *TryOnStatusResponse `json:"last_try_on,omitempty"`
	IsAuthenticated bool                 `json:"is_authenticated"`
}

// SessionWithConfigResponse is returned by POST /sessions and GET /sessions/{token}.
// Combines session state and widget config so the loader needs only one request.
type SessionWithConfigResponse struct {
	SessionResponse
	Config WidgetConfigPublicResponse `json:"config"`
}

// --- Photo ---

type UploadPhotoResponse struct {
	ID       string `json:"id"`
	PublicID string `json:"public_id"`
	URL      string `json:"url"`
}

// --- Try-on ---

type TryOnRequest struct {
	ModelPhotoID string   `json:"model_photo_id" validate:"required"`
	ProductIDs   []string `json:"product_ids" validate:"required,min=1,max=3"`
}

type TryOnAcceptedResponse struct {
	PublicID string `json:"public_id"`
	Status   string `json:"status"`
}

type TryOnStatusResponse struct {
	PublicID  string             `json:"public_id"`
	Status    string             `json:"status"`
	ResultURL string             `json:"result_url,omitempty"`
	ResultKey string             `json:"result_key,omitempty"`
	Products  []TryOnProductInfo `json:"products,omitempty"`
}

type TryOnResponse struct {
	ID        string             `json:"id"`
	PublicID  string             `json:"public_id"`
	ResultURL string             `json:"result_url"`
	Products  []TryOnProductInfo `json:"products"`
}

type TryOnProductInfo struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
}

// ShareViewResponse is returned by the public share endpoint.
type ShareViewResponse struct {
	ResultURL   string             `json:"result_url"`
	Products    []TryOnProductInfo `json:"products,omitempty"`
	CreatedAt   string             `json:"created_at"`
	ProjectName string             `json:"project_name,omitempty"`
	SiteURL     string             `json:"site_url,omitempty"`
}

type TryOnHistoryItem struct {
	ID        string             `json:"id"`
	PublicID  string             `json:"public_id"`
	ResultURL string             `json:"result_url"`
	Products  []TryOnProductInfo `json:"products"`
	CreatedAt string             `json:"created_at"`
}

// --- Avatars ---

type AvatarResponse struct {
	ID           string  `json:"id"`
	PublicID     string  `json:"public_id"`
	Gender       string  `json:"gender"`
	FigureType   string  `json:"figure_type"`
	HeightMin    *int    `json:"height_min,omitempty"`
	HeightMax    *int    `json:"height_max,omitempty"`
	WeightMin    *int    `json:"weight_min,omitempty"`
	WeightMax    *int    `json:"weight_max,omitempty"`
	SizeEU       *string `json:"size_eu,omitempty"`
	PhotoURL     string  `json:"photo_url"`
	ThumbnailURL string  `json:"thumbnail_url"`
}

// --- Favorites ---

type AddFavoriteRequest struct {
	TryOnID  *string `json:"try_on_id"`
	ImageKey string  `json:"image_key" validate:"required"`
}

type FavoriteResponse struct {
	ID        string `json:"id"`
	PublicID  string `json:"public_id"`
	TryOnID   string `json:"try_on_id,omitempty"`
	ImageURL  string `json:"image_url"`
	CreatedAt string `json:"created_at"`
}

// --- Cart ---

type AddCartItemRequest struct {
	ProductID string  `json:"product_id" validate:"required"`
	TryOnID   *string `json:"try_on_id"`
}

type CartItemResponse struct {
	ID        string              `json:"id"`
	PublicID  string              `json:"public_id"`
	Product   WidgetProductPublic `json:"product"`
	TryOnID   string              `json:"try_on_id,omitempty"`
	CreatedAt string              `json:"created_at"`
}

// --- Events ---

type WidgetEventRequest struct {
	SessionToken string            `json:"session_token" validate:"required"`
	ProjectID    string            `json:"project_id" validate:"required"`
	Events       []WidgetEventItem `json:"events" validate:"required,min=1,max=10"`
}

type WidgetEventItem struct {
	EventType string         `json:"event_type" validate:"required"`
	EventData map[string]any `json:"event_data"`
	PageURL   string         `json:"page_url"`
}

// --- Product Sync (auto-import from platform DOM) ---

type SyncProductItem struct {
	Name        string   `json:"name" validate:"required"`
	Price       *float64 `json:"price"`
	Currency    string   `json:"currency"`
	Description string   `json:"description"`
	ImageURLs   []string `json:"image_urls"`
	ProductURL  string   `json:"product_url"`
	ExternalID  string   `json:"external_id"`
}

type SyncProductsRequest struct {
	Platform string            `json:"platform" validate:"required"`
	Products []SyncProductItem `json:"products" validate:"required,min=1,max=100"`
}

type SyncProductsResponse struct {
	Created int `json:"created"`
	Updated int `json:"updated"`
	Skipped int `json:"skipped"`
	Total   int `json:"total"`
}
