package model

import "time"

type EmailVerification struct {
	ID         int       `gorm:"primaryKey;autoIncrement"`
	UserID     int       `gorm:"not null"`
	Code       string    `gorm:"size:6;not null"`
	ExpiresAt  time.Time `gorm:"not null"`
	VerifiedAt *time.Time
	CreatedAt  time.Time
	DeletedAt  *time.Time `gorm:"index"`
}

func (EmailVerification) TableName() string {
	return "email_verifications"
}

func (ev *EmailVerification) IsExpired() bool {
	return time.Now().After(ev.ExpiresAt)
}
