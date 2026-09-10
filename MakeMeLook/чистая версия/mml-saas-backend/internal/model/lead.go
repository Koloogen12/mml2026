package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Lead struct {
	ID           int64     `gorm:"primaryKey"`
	ProjectID    int       `gorm:"index;not null"`
	SessionToken uuid.UUID `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid()"`

	// Body parameters
	Gender     *string `gorm:"size:50"`
	Height     *int
	Weight     *int
	Chest      *int
	Waist      *int
	Hip        *int
	Size       *string `gorm:"size:10"`
	BellyShape *string `gorm:"column:belly_shape;size:50"`
	FigureType *string `gorm:"column:figure_type;size:50"`

	// Contact
	Email *string `gorm:"size:255"`
	Phone *string `gorm:"size:20"`

	// Auth
	AuthCode          *string    `gorm:"column:auth_code;size:6"`
	AuthCodeExpiresAt *time.Time `gorm:"column:auth_code_expires_at"`
	IsAuthenticated   bool       `gorm:"column:is_authenticated;not null;default:false"`
	AuthProvider      *string    `gorm:"column:auth_provider;size:20"`

	// Technical
	IP         *string         `gorm:"column:ip;size:45"`
	UserAgent  *string         `gorm:"column:user_agent;type:text"`
	DeviceInfo json.RawMessage `gorm:"column:device_info;type:jsonb"`

	// Visit tracking
	FirstVisitAt time.Time `gorm:"column:first_visit_at;not null"`
	LastVisitAt  time.Time `gorm:"column:last_visit_at;not null"`
	VisitCount   int       `gorm:"column:visit_count;not null;default:1"`

	CreatedAt time.Time  `gorm:"not null;index"`
	UpdatedAt time.Time  `gorm:"not null"`
	DeletedAt *time.Time `gorm:"index"`

	// Associations
	Photos    []LeadPhoto    `gorm:"foreignKey:LeadID"`
	TryOns    []LeadTryOn    `gorm:"foreignKey:LeadID"`
	Favorites []LeadFavorite `gorm:"foreignKey:LeadID"`
	CartItems []LeadCartItem `gorm:"foreignKey:LeadID"`
}

func (Lead) TableName() string {
	return "leads"
}
