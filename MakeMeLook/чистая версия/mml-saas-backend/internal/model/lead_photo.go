package model

import (
	"time"

	"github.com/google/uuid"
)

type LeadPhoto struct {
	ID        int64      `gorm:"primaryKey"`
	PublicID  uuid.UUID  `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid()"`
	LeadID    int64      `gorm:"index;not null"`
	ObjectKey string     `gorm:"column:object_key;type:text;not null"`
	Type      string     `gorm:"size:50;not null;default:'model_photo'"`
	CreatedAt time.Time  `gorm:"not null"`
	DeletedAt *time.Time `gorm:"index"`
}

func (LeadPhoto) TableName() string {
	return "lead_photos"
}
