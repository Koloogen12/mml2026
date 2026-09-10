package model

import "time"

type PasswordReset struct {
	ID        int       `gorm:"primaryKey;autoIncrement"`
	UserID    int       `gorm:"not null"`
	Code      string    `gorm:"size:6;not null"`
	ExpiresAt time.Time `gorm:"not null"`
	UsedAt    *time.Time
	CreatedAt time.Time
	DeletedAt *time.Time `gorm:"index"`
}

func (PasswordReset) TableName() string {
	return "password_resets"
}

func (pr *PasswordReset) IsExpired() bool {
	return time.Now().After(pr.ExpiresAt)
}
