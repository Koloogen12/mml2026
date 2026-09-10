package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"mml-saas-backend/pkg/logger"
)

type DiagnosticResult struct {
	ID        int              `gorm:"primaryKey"`
	ProjectID int              `gorm:"index;not null"`
	Domain    string           `gorm:"size:255;not null"`
	Status    string           `gorm:"size:20;not null;default:'pending'"`
	Checks    DiagnosticChecks `gorm:"type:jsonb;not null;default:'[]'"`
	CheckedAt time.Time        `gorm:"not null"`
	CreatedAt time.Time        `gorm:"not null"`
	DeletedAt *time.Time       `gorm:"index"`
}

func (DiagnosticResult) TableName() string {
	return "diagnostic_results"
}

// DiagnosticChecks is a slice of check results stored as JSONB.
type DiagnosticChecks []DiagnosticCheckEntry

type DiagnosticCheckEntry struct {
	Name    string  `json:"name"`
	Status  string  `json:"status"` // pass, fail, warn, pending
	Message string  `json:"message"`
	Detail  *string `json:"detail,omitempty"`
}

func (c DiagnosticChecks) Value() (driver.Value, error) {
	data, err := json.Marshal(c)
	if err != nil {
		logger.Error("model", "failed to marshal diagnostic checks", "error", err)
	}
	return data, err
}

func (c *DiagnosticChecks) Scan(value any) error {
	if value == nil {
		*c = DiagnosticChecks{}
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return nil
	}
	if err := json.Unmarshal(b, c); err != nil {
		logger.Error("model", "failed to unmarshal diagnostic checks", "error", err)
		return err
	}
	return nil
}
