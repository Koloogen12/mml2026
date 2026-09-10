package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type ProductSource string

const (
	ProductSourceManual ProductSource = "manual"
	ProductSourceCSV    ProductSource = "csv"
	ProductSourceAPI    ProductSource = "api"
)

type Product struct {
	ID            int            `gorm:"primaryKey"`
	PublicID      uuid.UUID      `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid()"`
	ProjectID     int            `gorm:"index;not null"`
	Name          string         `gorm:"size:255;not null"`
	SKU           *string        `gorm:"column:sku;size:100"`
	Category         *string `gorm:"size:50"`
	Subcategory      *string `gorm:"size:50"`
	CategoryFullPath *string `gorm:"column:category_full_path;type:text"`
	MarketingTag     *string `gorm:"column:marketing_tag;size:64"`
	Gender        *string        `gorm:"size:50"`
	Price         *float64       `gorm:"type:numeric(10,2)"`
	DiscountPrice *float64       `gorm:"column:discount_price;type:numeric(10,2)"`
	Currency      *string        `gorm:"size:10"`
	ProductURL    *string        `gorm:"column:product_url;type:text"`
	Season        pq.StringArray `gorm:"type:text[]"`
	Color         *string        `gorm:"size:100"`
	Material      *string        `gorm:"size:255"`
	Brand         *string        `gorm:"size:100"`
	Sizes         pq.StringArray `gorm:"type:text[]"`
	Description   *string        `gorm:"type:text"`
	IsActive      bool           `gorm:"column:is_active;not null;default:true;index"`
	Source        ProductSource  `gorm:"size:50;not null;default:'manual'"`
	ExternalID    *string          `gorm:"column:external_id;size:255"`
	StoreID       *int             `gorm:"column:store_id"`
	RawData       *json.RawMessage `gorm:"column:raw_data;type:jsonb"`
	SizeVariants  *json.RawMessage `gorm:"column:size_variants;type:jsonb"`
	SizeChart     *json.RawMessage `gorm:"column:size_chart;type:jsonb"`
	CreatedAt     time.Time      `gorm:"not null;index"`
	UpdatedAt     time.Time      `gorm:"not null"`
	DeletedAt     *time.Time     `gorm:"index"`

	// Preloaded associations
	Photos []ProductPhoto `gorm:"foreignKey:ProductID"`
}

func (Product) TableName() string {
	return "products"
}
