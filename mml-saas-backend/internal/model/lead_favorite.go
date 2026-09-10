package model

import (
	"time"

	"github.com/google/uuid"
)

type LeadFavorite struct {
	ID        int64      `gorm:"primaryKey"`
	PublicID  uuid.UUID  `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid()"`
	LeadID    int64      `gorm:"index;not null"`
	TryOnID   *int64     `gorm:"column:try_on_id;index"`
	ImageKey  string     `gorm:"column:image_key;type:text;not null"`
	CreatedAt time.Time  `gorm:"not null"`
	DeletedAt *time.Time `gorm:"index"`

	TryOn *LeadTryOn `gorm:"foreignKey:TryOnID"`
}

func (LeadFavorite) TableName() string {
	return "lead_favorites"
}
