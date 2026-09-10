package catalog

import (
	"encoding/json"
	"time"
)

type Brand struct {
	ID          int64  `json:"-"`
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	LogoURL     string `json:"logo_url,omitempty"`
	Description string `json:"description,omitempty"`
}

type Product struct {
	PublicID      string          `json:"id"`
	Brand         Brand           `json:"brand"`
	Name          string          `json:"name"`
	Description   string          `json:"description,omitempty"`
	Gender        string          `json:"gender,omitempty"`
	GarmentZone   string          `json:"garment_zone,omitempty"`
	Category      string          `json:"category,omitempty"`
	Subcategory   string          `json:"subcategory,omitempty"`
	Color         string          `json:"color,omitempty"`
	Material      string          `json:"material,omitempty"`
	Attributes    json.RawMessage `json:"attributes,omitempty"`
	TryonEligible bool            `json:"tryon_eligible"`
	Images        []Image         `json:"images"`
	Offers        []Offer         `json:"offers"`
	CreatedAt     time.Time       `json:"-"`
}

type Offer struct {
	Retailer     string   `json:"retailer"`
	RetailerSlug string   `json:"retailer_slug"`
	Price        float64  `json:"price"`
	OldPrice     *float64 `json:"old_price,omitempty"`
	Currency     string   `json:"currency"`
	Sizes        []string `json:"sizes,omitempty"`
	InStock      bool     `json:"in_stock"`
	ProductURL   string   `json:"-"` // наружу не отдаём: переход только через /r/ с click_id
}

type Image struct {
	URL      string `json:"url"`
	Position int    `json:"position"`
	Kind     string `json:"kind"`
}

type ListFilter struct {
	Query  string
	Zone   string
	Gender string
	Brand  string
	// IDs — выборка конкретных товаров по public_id (избранное, коллекции):
	// они могут лежать вне текущей витрины, фильтр по полу к ним не применяем.
	IDs      []string
	MaxPrice float64
	MinPrice float64
	Limit    int
	Offset   int
}
