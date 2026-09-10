package model

import "time"

// WaitlistSignup is a public pre-launch waitlist entry (makemelook.ai landing).
type WaitlistSignup struct {
	ID        int64     `gorm:"primaryKey"`
	Phone     string    `gorm:"column:phone;size:32;uniqueIndex;not null"`
	Source    string    `gorm:"column:source;size:50;not null;default:makemelook_ai"`
	IP        string    `gorm:"column:ip;size:45"`
	UserAgent string    `gorm:"column:user_agent;size:512"`
	CreatedAt time.Time `gorm:"not null"`
}

func (WaitlistSignup) TableName() string {
	return "waitlist_signups"
}
