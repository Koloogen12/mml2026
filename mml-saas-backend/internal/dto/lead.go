package dto

// ── Admin lead DTOs (SaaS cabinet) ──────────────────────────────────────────

type AdminLeadResponse struct {
	ID           int64                  `json:"id"`
	ProjectID    int                    `json:"project_id"`
	SessionToken string                 `json:"session_token"`
	Gender       *string                `json:"gender,omitempty"`
	Height       *int                   `json:"height,omitempty"`
	Weight       *int                   `json:"weight,omitempty"`
	Chest        *int                   `json:"chest,omitempty"`
	Waist        *int                   `json:"waist,omitempty"`
	Hip          *int                   `json:"hip,omitempty"`
	Size         *string                `json:"size,omitempty"`
	BellyShape   *string                `json:"belly_shape,omitempty"`
	FigureType   *string                `json:"figure_type,omitempty"`
	Email        *string                `json:"email,omitempty"`
	IP           *string                `json:"ip,omitempty"`
	UserAgent    *string                `json:"user_agent,omitempty"`
	DeviceInfo   map[string]interface{} `json:"device_info,omitempty"`
	FirstVisitAt string                 `json:"first_visit_at"`
	LastVisitAt  string                 `json:"last_visit_at"`
	VisitCount   int                    `json:"visit_count"`
	TryOnCount   int                    `json:"tryon_count"`
	CreatedAt    string                 `json:"created_at"`
	UpdatedAt    string                 `json:"updated_at"`
}

type AdminLeadListResponse struct {
	Leads  []AdminLeadResponse `json:"leads"`
	Total  int                 `json:"total"`
	Offset int                 `json:"offset"`
	Limit  int                 `json:"limit"`
}

type AdminLeadPhotoResponse struct {
	ID        int64  `json:"id"`
	PublicID  string `json:"public_id"`
	URL       string `json:"url"`
	Type      string `json:"type"`
	CreatedAt string `json:"created_at"`
}

type AdminLeadTryOnProductResponse struct {
	ID       int     `json:"id"`
	Name     string  `json:"name"`
	Category *string `json:"category,omitempty"`
	PhotoURL *string `json:"photo_url,omitempty"`
}

type AdminLeadTryOnResponse struct {
	ID               int64                          `json:"id"`
	PublicID         string                         `json:"public_id"`
	ResultURL        string                         `json:"result_url"`
	ModelPhoto       *AdminLeadPhotoResponse        `json:"model_photo,omitempty"`
	OuterwearProduct *AdminLeadTryOnProductResponse `json:"outerwear_product,omitempty"`
	TopsProduct      *AdminLeadTryOnProductResponse `json:"tops_product,omitempty"`
	BottomsProduct   *AdminLeadTryOnProductResponse `json:"bottoms_product,omitempty"`
	CreatedAt        string                         `json:"created_at"`
}

type AdminLeadFavoriteResponse struct {
	ID        int64  `json:"id"`
	PublicID  string `json:"public_id"`
	ImageURL  string `json:"image_url"`
	TryOnID   *int64 `json:"try_on_id,omitempty"`
	CreatedAt string `json:"created_at"`
}

type AdminLeadCartItemResponse struct {
	ID        int64                          `json:"id"`
	PublicID  string                         `json:"public_id"`
	Product   *AdminLeadTryOnProductResponse `json:"product,omitempty"`
	TryOnID   *int64                         `json:"try_on_id,omitempty"`
	CreatedAt string                         `json:"created_at"`
}

type AdminLeadDetailResponse struct {
	AdminLeadResponse
	Photos    []AdminLeadPhotoResponse    `json:"photos"`
	TryOns    []AdminLeadTryOnResponse    `json:"try_ons"`
	Favorites []AdminLeadFavoriteResponse `json:"favorites"`
	CartItems []AdminLeadCartItemResponse `json:"cart_items"`
}
