package model

import "time"

type EventAggregate struct {
	ID         int64      `gorm:"primaryKey"`
	ProjectID  int        `gorm:"index;not null"`
	MetricDate string     `gorm:"column:metric_date;type:date;not null"`
	Metric     string     `gorm:"column:metric;size:50;not null"`
	Value      int64      `gorm:"column:value;not null;default:0"`
	CreatedAt  time.Time  `gorm:"not null"`
	UpdatedAt  time.Time  `gorm:"not null"`
	DeletedAt  *time.Time `gorm:"index"`
}

func (EventAggregate) TableName() string {
	return "event_aggregates"
}
