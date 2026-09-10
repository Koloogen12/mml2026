package model

import (
	"time"

	"github.com/google/uuid"
)

type TryOnStatus string

const (
	TryOnStatusProcessing TryOnStatus = "processing"
	TryOnStatusDone       TryOnStatus = "done"
	TryOnStatusError      TryOnStatus = "error"
)

type LeadTryOn struct {
	ID                 int64       `gorm:"primaryKey"`
	PublicID           uuid.UUID   `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid()"`
	LeadID             int64       `gorm:"index;not null"`
	Status             TryOnStatus `gorm:"column:status;size:20;not null;default:'done'"`
	ResultKey          *string     `gorm:"column:result_key;type:text"`
	ModelPhotoID       *int64      `gorm:"column:model_photo_id"`
	OuterwearProductID   *int        `gorm:"column:outerwear_product_id"`
	TopsProductID        *int        `gorm:"column:tops_product_id"`
	BottomsProductID     *int        `gorm:"column:bottoms_product_id"`
	ShoesProductID       *int        `gorm:"column:shoes_product_id"`
	AccessoriesProductID *int        `gorm:"column:accessories_product_id"`
	CreatedAt            time.Time   `gorm:"not null;index"`
	DeletedAt            *time.Time  `gorm:"index"`

	// Associations
	ModelPhoto         *LeadPhoto `gorm:"foreignKey:ModelPhotoID"`
	OuterwearProduct   *Product   `gorm:"foreignKey:OuterwearProductID"`
	TopsProduct        *Product   `gorm:"foreignKey:TopsProductID"`
	BottomsProduct     *Product   `gorm:"foreignKey:BottomsProductID"`
	ShoesProduct       *Product   `gorm:"foreignKey:ShoesProductID"`
	AccessoriesProduct *Product   `gorm:"foreignKey:AccessoriesProductID"`
}

func (LeadTryOn) TableName() string {
	return "lead_try_ons"
}
