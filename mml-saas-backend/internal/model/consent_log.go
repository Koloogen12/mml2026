package model

import "time"

type ConsentLog struct {
	ID            int64     `gorm:"primaryKey"`
	ProjectID     int       `gorm:"index;not null"`
	LeadID        *int64    `gorm:"column:lead_id;index"`
	SessionToken  string    `gorm:"column:session_token;size:255;not null"`
	PolicyType    string    `gorm:"column:policy_type;size:50;not null"`
	PolicyVersion string    `gorm:"column:policy_version;size:50;not null"`
	Locale        string    `gorm:"column:locale;size:10;not null;default:ru"`
	ConsentedAt   time.Time `gorm:"column:consented_at;not null"`
	IP            string    `gorm:"column:ip;size:45;not null"`
	UserAgent     string    `gorm:"column:user_agent;size:512;not null"`
	CreatedAt     time.Time `gorm:"not null"`
}

func (ConsentLog) TableName() string {
	return "consent_logs"
}
