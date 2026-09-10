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

type TryonProvider string

// Try-on providers, in customer-facing display order:
//
//   - cometapi-gemini  (MML V1) — routes Gemini through CometAPI. The
//     RU-friendly fallback gateway. Slower than fal.ai but historically
//     the only Gemini route that worked reliably from RU networks.
//   - gemini           (MML V2) — direct Google AI Studio via the AI
//     proxy chain. Backup for when CometAPI is down.
//   - fal-nb1          (MML V3) — fal.ai gateway to Nano Banana 1
//     (gemini-2.5-flash-image). ~14s/img, ~$0.04/img. Same Gemini model
//     as cometapi-gemini, just a faster gateway (~45% faster on Pro,
//     similar on flash). See service/tryon_fal.go for the comparison.
//   - fal-nb2          (MML V4) — fal.ai gateway to Nano Banana 2
//     (gemini-3-pro-image-preview). ~27s/img, ~$0.10/img. Best fidelity
//     on detailed garments, but pricier. Use for premium demos.
//   - cometapi-gptimage (MML V5) — OpenAI GPT Image 2.5 through CometAPI,
//     current default. Chosen over cometapi-gemini on measured data:
//     comparable garment/identity fidelity, ~15× faster on layered looks
//     (18s vs 273s for a 4-garment outfit), and cheaper per image. The
//     primary model is Sunburst specifically because Flare's moderation
//     is a coin flip on lace/sheer/décolleté garments (4 blocks in 8 runs
//     on the same dress) while Sunburst passed 6/6 — refusals cost us
//     customers, so we buy consistency. Falls back to Flare, then
//     cross-provider to cometapi-gemini, so a GPT outage never kills a
//     try-on. See service/tryon_cometapi_gptimage.go.
//
// Historical: `fal-tryon` was a brief experiment with fal.ai's
// FASHN-tryon try-on-specialized model (2026-05-14). Killed because
// garment-detail fidelity was poor. The value is kept here so any row
// that still references it remains valid in the DB constraint, but the
// dispatcher silently routes it to cometapi-gemini.
const (
	TryonProviderCometAPIGPTImage TryonProvider = "cometapi-gptimage"
	TryonProviderCometAPIGemini   TryonProvider = "cometapi-gemini"
	TryonProviderGemini           TryonProvider = "gemini"
	TryonProviderFalNB1         TryonProvider = "fal-nb1"
	TryonProviderFalNB2         TryonProvider = "fal-nb2"
	TryonProviderFal            TryonProvider = "fal-tryon" // deprecated, see comment above
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
	TryonProvider       TryonProvider  `gorm:"size:32;not null;default:'cometapi-gemini'"`
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
