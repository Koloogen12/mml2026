package model

import "time"

type AiApiLogStatus string

const (
	AiApiLogStatusPending AiApiLogStatus = "pending"
	AiApiLogStatusSuccess AiApiLogStatus = "success"
	AiApiLogStatusError   AiApiLogStatus = "error"
	AiApiLogStatusTimeout AiApiLogStatus = "timeout"
)

type AiApiLog struct {
	ID               int64          `gorm:"primaryKey"`
	ProjectID        int            `gorm:"index;not null"`
	LeadID           *int64         `gorm:"column:lead_id;index"`
	TryOnID          *int64         `gorm:"column:try_on_id;index"`
	Model            string         `gorm:"size:100;not null"`
	Provider         string         `gorm:"size:50;not null"`
	RequestType      string         `gorm:"column:request_type;size:30;not null"`
	Prompt           *string        `gorm:"type:text"`
	InputImagesCount int            `gorm:"column:input_images_count;not null;default:0"`
	Status           AiApiLogStatus `gorm:"size:20;not null"`
	ErrorMessage     *string        `gorm:"column:error_message;size:1024"`
	ErrorCode        *string        `gorm:"column:error_code;size:50"`
	ResponseFormat   *string        `gorm:"column:response_format;size:30"`
	PromptTokens     *int           `gorm:"column:prompt_tokens"`
	CompletionTokens *int           `gorm:"column:completion_tokens"`
	TotalTokens      *int           `gorm:"column:total_tokens"`
	LatencyMs        *int           `gorm:"column:latency_ms"`
	RetryCount       int            `gorm:"column:retry_count;not null;default:0"`
	StartedAt        time.Time      `gorm:"column:started_at;not null"`
	FinishedAt       *time.Time     `gorm:"column:finished_at"`
	CreatedAt        time.Time      `gorm:"not null;index"`
	DeletedAt        *time.Time     `gorm:"index"`
}

func (AiApiLog) TableName() string {
	return "ai_api_logs"
}
