package model

import "time"

type ProductPhoto struct {
	ID          int        `gorm:"primaryKey"`
	ProductID   *int       `gorm:"column:product_id;index"` // nullable: NULL until attached to a product
	ProjectID   *int       `gorm:"column:project_id;index"` // project this photo belongs to
	ObjectKey   string     `gorm:"column:object_key;type:text"`
	OriginalKey *string    `gorm:"column:original_key;type:text"`
	ExternalURL *string    `gorm:"column:external_url;type:text"`
	SortOrder   int        `gorm:"column:sort_order;not null;default:0"`
	UploadedBy  *int       `gorm:"column:uploaded_by"` // user who uploaded (for ownership check)
	CreatedAt   time.Time  `gorm:"not null"`
	DeletedAt   *time.Time `gorm:"index"`
}

func (ProductPhoto) TableName() string {
	return "product_photos"
}
