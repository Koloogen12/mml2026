package model

import (
	"time"

	"github.com/google/uuid"
)

type Avatar struct {
	ID           int16      `gorm:"primaryKey"`
	PublicID     uuid.UUID  `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid()"`
	Gender       string     `gorm:"size:50;not null"`
	FigureType   string     `gorm:"column:figure_type;size:50;not null"`
	HeightMin    *int       `gorm:"column:height_min"`
	HeightMax    *int       `gorm:"column:height_max"`
	WeightMin    *int       `gorm:"column:weight_min"`
	WeightMax    *int       `gorm:"column:weight_max"`
	SizeEU       *string    `gorm:"column:size_eu;size:10"`
	PhotoKey     string     `gorm:"column:photo_key;type:text;not null"`
	ThumbnailKey *string    `gorm:"column:thumbnail_key;type:text"`
	IsActive     bool       `gorm:"column:is_active;not null;default:true;index"`
	SortOrder    int        `gorm:"column:sort_order;not null;default:0"`
	CreatedAt    time.Time  `gorm:"not null"`
	DeletedAt    *time.Time `gorm:"index"`
}

func (Avatar) TableName() string {
	return "avatars"
}
