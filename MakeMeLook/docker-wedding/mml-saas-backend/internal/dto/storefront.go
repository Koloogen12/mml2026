package dto

// StorefrontPhotoResponse — публичное фото товара (без internal ID)
type StorefrontPhotoResponse struct {
	URL       string `json:"url"`
	SortOrder int    `json:"sort_order"`
}

// StorefrontProductResponse — карточка товара в листинге
type StorefrontProductResponse struct {
	ID          string                    `json:"id"` // public UUID
	Name        string                    `json:"name"`
	Brand       *string                   `json:"brand,omitempty"`
	Category    *string                   `json:"category,omitempty"`
	Gender      *string                   `json:"gender,omitempty"`
	Price       *float64                  `json:"price,omitempty"`
	Currency    *string                   `json:"currency,omitempty"`
	Color       *string                   `json:"color,omitempty"`
	Photos      []StorefrontPhotoResponse `json:"photos"`
	ProductURL  *string                   `json:"product_url,omitempty"`
}

// StorefrontRelatedProduct — упрощённая карточка для блока "похожие товары"
type StorefrontRelatedProduct struct {
	ID       string                    `json:"id"`
	Name     string                    `json:"name"`
	Brand    *string                   `json:"brand,omitempty"`
	Price    *float64                  `json:"price,omitempty"`
	Currency *string                   `json:"currency,omitempty"`
	Photos   []StorefrontPhotoResponse `json:"photos"`
}

// StorefrontProductDetailResponse — полная карточка товара
type StorefrontProductDetailResponse struct {
	ID             string                     `json:"id"`
	Name           string                     `json:"name"`
	Brand          *string                    `json:"brand,omitempty"`
	Category       *string                    `json:"category,omitempty"`
	Subcategory    *string                    `json:"subcategory,omitempty"`
	Gender         *string                    `json:"gender,omitempty"`
	Price          *float64                   `json:"price,omitempty"`
	DiscountPrice  *float64                   `json:"discount_price,omitempty"`
	Currency       *string                    `json:"currency,omitempty"`
	Color          *string                    `json:"color,omitempty"`
	Material       *string                    `json:"material,omitempty"`
	Sizes          []string                   `json:"sizes"`
	Description    *string                    `json:"description,omitempty"`
	ProductURL     *string                    `json:"product_url,omitempty"`
	Photos         []StorefrontPhotoResponse  `json:"photos"`
	RelatedProducts []StorefrontRelatedProduct `json:"related_products"`
}

// StorefrontFiltersAgg — агрегированные фильтры для листинга
type StorefrontFiltersAgg struct {
	Categories []string `json:"categories"`
	Brands     []string `json:"brands"`
	Colors     []string `json:"colors"`
	PriceMin   float64  `json:"price_min"`
	PriceMax   float64  `json:"price_max"`
}

// StorefrontProductListResponse — ответ листинга
type StorefrontProductListResponse struct {
	Items   []StorefrontProductResponse `json:"items"`
	Total   int64                       `json:"total"`
	Offset  int                         `json:"offset"`
	Limit   int                         `json:"limit"`
	Filters StorefrontFiltersAgg        `json:"filters"`
}

// StorefrontCategoryItem — категория с количеством товаров
type StorefrontCategoryItem struct {
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

// StorefrontCategoriesResponse — список категорий
type StorefrontCategoriesResponse struct {
	Items []StorefrontCategoryItem `json:"items"`
}
