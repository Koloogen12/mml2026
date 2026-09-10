package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"mml-saas-backend/pkg/logger"
)

type StagesEnabled struct {
	Intro        bool `json:"intro"`
	HeightWeight bool `json:"height_weight"`
	Measurements bool `json:"measurements"`
	Size         bool `json:"size"`
	Belly        bool `json:"belly"`
	Figure       bool `json:"figure"`
}

type ElementsEnabled struct {
	Favorites bool `json:"favorites"`
	Cart      bool `json:"cart"`
	History   bool `json:"history"`
	Settings  bool `json:"settings"`
}

type ClothTypesEnabled struct {
	Outerwear bool `json:"outerwear"`
	Tops      bool `json:"tops"`
	Bottoms   bool `json:"bottoms"`
	Shoes     bool `json:"shoes"`
}

// JSONB scanner/valuer implementations

func (s StagesEnabled) Value() (driver.Value, error) {
	v, err := json.Marshal(s)
	if err != nil {
		logger.Error("model", "JSONB marshal failed", "type", "StagesEnabled", "error", err)
	}
	return v, err
}

func (e ElementsEnabled) Value() (driver.Value, error) {
	v, err := json.Marshal(e)
	if err != nil {
		logger.Error("model", "JSONB marshal failed", "type", "ElementsEnabled", "error", err)
	}
	return v, err
}

func (c ClothTypesEnabled) Value() (driver.Value, error) {
	v, err := json.Marshal(c)
	if err != nil {
		logger.Error("model", "JSONB marshal failed", "type", "ClothTypesEnabled", "error", err)
	}
	return v, err
}

func (s *StagesEnabled) Scan(src any) error {
	return scanJSON(src, s)
}

func (e *ElementsEnabled) Scan(src any) error {
	return scanJSON(src, e)
}

func (c *ClothTypesEnabled) Scan(src any) error {
	return scanJSON(src, c)
}

func scanJSON(src any, dst any) error {
	var err error
	switch v := src.(type) {
	case []byte:
		err = json.Unmarshal(v, dst)
	case string:
		err = json.Unmarshal([]byte(v), dst)
	default:
		err = fmt.Errorf("scanJSON: unsupported type: %T", src)
	}
	if err != nil {
		logger.Error("model", "JSONB scan failed", "error", err)
	}
	return err
}

type WidgetConfig struct {
	ID        int `gorm:"primaryKey"`
	ProjectID int `gorm:"uniqueIndex;not null"`

	// Button
	ButtonPosition  string `gorm:"size:50;not null;default:'bottom-right'"`
	ButtonOffsetX   int    `gorm:"not null;default:20"`
	ButtonOffsetY   int    `gorm:"not null;default:20"`
	ButtonType      string `gorm:"size:50;not null;default:'circle'"`
	ButtonSize      int    `gorm:"not null;default:56"`
	ButtonBgColor   string `gorm:"size:7;not null;default:'#000000'"`
	ButtonIconColor string `gorm:"size:7;not null;default:'#FFFFFF'"`
	ButtonIcon      *string
	ButtonTooltip   string `gorm:"size:255;not null;default:'Примерить'"`
	ButtonShadow    bool   `gorm:"not null;default:true"`
	ButtonAnimation string `gorm:"size:50;not null;default:'pulse'"`
	ButtonDelay     int    `gorm:"not null;default:0"`

	// Window
	ColorMode          string  `gorm:"size:50;not null;default:'light'"`
	AccentColor        string  `gorm:"size:7;not null;default:'#000000'"`
	AccentTextColor    string  `gorm:"size:7;not null;default:'#FFFFFF'"`
	BgColor            string  `gorm:"size:7;not null;default:'#FFFFFF'"`
	TextColor          string  `gorm:"size:7;not null;default:'#1A1A1A'"`
	SecondaryTextColor string  `gorm:"size:7;not null;default:'#898989'"`
	FontFamily         string  `gorm:"size:100;not null;default:'Inter'"`
	BorderRadius       int     `gorm:"not null;default:12"`
	LogoURL            *string `gorm:"type:text"`
	ShowPoweredBy      bool    `gorm:"not null;default:true"`

	// JSONB toggles
	StagesEnabled     StagesEnabled     `gorm:"type:jsonb;not null"`
	ElementsEnabled   ElementsEnabled   `gorm:"type:jsonb;not null"`
	ClothTypesEnabled ClothTypesEnabled `gorm:"type:jsonb;not null"`

	// Stage content
	IntroTitle           string `gorm:"size:255;not null;default:'Precise and comfortable fitting method'"`
	IntroDescription     string `gorm:"type:text;not null"`
	IntroImage           string `gorm:"type:text;not null;default:'/widget-preview/intro-bg.png'"`
	ParamsTitle          string `gorm:"size:255;not null;default:'Basic parameters'"`
	ParamsSubtitle       string `gorm:"size:255;not null;default:'Specify the main parameters'"`
	MeasurementsTitle    string `gorm:"size:255;not null;default:'Your parameters'"`
	MeasurementsSubtitle string `gorm:"type:text;not null"`
	BellyTitle           string `gorm:"size:255;not null;default:'Your belly shape'"`
	BellySubtitle        string `gorm:"type:text;not null"`
	FigureTitle          string `gorm:"size:255;not null;default:'Your figure type'"`
	FigureSubtitle       string `gorm:"type:text;not null"`

	// Avatars
	AvatarsEnabled   bool   `gorm:"not null;default:true"`
	PhotoModeDefault string `gorm:"size:50;not null;default:'both'"`

	// Behavior
	AutoOpen         bool   `gorm:"not null;default:false"`
	AutoOpenDelay    int    `gorm:"not null;default:5"`
	RememberProgress bool   `gorm:"not null;default:true"`
	Language         string `gorm:"size:10;not null;default:'auto'"`

	// Limits
	MonthlyTryOnLimit int `gorm:"column:monthly_tryon_limit;not null;default:10" json:"monthly_tryon_limit"`

	CreatedAt time.Time  `gorm:"not null"`
	UpdatedAt time.Time  `gorm:"not null"`
	DeletedAt *time.Time `gorm:"index"`
}

func (WidgetConfig) TableName() string {
	return "widget_configs"
}
