package dto

// WidgetConfigPublicResponse is returned by the public widget API (GET /api/widget/v1/config/:projectId).
// Contains only the fields the widget needs to render.
type WidgetConfigPublicResponse struct {
	// Button
	ButtonPosition  string `json:"button_position"`
	ButtonOffsetX   int    `json:"button_offset_x"`
	ButtonOffsetY   int    `json:"button_offset_y"`
	ButtonType      string `json:"button_type"`
	ButtonSize      int    `json:"button_size"`
	ButtonColor     string `json:"button_color"`
	ButtonTextColor string `json:"button_text_color"`
	ButtonText      string `json:"button_text"`
	ButtonShadow    bool   `json:"button_shadow"`
	ButtonAnimation string `json:"button_animation"`

	// Modal
	ModalWidth  int `json:"modal_width"`
	ModalHeight int `json:"modal_height"`

	// Colors
	PrimaryColor    string `json:"primary_color"`
	SecondaryColor  string `json:"secondary_color"`
	BackgroundColor string `json:"background_color"`
	TextColor       string `json:"text_color"`
	AccentColor     string `json:"accent_color"`
	FontFamily      string `json:"font_family"`
	BorderRadius    int    `json:"border_radius"`

	// Stages toggles
	Stages WidgetStagesPublic `json:"stages"`

	// Products
	Products []WidgetProductPublic `json:"products"`

	// Avatars
	AvatarsEnabled bool   `json:"avatars_enabled"`
	AvatarsMode    string `json:"avatars_mode"`

	// Branding
	LogoURL          *string `json:"logo_url"`
	PoweredByEnabled bool    `json:"powered_by_enabled"`

	// Behavior
	RememberProgress bool   `json:"remember_progress"`
	AutoOpen         bool   `json:"auto_open"`
	AutoOpenDelay    int    `json:"auto_open_delay"`
	Language         string `json:"language"`

	// Limits
	MonthlyTryOnLimit int `json:"monthly_tryon_limit"`

	// Elements & cloth types
	ElementsEnabled   WidgetElementsPublic   `json:"elements_enabled"`
	ClothTypesEnabled WidgetClothTypesPublic `json:"cloth_types_enabled"`

	// Stage content (custom text from admin panel)
	IntroTitle           string `json:"intro_title,omitempty"`
	IntroDescription     string `json:"intro_description,omitempty"`
	IntroImage           string `json:"intro_image,omitempty"`
	ParamsTitle          string `json:"params_title,omitempty"`
	ParamsSubtitle       string `json:"params_subtitle,omitempty"`
	MeasurementsTitle    string `json:"measurements_title,omitempty"`
	MeasurementsSubtitle string `json:"measurements_subtitle,omitempty"`
	BellyTitle           string `json:"belly_title,omitempty"`
	BellySubtitle        string `json:"belly_subtitle,omitempty"`
	FigureTitle          string `json:"figure_title,omitempty"`
	FigureSubtitle       string `json:"figure_subtitle,omitempty"`
}

type WidgetElementsPublic struct {
	Favorites bool `json:"favorites"`
	Cart      bool `json:"cart"`
	History   bool `json:"history"`
	Settings  bool `json:"settings"`
}

type WidgetClothTypesPublic struct {
	Outerwear bool `json:"outerwear"`
	Tops      bool `json:"tops"`
	Bottoms   bool `json:"bottoms"`
	Shoes     bool `json:"shoes"`
}

type WidgetStagesPublic struct {
	Intro         bool `json:"intro"`
	Gender        bool `json:"gender"`
	Parameters    bool `json:"parameters"`
	Measurements  bool `json:"measurements"`
	BellyShape    bool `json:"belly_shape"`
	FigureType    bool `json:"figure_type"`
	PrivacyPolicy bool `json:"privacy_policy"`
	PhotoUpload   bool `json:"photo_upload"`
}

type WidgetProductPublic struct {
	ID           string            `json:"id"`
	PublicID     string            `json:"public_id"`
	Name         string            `json:"name"`
	PhotoURL     string            `json:"photo_url"`
	ThumbnailURL string            `json:"thumbnail_url"`
	Category     string            `json:"category"`
	Subcategory  string            `json:"subcategory"`
	// MarketingTag flags products that belong to a merchandising chip
	// (Новинки, Sale, Скидки, etc.) so the widget can surface them as a
	// priority filter at the top of each layer instead of buried in the
	// hierarchy. Empty string when the product has no marketing membership.
	MarketingTag string            `json:"marketing_tag"`
	SKU          string            `json:"sku"`
	Color        string            `json:"color"`
	Price        *float64          `json:"price"`
	Currency     *string           `json:"currency"`
	ProductURL   *string           `json:"product_url"`
	ExternalID   string            `json:"external_id"`
	// Gender ('female' / 'male' / 'unisex' / 'kids') so the widget can hide
	// opposite-gender items in the Showroom based on the user's onboarding
	// choice. Empty string when the shop feed has no gender tag — those
	// stay visible to all genders.
	Gender       string            `json:"gender"`
	SizeVariants map[string]string `json:"size_variants"`
}

// ---------------------------------------------------------------------------
// Size Recommendation
// ---------------------------------------------------------------------------

type RecommendSizeRequest struct {
	SessionToken string `json:"session_token" validate:"required,uuid"`
	ProductID    string `json:"product_id"    validate:"required,uuid"`
}

type RecommendSizeResponse struct {
	RecommendedSize string            `json:"recommended_size"`
	Confidence      string            `json:"confidence"`
	Sizes           []SizeFitScoreDTO `json:"sizes"`
	// OutOfChart is true when the user's measurements are outside the
	// product's size chart entirely — widget shows a warning so the buyer
	// knows the recommendation is approximate rather than a real fit.
	OutOfChart bool `json:"out_of_chart"`
}

type SizeFitScoreDTO struct {
	Size  string  `json:"size"`
	Score float64 `json:"score"`
	Fit   string  `json:"fit"` // perfect, good, tight, loose
}
