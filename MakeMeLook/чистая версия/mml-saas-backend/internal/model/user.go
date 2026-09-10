package model

import "time"

type UserStatus string

const (
	UserStatusPendingVerification UserStatus = "pending_verification"
	UserStatusActive              UserStatus = "active"
	UserStatusSuspended           UserStatus = "suspended"
)

type User struct {
	ID           int        `gorm:"primaryKey;autoIncrement"`
	Email        string     `gorm:"uniqueIndex;size:255;not null"`
	Name         string     `gorm:"size:255;not null"`
	LastName     *string    `gorm:"size:255"`
	PasswordHash string     `gorm:"size:255;not null"`
	Phone        *string    `gorm:"size:20"`
	Company      *string    `gorm:"size:255"`
	Website      *string    `gorm:"size:255"`
	Country      *string    `gorm:"size:2"`
	Timezone     *string    `gorm:"size:63"`
	AvatarBucket *string    `gorm:"size:63"`
	AvatarKey    *string    `gorm:"size:255"`
	Status       UserStatus `gorm:"size:50;not null;default:pending_verification"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    *time.Time `gorm:"index"`
}

func (User) TableName() string {
	return "users"
}

func (u *User) IsActive() bool {
	return u.Status == UserStatusActive
}

func (u *User) IsPendingVerification() bool {
	return u.Status == UserStatusPendingVerification
}
