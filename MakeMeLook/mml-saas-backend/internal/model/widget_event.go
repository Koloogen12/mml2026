package model

import (
	"encoding/json"
	"time"
)

type WidgetEvent struct {
	ID           int64           `gorm:"primaryKey"`
	ProjectID    int             `gorm:"index;not null"`
	LeadID       *int64          `gorm:"column:lead_id;index"`
	SessionToken string          `gorm:"column:session_token;size:255;not null"`
	EventType    string          `gorm:"column:event_type;size:50;not null"`
	EventData    json.RawMessage `gorm:"column:event_data;type:jsonb;not null;default:'{}'"`
	PageURL      *string         `gorm:"column:page_url;size:2048"`
	IP           string          `gorm:"column:ip;size:45;not null"`
	UserAgent    string          `gorm:"column:user_agent;size:512;not null"`
	CreatedAt    time.Time       `gorm:"not null;index"`
	DeletedAt    *time.Time      `gorm:"index"`
}

func (WidgetEvent) TableName() string {
	return "widget_events"
}
