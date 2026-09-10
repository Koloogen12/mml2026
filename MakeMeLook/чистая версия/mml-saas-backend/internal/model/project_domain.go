package model

import "time"

type ProjectDomain struct {
	ID                 int        `gorm:"primaryKey"`
	ProjectID          int        `gorm:"index;not null"`
	Domain             string     `gorm:"size:255;not null"`
	IsVerified         bool       `gorm:"not null;default:false"`
	VerificationMethod *string    `gorm:"size:50"`
	VerificationToken  *string    `gorm:"size:255"`
	VerifiedAt         *time.Time `gorm:"type:timestamptz(6)"`
	CreatedAt          time.Time  `gorm:"not null"`
	DeletedAt          *time.Time `gorm:"index"`
}

func (ProjectDomain) TableName() string {
	return "project_domains"
}

func (pd *ProjectDomain) IsLocalhost() bool {
	return pd.Domain == "localhost"
}
