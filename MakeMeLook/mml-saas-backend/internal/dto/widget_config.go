package dto

import "mml-saas-backend/internal/model"

type UpdateWidgetConfigRequest struct {
	// Button
	ButtonPosition  string `json:"button_position" validate:"required,oneof=bottom-right bottom-left top-right top-left"`
	ButtonOffsetX   int    `json:"button_offset_x" validate:"min=0,max=200"`
	ButtonOffsetY   int    `json:"button_offset_y" validate:"min=0,max=200"`
	ButtonType      string `json:"button_type" validate:"required,oneof=circle rectangle pill"`
	ButtonSize      int    `json:"button_size" validate:"min=32,max=80"`
	ButtonBgColor   string `json:"button_bg_color" validate:"required,hexcolor"`
	ButtonIconColor string `json:"button_icon_color" validate:"required,hexcolor"`
	ButtonIcon      string `json:"button_icon"`
	ButtonTooltip   string `json:"button_tooltip" validate:"max=255"`
	ButtonShadow    bool   `json:"button_shadow"`
	ButtonAnimation string `json:"button_animation" validate:"required,oneof=none pulse wobble glow"`
	ButtonDelay     int    `json:"button_delay" validate:"min=0,max=30"`

	// Window
	ColorMode          string `json:"color_mode" validate:"required,oneof=light dark custom"`
	AccentColor        string `json:"accent_color" validate:"required,hexcolor"`
	AccentTextColor    string `json:"accent_text_color" validate:"required,hexcolor"`
	BgColor            string `json:"bg_color" validate:"required,hexcolor"`
	TextColor          string `json:"text_color" validate:"required,hexcolor"`
	SecondaryTextColor string `json:"secondary_text_color" validate:"required,hexcolor"`
	FontFamily         string `json:"font_family" validate:"required,max=100"`
	BorderRadius       int    `json:"border_radius" validate:"min=0,max=24"`
	ShowPoweredBy      bool   `json:"show_powered_by"`

	// JSONB toggles
	StagesEnabled     model.StagesEnabled     `json:"stages_enabled"`
	ElementsEnabled   model.ElementsEnabled   `json:"elements_enabled"`
	ClothTypesEnabled model.ClothTypesEnabled `json:"cloth_types_enabled"`

	// Stage content
	IntroTitle           string `json:"intro_title" validate:"max=255"`
	IntroDescription     string `json:"intro_description" validate:"max=2000"`
	IntroImage           string `json:"intro_image" validate:"max=2000"`
	ParamsTitle          string `json:"params_title" validate:"max=255"`
	ParamsSubtitle       string `json:"params_subtitle" validate:"max=255"`
	MeasurementsTitle    string `json:"measurements_title" validate:"max=255"`
	MeasurementsSubtitle string `json:"measurements_subtitle" validate:"max=2000"`
	BellyTitle           string `json:"belly_title" validate:"max=255"`
	BellySubtitle        string `json:"belly_subtitle" validate:"max=2000"`
	FigureTitle          string `json:"figure_title" validate:"max=255"`
	FigureSubtitle       string `json:"figure_subtitle" validate:"max=2000"`

	// Avatars
	AvatarsEnabled   bool   `json:"avatars_enabled"`
	PhotoModeDefault string `json:"photo_mode_default" validate:"required,oneof=upload avatar both"`

	// Behavior
	AutoOpen         bool   `json:"auto_open"`
	AutoOpenDelay    int    `json:"auto_open_delay" validate:"min=0,max=60"`
	RememberProgress bool   `json:"remember_progress"`
	Language         string `json:"language" validate:"required,oneof=ru en auto"`

	// Limits
	MonthlyTryOnLimit *int `json:"monthly_tryon_limit" validate:"omitempty,min=1"`
}

type WidgetConfigResponse struct {
	ID        int `json:"id"`
	ProjectID int `json:"project_id"`

	// Button
	ButtonPosition  string `json:"button_position"`
	ButtonOffsetX   int    `json:"button_offset_x"`
	ButtonOffsetY   int    `json:"button_offset_y"`
	ButtonType      string `json:"button_type"`
	ButtonSize      int    `json:"button_size"`
	ButtonBgColor   string `json:"button_bg_color"`
	ButtonIconColor string `json:"button_icon_color"`
	ButtonIcon      string `json:"button_icon"`
	ButtonTooltip   string `json:"button_tooltip"`
	ButtonShadow    bool   `json:"button_shadow"`
	ButtonAnimation string `json:"button_animation"`
	ButtonDelay     int    `json:"button_delay"`

	// Window
	ColorMode          string  `json:"color_mode"`
	AccentColor        string  `json:"accent_color"`
	AccentTextColor    string  `json:"accent_text_color"`
	BgColor            string  `json:"bg_color"`
	TextColor          string  `json:"text_color"`
	SecondaryTextColor string  `json:"secondary_text_color"`
	FontFamily         string  `json:"font_family"`
	BorderRadius       int     `json:"border_radius"`
	LogoURL            *string `json:"logo_url"`
	ShowPoweredBy      bool    `json:"show_powered_by"`

	// JSONB toggles
	StagesEnabled     model.StagesEnabled     `json:"stages_enabled"`
	ElementsEnabled   model.ElementsEnabled   `json:"elements_enabled"`
	ClothTypesEnabled model.ClothTypesEnabled `json:"cloth_types_enabled"`

	// Stage content
	IntroTitle           string `json:"intro_title"`
	IntroDescription     string `json:"intro_description"`
	IntroImage           string `json:"intro_image"`
	ParamsTitle          string `json:"params_title"`
	ParamsSubtitle       string `json:"params_subtitle"`
	MeasurementsTitle    string `json:"measurements_title"`
	MeasurementsSubtitle string `json:"measurements_subtitle"`
	BellyTitle           string `json:"belly_title"`
	BellySubtitle        string `json:"belly_subtitle"`
	FigureTitle          string `json:"figure_title"`
	FigureSubtitle       string `json:"figure_subtitle"`

	// Avatars
	AvatarsEnabled   bool   `json:"avatars_enabled"`
	PhotoModeDefault string `json:"photo_mode_default"`

	// Behavior
	AutoOpen         bool   `json:"auto_open"`
	AutoOpenDelay    int    `json:"auto_open_delay"`
	RememberProgress bool   `json:"remember_progress"`
	Language         string `json:"language"`

	// Limits
	MonthlyTryOnLimit int `json:"monthly_tryon_limit"`

	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type PresetResponse struct {
	ID            string              `json:"id"`
	Name          string              `json:"name"`
	Description   string              `json:"description"`
	PreviewColors PresetPreviewColors `json:"preview_colors"`
	Config        PresetConfigPartial `json:"config"`
}

type PresetPreviewColors struct {
	Accent string `json:"accent"`
	Bg     string `json:"bg"`
	Text   string `json:"text"`
}

type PresetConfigPartial struct {
	ColorMode          string `json:"color_mode"`
	AccentColor        string `json:"accent_color"`
	AccentTextColor    string `json:"accent_text_color"`
	BgColor            string `json:"bg_color"`
	TextColor          string `json:"text_color"`
	SecondaryTextColor string `json:"secondary_text_color"`
	FontFamily         string `json:"font_family"`
	BorderRadius       int    `json:"border_radius"`
	ButtonBgColor      string `json:"button_bg_color"`
	ButtonIconColor    string `json:"button_icon_color"`
	ButtonType         string `json:"button_type"`
	ButtonShadow       bool   `json:"button_shadow"`
	ButtonAnimation    string `json:"button_animation"`
}

type ApplyPresetRequest struct {
	PresetID string `json:"preset_id" validate:"required"`
}
