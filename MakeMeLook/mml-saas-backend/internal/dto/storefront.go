package dto

// StorefrontPhotoResponse — photo for public storefront (no internal IDs).
type StorefrontPhotoResponse struct {
	URL       string `json:"url"`
	SortOrder int    `json:"sort_order"`
}

// StorefrontProductResponse — product for storefront list/carousel.
type StorefrontProductResponse struct {
	ID            string                    `json:"id"` // public_id UUID
	Name          string                    `json:"name"`
	Brand         *string                   `json:"brand"`
	Category      *string                   `json:"category"`
	Subcategory   *string                   `json:"subcategory"`
	Price         *float64                  `json:"price"`
	DiscountPrice *float64                  `json:"discount_price"`
	Currency      *string                   `json:"currency"`
	Color         *string                   `json:"color"`
	Sizes         []string                  `json:"sizes"`
	IsNew         bool                      `json:"is_new"`
	Photos        []StorefrontPhotoResponse `json:"photos"`
}

// StorefrontPriceRange — min/max price for the catalog filter UI.
type StorefrontPriceRange struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

// StorefrontFilters — aggregated filter options for the catalog UI.
type StorefrontFilters struct {
	Categories []string             `json:"categories"`
	Brands     []string             `json:"brands"`
	Colors     []string             `json:"colors"`
	PriceRange StorefrontPriceRange `json:"price_range"`
}

// StorefrontProductListResponse — response for product list endpoint.
type StorefrontProductListResponse struct {
	Products []StorefrontProductResponse `json:"products"`
	Total    int                         `json:"total"`
	Offset   int                         `json:"offset"`
	Limit    int                         `json:"limit"`
	Filters  StorefrontFilters           `json:"filters"`
}

// StorefrontRelatedProduct — minimal product card for related products section.
type StorefrontRelatedProduct struct {
	ID       string                    `json:"id"`
	Name     string                    `json:"name"`
	Brand    *string                   `json:"brand"`
	Price    *float64                  `json:"price"`
	Currency *string                   `json:"currency"`
	Photos   []StorefrontPhotoResponse `json:"photos"`
}

// StorefrontProductDetailResponse — response for single product detail endpoint.
type StorefrontProductDetailResponse struct {
	ID              string                     `json:"id"`
	Name            string                     `json:"name"`
	Brand           *string                    `json:"brand"`
	Category        *string                    `json:"category"`
	Subcategory     *string                    `json:"subcategory"`
	Price           *float64                   `json:"price"`
	DiscountPrice   *float64                   `json:"discount_price"`
	Currency        *string                    `json:"currency"`
	Color           *string                    `json:"color"`
	Material        *string                    `json:"material"`
	Sizes           []string                   `json:"sizes"`
	Description     *string                    `json:"description"`
	Season          []string                   `json:"season"`
	IsNew           bool                       `json:"is_new"`
	Photos          []StorefrontPhotoResponse  `json:"photos"`
	RelatedProducts []StorefrontRelatedProduct `json:"related_products"`
}

// StorefrontCategoryItem — single category with product count.
type StorefrontCategoryItem struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
}

// StorefrontCategoriesResponse — response for categories endpoint.
type StorefrontCategoriesResponse struct {
	Categories    []StorefrontCategoryItem `json:"categories"`
	TotalProducts int                      `json:"total_products"`
}
