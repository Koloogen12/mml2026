package model

import "time"

type EcommercePlatform string

const (
	EcommercePlatformCSCart     EcommercePlatform = "cs-cart"
	EcommercePlatformOpenCart   EcommercePlatform = "opencart"
	// EcommercePlatformCustomFeed pulls a JSON catalog from a customer-hosted
	// HTTPS endpoint with Bearer-token auth. ApiURL holds the feed URL,
	// ApiKey holds the bearer token, ApiEmail is unused.
	EcommercePlatformCustomFeed EcommercePlatform = "custom-feed"
)

type EcommerceStore struct {
	ID            int               `gorm:"primaryKey"`
	ProjectID     int               `gorm:"index;not null"`
	Platform      EcommercePlatform `gorm:"size:50;not null"`
	Name          string            `gorm:"size:255;not null"`
	ApiURL        string            `gorm:"column:api_url;size:500;not null"`
	ApiEmail      string            `gorm:"column:api_email;size:255;not null;default:''"`
	ApiKey        string            `gorm:"column:api_key;size:500;not null"`
	IsActive      bool              `gorm:"column:is_active;not null;default:true"`
	SyncInterval  string            `gorm:"column:sync_interval;size:20;not null;default:'1h'"`
	LastSyncedAt  *time.Time        `gorm:"column:last_synced_at"`
	ProductsCount int               `gorm:"column:products_count;not null;default:0"`
	CreatedAt     time.Time         `gorm:"not null"`
	UpdatedAt     time.Time         `gorm:"not null"`
	DeletedAt     *time.Time        `gorm:"index"`
}

func (EcommerceStore) TableName() string {
	return "ecommerce_stores"
}
