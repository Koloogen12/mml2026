package dto

// StorefrontPhoto — one product photo as returned in the public storefront API.
type StorefrontPhoto struct {
	URL       string `json:"url"`
	SortOrder int    `json:"sort_order"`
}

// StorefrontProduct — product card returned in the public list endpoint.
// id is the public UUID (not the numeric primary key).
type StorefrontProduct struct {
	ID            string            `json:"id"` // public_id UUID
	Name          string            `json:"name"`
	Brand         *string           `json:"brand"`
	Category      *string           `json:"category"`
	Subcategory   *string           `json:"subcategory"`
	Price         *float64          `json:"price"`
	DiscountPrice *float64          `json:"discount_price"`
	Currency      *string           `json:"currency"`
	Color         *string           `json:"color"`
	Sizes         []string          `json:"sizes"`
	IsNew         bool              `json:"is_new"`
	Photos        []StorefrontPhoto `json:"photos"`
}

// StorefrontFilters — aggregated filter values returned together with the product list.
type StorefrontFilters struct {
	Categories []string `json:"categories"`
	Brands     []string `json:"brands"`
	Colors     []string `json:"colors"`
	PriceMin   float64  `json:"price_min"`
	PriceMax   float64  `json:"price_max"`
}

// StorefrontProductListResponse — response for GET /api/storefront/v1/{id}/products.
type StorefrontProductListResponse struct {
	Items   []StorefrontProduct `json:"items"`
	Total   int                 `json:"total"`
	Offset  int                 `json:"offset"`
	Limit   int                 `json:"limit"`
	Filters StorefrontFilters   `json:"filters"`
}

// StorefrontRelatedProduct — compact product used in the related_products list.
type StorefrontRelatedProduct struct {
	ID       string            `json:"id"`
	Name     string            `json:"name"`
	Brand    *string           `json:"brand"`
	Price    *float64          `json:"price"`
	Currency *string           `json:"currency"`
	Photos   []StorefrontPhoto `json:"photos"`
}

// StorefrontProductDetail — full product returned by GET /api/storefront/v1/{id}/products/{pid}.
type StorefrontProductDetail struct {
	StorefrontProduct
	Material        *string                    `json:"material"`
	Description     *string                    `json:"description"`
	Season          []string                   `json:"season"`
	RelatedProducts []StorefrontRelatedProduct `json:"related_products"`
}

// StorefrontCategoryItem — one row in the categories list.
type StorefrontCategoryItem struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}

// StorefrontCategoriesResponse — response for GET /api/storefront/v1/{id}/categories.
type StorefrontCategoriesResponse struct {
	Items []StorefrontCategoryItem `json:"items"`
}

