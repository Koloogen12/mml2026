package model

import (
	"time"

	"github.com/google/uuid"
)

type LeadCartItem struct {
	ID        int64      `gorm:"primaryKey"`
	PublicID  uuid.UUID  `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid()"`
	LeadID    int64      `gorm:"index;not null"`
	ProductID int        `gorm:"column:product_id;index;not null"`
	TryOnID   *int64     `gorm:"column:try_on_id"`
	CreatedAt time.Time  `gorm:"not null"`
	DeletedAt *time.Time `gorm:"index"`

	Product *Product   `gorm:"foreignKey:ProductID"`
	TryOn   *LeadTryOn `gorm:"foreignKey:TryOnID"`
}

func (LeadCartItem) TableName() string {
	return "lead_cart_items"
}
