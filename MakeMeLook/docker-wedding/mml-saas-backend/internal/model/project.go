package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type ProjectStatus string

const (
	ProjectStatusDraft  ProjectStatus = "draft"
	ProjectStatusActive ProjectStatus = "active"
	ProjectStatusPaused ProjectStatus = "paused"
)

type ProjectCategory string

const (
	ProjectCategoryClothing    ProjectCategory = "clothing"
	ProjectCategoryShoes       ProjectCategory = "shoes"
	ProjectCategoryAccessories ProjectCategory = "accessories"
	ProjectCategoryMulti       ProjectCategory = "multi"
)

type Project struct {
	ID                  int            `gorm:"primaryKey"`
	PublicID            uuid.UUID      `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid()"`
	OwnerID             int            `gorm:"index;not null"`
	Name                string         `gorm:"size:255;not null"`
	SiteURL             string         `gorm:"size:255;not null;index"`
	Category            *string        `gorm:"size:50"`
	TargetAudience      pq.StringArray `gorm:"type:text[]"`
	Description         *string        `gorm:"type:text"`
	LogoKey             *string        `gorm:"type:text"`
	Status              ProjectStatus  `gorm:"size:50;not null;default:'draft';index"`
	OnboardingCompleted bool           `gorm:"not null;default:false"`
	CreatedAt           time.Time      `gorm:"not null;index"`
	UpdatedAt           time.Time      `gorm:"not null"`
	DeletedAt           *time.Time     `gorm:"index"`
}

func (Project) TableName() string {
	return "projects"
}

func (p *Project) IsDraft() bool {
	return p.Status == ProjectStatusDraft
}

func (p *Project) IsActive() bool {
	return p.Status == ProjectStatusActive
}

func (p *Project) IsPaused() bool {
	return p.Status == ProjectStatusPaused
}
