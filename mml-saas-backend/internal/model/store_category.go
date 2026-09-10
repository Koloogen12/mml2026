package model

import "time"

type StoreCategory struct {
	ID             int       `gorm:"primaryKey"`
	StoreID        int       `gorm:"not null;uniqueIndex:idx_store_categories_unique"`
	ExternalID     string    `gorm:"column:external_id;size:255;not null;uniqueIndex:idx_store_categories_unique"`
	Name           string    `gorm:"size:255;not null"`
	ParentName     *string   `gorm:"column:parent_name;size:255"`
	FullPath       *string   `gorm:"column:full_path;size:500"`
	IsMarketingTag bool      `gorm:"column:is_marketing_tag;not null;default:false"`
	CreatedAt      time.Time `gorm:"not null"`
	UpdatedAt      time.Time `gorm:"not null"`
}

func (StoreCategory) TableName() string {
	return "store_categories"
}

type CategoryMapping struct {
	ID              int       `gorm:"primaryKey"`
	StoreID         int       `gorm:"not null;uniqueIndex:idx_category_mappings_unique"`
	StoreCategoryID int       `gorm:"column:store_category_id;not null;uniqueIndex:idx_category_mappings_unique"`
	ProductType     string    `gorm:"column:product_type;size:50;not null"`
	Gender          *string   `gorm:"size:50"`
	CreatedAt       time.Time `gorm:"not null"`
	UpdatedAt       time.Time `gorm:"not null"`

	StoreCategory *StoreCategory `gorm:"foreignKey:StoreCategoryID"`
}

func (CategoryMapping) TableName() string {
	return "category_mappings"
}
