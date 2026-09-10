package model

import "time"

type ProductGroup struct {
	ID          int        `gorm:"primaryKey"`
	ProjectID   int        `gorm:"index;not null"`
	Name        string     `gorm:"size:255;not null"`
	Description *string    `gorm:"type:text"`
	IsActive    bool       `gorm:"column:is_active;not null;default:false"`
	IsPermanent bool       `gorm:"column:is_permanent;not null;default:false"`
	CreatedAt   time.Time  `gorm:"not null"`
	UpdatedAt   time.Time  `gorm:"not null"`
	DeletedAt   *time.Time `gorm:"index"`
}

func (ProductGroup) TableName() string {
	return "product_groups"
}

type ProductGroupItem struct {
	ProductID int        `gorm:"primaryKey"`
	GroupID   int        `gorm:"column:group_id;primaryKey"`
	CreatedAt time.Time  `gorm:"not null"`
	DeletedAt *time.Time `gorm:"index"`
}

func (ProductGroupItem) TableName() string {
	return "product_group_items"
}
