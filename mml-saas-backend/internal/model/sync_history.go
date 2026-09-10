package model

import (
	"encoding/json"
	"time"
)

// SyncHistory is one persisted record of a completed (or failed) sync run
// for an ecommerce store. The in-memory SyncJob in service holds the live
// state of a running sync; SyncHistory is the audit trail.
type SyncHistory struct {
	ID            int              `gorm:"primaryKey"`
	StoreID       int              `gorm:"column:store_id;not null;index"`
	StartedAt     time.Time        `gorm:"column:started_at;not null"`
	FinishedAt    time.Time        `gorm:"column:finished_at;not null"`
	Status        string           `gorm:"size:20;not null"`
	Total         int              `gorm:"not null;default:0"`
	Processed     int              `gorm:"not null;default:0"`
	CreatedCount  int              `gorm:"column:created_count;not null;default:0"`
	UpdatedCount  int              `gorm:"column:updated_count;not null;default:0"`
	SkippedCount  int              `gorm:"column:skipped_count;not null;default:0"`
	ErrorsCount   int              `gorm:"column:errors_count;not null;default:0"`
	ErrorMessages *json.RawMessage `gorm:"column:error_messages;type:jsonb"`
	CreatedAt     time.Time        `gorm:"column:created_at;not null"`
}

func (SyncHistory) TableName() string {
	return "sync_history"
}
