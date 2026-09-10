package dto

type CreateProductRequest struct {
	Name          string   `json:"name" validate:"required,min=1,max=255"`
	Category      *string  `json:"category" validate:"omitempty,oneof=outerwear tops bottoms shoes accessories"`
	Subcategory   *string  `json:"subcategory" validate:"omitempty,max=50"`
	Gender        *string  `json:"gender" validate:"omitempty,oneof=female male kids unisex"`
	SKU           *string  `json:"sku" validate:"omitempty,max=100"`
	Price         *float64 `json:"price" validate:"omitempty,min=0"`
	DiscountPrice *float64 `json:"discount_price" validate:"omitempty,min=0"`
	Currency      *string  `json:"currency" validate:"omitempty,oneof=RUB USD EUR GBP CNY"`
	ProductURL    *string  `json:"product_url" validate:"omitempty,url,max=2048"`
	Season        []string `json:"season" validate:"omitempty,dive,oneof=spring summer autumn winter all-season"`
	Color         *string  `json:"color" validate:"omitempty,max=100"`
	Material      *string  `json:"material" validate:"omitempty,max=255"`
	Brand         *string  `json:"brand" validate:"omitempty,max=100"`
	Sizes         []string `json:"sizes" validate:"omitempty"`
	Description   *string  `json:"description" validate:"omitempty,max=2000"`
	// Ordered list of pre-uploaded photo IDs. nil = don't touch photos; []int{} = clear all.
	PhotoIDs []int `json:"photo_ids"`
}

type BulkProductActionRequest struct {
	ProductIDs []int  `json:"product_ids" validate:"required,min=1"`
	Action     string `json:"action" validate:"required,oneof=activate deactivate delete add_to_group"`
	GroupID    *int   `json:"group_id"`
}

type ProductPhotoResponse struct {
	ID        int    `json:"id"`
	URL       string `json:"url"`
	SortOrder int    `json:"sort_order"`
}

type ProductResponse struct {
	ID            int                    `json:"id"`
	PublicID      string                 `json:"public_id"`
	ProjectID     int                    `json:"project_id"`
	Name          string                 `json:"name"`
	Category      *string                `json:"category"`
	Subcategory   *string                `json:"subcategory"`
	Gender        *string                `json:"gender"`
	SKU           *string                `json:"sku"`
	Price         *float64               `json:"price"`
	DiscountPrice *float64               `json:"discount_price"`
	Currency      *string                `json:"currency"`
	ProductURL    *string                `json:"product_url"`
	Season        []string               `json:"season"`
	Color         *string                `json:"color"`
	Material      *string                `json:"material"`
	Brand         *string                `json:"brand"`
	Sizes         []string               `json:"sizes"`
	Description   *string                `json:"description"`
	IsActive      bool                   `json:"is_active"`
	Source        string                 `json:"source"`
	Photos        []ProductPhotoResponse `json:"photos"`
	CreatedAt     string                 `json:"created_at"`
	UpdatedAt     string                 `json:"updated_at"`
}

type ProductListResponse struct {
	Products []ProductResponse `json:"products"`
	Total    int               `json:"total"`
	Offset   int               `json:"offset"`
	Limit    int               `json:"limit"`
}

type BulkActionResponse struct {
	Affected int    `json:"affected"`
	Message  string `json:"message"`
}

type PhotoOrderItem struct {
	ID        int `json:"id" validate:"min=1"`
	SortOrder int `json:"sort_order" validate:"min=0"`
}

type ReorderPhotosRequest struct {
	Orders []PhotoOrderItem `json:"orders" validate:"required,min=1"`
}
