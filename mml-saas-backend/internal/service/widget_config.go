package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
)

func boolPtr(v bool) *bool { return &v }

var (
	ErrWidgetConfigNotFound = errors.New("widget config not found")
	ErrPresetNotFound       = errors.New("preset not found")
)

const (
	maxWidgetLogoSize = 2 * 1024 * 1024 // 2MB
	widgetLogoBucket  = "widget-logos"
)

var allowedWidgetLogoExts = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".webp": "image/webp",
	".svg":  "image/svg+xml",
}

type WidgetConfigService struct {
	repos   *repository.Repositories
	storage *StorageService
}

func NewWidgetConfig(repos *repository.Repositories, storage *StorageService) *WidgetConfigService {
	return &WidgetConfigService{
		repos:   repos,
		storage: storage,
	}
}

// GetOrCreate returns the widget config for a project, creating a default one if none exists.
func (s *WidgetConfigService) GetOrCreate(ctx context.Context, userID, projectID int) (*dto.WidgetConfigResponse, error) {
	if err := s.checkProjectOwnership(ctx, userID, projectID); err != nil {
		return nil, err
	}

	cfg, err := s.repos.WidgetConfig.GetByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("get widget config: %w", err)
	}

	if cfg == nil {
		cfg = s.defaultConfig(projectID)
		if err := s.repos.WidgetConfig.Create(ctx, cfg); err != nil {
			return nil, fmt.Errorf("create default widget config: %w", err)
		}
	}

	return s.toDTO(cfg), nil
}

// Update updates the widget config.
func (s *WidgetConfigService) Update(ctx context.Context, userID, projectID int, req dto.UpdateWidgetConfigRequest) (*dto.WidgetConfigResponse, error) {
	if err := s.checkProjectOwnership(ctx, userID, projectID); err != nil {
		return nil, err
	}

	cfg, err := s.repos.WidgetConfig.GetByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("get widget config: %w", err)
	}
	if cfg == nil {
		cfg = s.defaultConfig(projectID)
		if err := s.repos.WidgetConfig.Create(ctx, cfg); err != nil {
			return nil, fmt.Errorf("create default widget config: %w", err)
		}
	}

	s.applyUpdate(cfg, req)

	if err := s.repos.WidgetConfig.Update(ctx, cfg); err != nil {
		return nil, fmt.Errorf("update widget config: %w", err)
	}

	return s.toDTO(cfg), nil
}

// GetPresets returns the hardcoded presets.
func (s *WidgetConfigService) GetPresets() []dto.PresetResponse {
	return presets
}

// ApplyPreset applies a preset to the widget config.
func (s *WidgetConfigService) ApplyPreset(ctx context.Context, userID, projectID int, presetID string) (*dto.WidgetConfigResponse, error) {
	if err := s.checkProjectOwnership(ctx, userID, projectID); err != nil {
		return nil, err
	}

	var preset *dto.PresetResponse
	for i := range presets {
		if presets[i].ID == presetID {
			preset = &presets[i]
			break
		}
	}
	if preset == nil {
		return nil, ErrPresetNotFound
	}

	cfg, err := s.repos.WidgetConfig.GetByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("get widget config: %w", err)
	}
	if cfg == nil {
		cfg = s.defaultConfig(projectID)
		if err := s.repos.WidgetConfig.Create(ctx, cfg); err != nil {
			return nil, fmt.Errorf("create default widget config: %w", err)
		}
	}

	p := preset.Config
	cfg.ColorMode = p.ColorMode
	cfg.AccentColor = p.AccentColor
	cfg.AccentTextColor = p.AccentTextColor
	cfg.BgColor = p.BgColor
	cfg.TextColor = p.TextColor
	cfg.SecondaryTextColor = p.SecondaryTextColor
	cfg.FontFamily = p.FontFamily
	cfg.BorderRadius = p.BorderRadius
	cfg.ButtonBgColor = p.ButtonBgColor
	cfg.ButtonIconColor = p.ButtonIconColor
	cfg.ButtonType = p.ButtonType
	cfg.ButtonShadow = p.ButtonShadow
	cfg.ButtonAnimation = p.ButtonAnimation

	if err := s.repos.WidgetConfig.Update(ctx, cfg); err != nil {
		return nil, fmt.Errorf("update widget config: %w", err)
	}

	return s.toDTO(cfg), nil
}

// UploadLogo uploads a widget logo to Minio and updates the config.
func (s *WidgetConfigService) UploadLogo(ctx context.Context, userID, projectID int, file io.Reader, filename string, size int64) (*dto.WidgetConfigResponse, error) {
	if err := s.checkProjectOwnership(ctx, userID, projectID); err != nil {
		return nil, err
	}

	key, err := s.storage.UploadImage(ctx, widgetLogoBucket, file, filename, size, maxWidgetLogoSize, allowedWidgetLogoExts)
	if err != nil {
		return nil, fmt.Errorf("upload widget logo: %w", err)
	}

	cfg, err := s.repos.WidgetConfig.GetByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("get widget config: %w", err)
	}
	if cfg == nil {
		cfg = s.defaultConfig(projectID)
		if err := s.repos.WidgetConfig.Create(ctx, cfg); err != nil {
			return nil, fmt.Errorf("create default widget config: %w", err)
		}
	}

	logoURL := s.storage.GetObjectURL(widgetLogoBucket, key)
	cfg.LogoURL = &logoURL

	if err := s.repos.WidgetConfig.Update(ctx, cfg); err != nil {
		return nil, fmt.Errorf("update widget config logo: %w", err)
	}

	return s.toDTO(cfg), nil
}

// DeleteLogo removes the widget logo from the config.
func (s *WidgetConfigService) DeleteLogo(ctx context.Context, userID, projectID int) (*dto.WidgetConfigResponse, error) {
	if err := s.checkProjectOwnership(ctx, userID, projectID); err != nil {
		return nil, err
	}

	cfg, err := s.repos.WidgetConfig.GetByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("get widget config: %w", err)
	}
	if cfg == nil {
		return nil, ErrWidgetConfigNotFound
	}

	cfg.LogoURL = nil
	if err := s.repos.WidgetConfig.Update(ctx, cfg); err != nil {
		return nil, fmt.Errorf("update widget config logo: %w", err)
	}

	return s.toDTO(cfg), nil
}

// CountActiveByOwnerID returns the number of widget configs for a user's projects.
func (s *WidgetConfigService) CountActiveByOwnerID(ctx context.Context, ownerID int) (int64, error) {
	return s.repos.WidgetConfig.CountActiveByOwnerID(ctx, ownerID)
}

func (s *WidgetConfigService) checkProjectOwnership(ctx context.Context, userID, projectID int) error {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return fmt.Errorf("check project ownership: %w", err)
	}
	if project == nil {
		return ErrProjectNotFound
	}
	return nil
}

func (s *WidgetConfigService) defaultConfig(projectID int) *model.WidgetConfig {
	return &model.WidgetConfig{
		ProjectID:       projectID,
		ButtonPosition:  "bottom-right",
		ButtonOffsetX:   20,
		ButtonOffsetY:   20,
		ButtonType:      "circle",
		ButtonSize:      56,
		ButtonBgColor:   "#000000",
		ButtonIconColor: "#FFFFFF",
		ButtonTooltip:   "Try on",
		ButtonShadow:    true,
		ButtonAnimation: "pulse",
		ButtonDelay:     0,

		ColorMode:          "light",
		AccentColor:        "#000000",
		AccentTextColor:    "#FFFFFF",
		BgColor:            "#FFFFFF",
		TextColor:          "#1A1A1A",
		SecondaryTextColor: "#898989",
		FontFamily:         "Inter",
		BorderRadius:       12,
		ShowPoweredBy:      true,

		StagesEnabled:     model.StagesEnabled{Intro: true, Gender: boolPtr(true), HeightWeight: true, Measurements: true, Size: true, Belly: true, Figure: true},
		ElementsEnabled:   model.ElementsEnabled{Favorites: true, Cart: true, History: true, Settings: true},
		ClothTypesEnabled: model.ClothTypesEnabled{Outerwear: true, Tops: true, Bottoms: true, Shoes: false},

		IntroTitle:           "Precise and comfortable fitting method",
		IntroDescription:     "Upload your photo, enter your body measurements and get accurate sizing recommendations. Try on items or entire looks with a single tap in the virtual fitting room.",
		IntroImage:           "/widget-preview/intro-bg.png",
		ParamsTitle:          "Basic parameters",
		ParamsSubtitle:       "Specify the main parameters",
		MeasurementsTitle:    "Your parameters",
		MeasurementsSubtitle: "Please provide your parameters so we can find the right size of things for you.",
		BellyTitle:           "Your belly shape",
		BellySubtitle:        "Choose the image that most resembles the shape of your belly",
		FigureTitle:          "Your figure type",
		FigureSubtitle:       "Choose the image that best reflects your current figure",

		AvatarsEnabled:   true,
		PhotoModeDefault: "both",

		AutoOpen:         false,
		AutoOpenDelay:    5,
		RememberProgress: true,
		Language:         "auto",

		MonthlyTryOnLimit: 10,
	}
}

func (s *WidgetConfigService) applyUpdate(cfg *model.WidgetConfig, req dto.UpdateWidgetConfigRequest) {
	cfg.ButtonPosition = req.ButtonPosition
	cfg.ButtonOffsetX = req.ButtonOffsetX
	cfg.ButtonOffsetY = req.ButtonOffsetY
	cfg.ButtonType = req.ButtonType
	cfg.ButtonSize = req.ButtonSize
	cfg.ButtonBgColor = req.ButtonBgColor
	cfg.ButtonIconColor = req.ButtonIconColor
	if req.ButtonIcon != "" {
		cfg.ButtonIcon = &req.ButtonIcon
	} else {
		cfg.ButtonIcon = nil
	}
	cfg.ButtonTooltip = req.ButtonTooltip
	cfg.ButtonShadow = req.ButtonShadow
	cfg.ButtonAnimation = req.ButtonAnimation
	cfg.ButtonDelay = req.ButtonDelay

	cfg.ColorMode = req.ColorMode
	cfg.AccentColor = req.AccentColor
	cfg.AccentTextColor = req.AccentTextColor
	cfg.BgColor = req.BgColor
	cfg.TextColor = req.TextColor
	cfg.SecondaryTextColor = req.SecondaryTextColor
	cfg.FontFamily = req.FontFamily
	cfg.BorderRadius = req.BorderRadius
	cfg.ShowPoweredBy = req.ShowPoweredBy

	cfg.StagesEnabled = req.StagesEnabled
	cfg.ElementsEnabled = req.ElementsEnabled
	cfg.ClothTypesEnabled = req.ClothTypesEnabled

	cfg.IntroTitle = req.IntroTitle
	cfg.IntroDescription = req.IntroDescription
	cfg.IntroImage = req.IntroImage
	cfg.ParamsTitle = req.ParamsTitle
	cfg.ParamsSubtitle = req.ParamsSubtitle
	cfg.MeasurementsTitle = req.MeasurementsTitle
	cfg.MeasurementsSubtitle = req.MeasurementsSubtitle
	cfg.BellyTitle = req.BellyTitle
	cfg.BellySubtitle = req.BellySubtitle
	cfg.FigureTitle = req.FigureTitle
	cfg.FigureSubtitle = req.FigureSubtitle

	cfg.AvatarsEnabled = req.AvatarsEnabled
	cfg.PhotoModeDefault = req.PhotoModeDefault

	cfg.AutoOpen = req.AutoOpen
	cfg.AutoOpenDelay = req.AutoOpenDelay
	cfg.RememberProgress = req.RememberProgress
	cfg.Language = req.Language

	if req.MonthlyTryOnLimit != nil {
		cfg.MonthlyTryOnLimit = *req.MonthlyTryOnLimit
	}
}

func (s *WidgetConfigService) toDTO(cfg *model.WidgetConfig) *dto.WidgetConfigResponse {
	var buttonIcon string
	if cfg.ButtonIcon != nil {
		buttonIcon = *cfg.ButtonIcon
	}

	return &dto.WidgetConfigResponse{
		ID:        cfg.ID,
		ProjectID: cfg.ProjectID,

		ButtonPosition:  cfg.ButtonPosition,
		ButtonOffsetX:   cfg.ButtonOffsetX,
		ButtonOffsetY:   cfg.ButtonOffsetY,
		ButtonType:      cfg.ButtonType,
		ButtonSize:      cfg.ButtonSize,
		ButtonBgColor:   cfg.ButtonBgColor,
		ButtonIconColor: cfg.ButtonIconColor,
		ButtonIcon:      buttonIcon,
		ButtonTooltip:   cfg.ButtonTooltip,
		ButtonShadow:    cfg.ButtonShadow,
		ButtonAnimation: cfg.ButtonAnimation,
		ButtonDelay:     cfg.ButtonDelay,

		ColorMode:          cfg.ColorMode,
		AccentColor:        cfg.AccentColor,
		AccentTextColor:    cfg.AccentTextColor,
		BgColor:            cfg.BgColor,
		TextColor:          cfg.TextColor,
		SecondaryTextColor: cfg.SecondaryTextColor,
		FontFamily:         cfg.FontFamily,
		BorderRadius:       cfg.BorderRadius,
		LogoURL:            cfg.LogoURL,
		ShowPoweredBy:      cfg.ShowPoweredBy,

		StagesEnabled:     cfg.StagesEnabled,
		ElementsEnabled:   cfg.ElementsEnabled,
		ClothTypesEnabled: cfg.ClothTypesEnabled,

		IntroTitle:           cfg.IntroTitle,
		IntroDescription:     cfg.IntroDescription,
		IntroImage:           cfg.IntroImage,
		ParamsTitle:          cfg.ParamsTitle,
		ParamsSubtitle:       cfg.ParamsSubtitle,
		MeasurementsTitle:    cfg.MeasurementsTitle,
		MeasurementsSubtitle: cfg.MeasurementsSubtitle,
		BellyTitle:           cfg.BellyTitle,
		BellySubtitle:        cfg.BellySubtitle,
		FigureTitle:          cfg.FigureTitle,
		FigureSubtitle:       cfg.FigureSubtitle,

		AvatarsEnabled:   cfg.AvatarsEnabled,
		PhotoModeDefault: cfg.PhotoModeDefault,

		AutoOpen:         cfg.AutoOpen,
		AutoOpenDelay:    cfg.AutoOpenDelay,
		RememberProgress: cfg.RememberProgress,
		Language:         cfg.Language,

		MonthlyTryOnLimit: cfg.MonthlyTryOnLimit,

		CreatedAt: cfg.CreatedAt.Format(time.RFC3339),
		UpdatedAt: cfg.UpdatedAt.Format(time.RFC3339),
	}
}

// Hardcoded presets
var presets = []dto.PresetResponse{
	{
		ID:          "minimalist",
		Name:        "Minimalist",
		Description: "Clean black & white, rounded elements, Inter font",
		PreviewColors: dto.PresetPreviewColors{
			Accent: "#000000", Bg: "#FFFFFF", Text: "#1A1A1A",
		},
		Config: dto.PresetConfigPartial{
			ColorMode: "light", AccentColor: "#000000", AccentTextColor: "#FFFFFF",
			BgColor: "#FFFFFF", TextColor: "#1A1A1A", SecondaryTextColor: "#898989",
			FontFamily: "Inter", BorderRadius: 12,
			ButtonBgColor: "#000000", ButtonIconColor: "#FFFFFF",
			ButtonType: "circle", ButtonShadow: true, ButtonAnimation: "pulse",
		},
	},
	{
		ID:          "fashion",
		Name:        "Fashion",
		Description: "Bold colors, high contrast, modern look",
		PreviewColors: dto.PresetPreviewColors{
			Accent: "#E91E63", Bg: "#FAFAFA", Text: "#212121",
		},
		Config: dto.PresetConfigPartial{
			ColorMode: "custom", AccentColor: "#E91E63", AccentTextColor: "#FFFFFF",
			BgColor: "#FAFAFA", TextColor: "#212121", SecondaryTextColor: "#757575",
			FontFamily: "Montserrat", BorderRadius: 8,
			ButtonBgColor: "#E91E63", ButtonIconColor: "#FFFFFF",
			ButtonType: "pill", ButtonShadow: true, ButtonAnimation: "glow",
		},
	},
	{
		ID:          "elegant",
		Name:        "Elegant",
		Description: "Grey & gold palette, serif font, soft shadows",
		PreviewColors: dto.PresetPreviewColors{
			Accent: "#B8860B", Bg: "#F5F5F0", Text: "#2C2C2C",
		},
		Config: dto.PresetConfigPartial{
			ColorMode: "custom", AccentColor: "#B8860B", AccentTextColor: "#FFFFFF",
			BgColor: "#F5F5F0", TextColor: "#2C2C2C", SecondaryTextColor: "#8C8C8C",
			FontFamily: "Playfair Display", BorderRadius: 16,
			ButtonBgColor: "#B8860B", ButtonIconColor: "#FFFFFF",
			ButtonType: "circle", ButtonShadow: true, ButtonAnimation: "glow",
		},
	},
	{
		ID:          "sporty",
		Name:        "Sporty",
		Description: "Bright colors, bold elements, energetic feel",
		PreviewColors: dto.PresetPreviewColors{
			Accent: "#FF5722", Bg: "#FFFFFF", Text: "#1A1A1A",
		},
		Config: dto.PresetConfigPartial{
			ColorMode: "custom", AccentColor: "#FF5722", AccentTextColor: "#FFFFFF",
			BgColor: "#FFFFFF", TextColor: "#1A1A1A", SecondaryTextColor: "#666666",
			FontFamily: "Roboto", BorderRadius: 4,
			ButtonBgColor: "#FF5722", ButtonIconColor: "#FFFFFF",
			ButtonType: "rectangle", ButtonShadow: true, ButtonAnimation: "wobble",
		},
	},
}
