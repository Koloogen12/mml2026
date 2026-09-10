package model

import "time"

type AuthSession struct {
	ID               int       `gorm:"primaryKey;autoIncrement"`
	UserID           int       `gorm:"not null"`
	DeviceID         *string   `gorm:"size:255"`
	DeviceName       *string   `gorm:"size:255"`
	IP               *string   `gorm:"size:45"`
	UserAgent        *string   `gorm:"type:text"`
	RefreshToken     string    `gorm:"uniqueIndex;type:text;not null"`
	RefreshExpiresAt time.Time `gorm:"not null"`
	LastActivityAt   *time.Time
	CreatedAt        time.Time
	DeletedAt        *time.Time `gorm:"index"`
}

func (AuthSession) TableName() string {
	return "auth_sessions"
}

func (s *AuthSession) IsExpired() bool {
	return time.Now().After(s.RefreshExpiresAt)
}
