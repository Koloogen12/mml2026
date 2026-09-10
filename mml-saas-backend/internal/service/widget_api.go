package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/repository"

	"github.com/google/uuid"
)

var (
	ErrDomainNotAllowed = errors.New("domain not allowed")
	ErrProjectInactive  = errors.New("project is not active")
)

type WidgetAPIService struct {
	repos   *repository.Repositories
	cfg     *config.Config
	storage *StorageService
}

func NewWidgetAPI(repos *repository.Repositories, cfg *config.Config, storage *StorageService) *WidgetAPIService {
	return &WidgetAPIService{
		repos:   repos,
		cfg:     cfg,
		storage: storage,
	}
}

// GetConfig returns the widget configuration and active products for a project.
// Domain verification is handled by WidgetDomainVerification middleware before this is called.
func (s *WidgetAPIService) GetConfig(ctx context.Context, projectPublicID uuid.UUID) (*dto.WidgetConfigPublicResponse, error) {
	project, err := s.repos.Project.GetByPublicID(ctx, projectPublicID)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}
	return s.GetConfigByProjectInternalID(ctx, project.ID)
}

// GetConfigByProjectInternalID returns widget config for an internal project ID.
// Used by LeadService to embed config in session responses.
func (s *WidgetAPIService) GetConfigByProjectInternalID(ctx context.Context, projectID int) (*dto.WidgetConfigPublicResponse, error) {
	// Get widget config
	widgetCfg, err := s.repos.WidgetConfig.GetByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("get widget config: %w", err)
	}
	if widgetCfg == nil {
		return nil, ErrWidgetConfigNotFound
	}

	// Get active products with photos
	isActive := true
	products, err := s.repos.Product.List(ctx, repository.ProductListFilter{
		ProjectID: projectID,
		IsActive:  &isActive,
		Offset:    0,
		Limit:     20000, // widget gets all active products; large stores may have 5–10k SKUs
	})
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}

	// Build response
	resp := &dto.WidgetConfigPublicResponse{
		ButtonPosition:  widgetCfg.ButtonPosition,
		ButtonOffsetX:   widgetCfg.ButtonOffsetX,
		ButtonOffsetY:   widgetCfg.ButtonOffsetY,
		ButtonType:      widgetCfg.ButtonType,
		ButtonSize:      widgetCfg.ButtonSize,
		ButtonColor:     widgetCfg.ButtonBgColor,
		ButtonTextColor: widgetCfg.ButtonIconColor,
		ButtonText:      widgetCfg.ButtonTooltip,
		ButtonShadow:    widgetCfg.ButtonShadow,
		ButtonAnimation: widgetCfg.ButtonAnimation,

		ModalWidth:  542,
		ModalHeight: 658,

		PrimaryColor:    widgetCfg.AccentColor,
		SecondaryColor:  widgetCfg.SecondaryTextColor,
		BackgroundColor: widgetCfg.BgColor,
		TextColor:       widgetCfg.TextColor,
		AccentColor:     widgetCfg.AccentColor,
		FontFamily:      widgetCfg.FontFamily,
		BorderRadius:    widgetCfg.BorderRadius,

		Stages: dto.WidgetStagesPublic{
			Intro:         widgetCfg.StagesEnabled.Intro,
			Gender:        widgetCfg.StagesEnabled.IsGenderEnabled(),
			Parameters:    widgetCfg.StagesEnabled.HeightWeight,
			Measurements:  widgetCfg.StagesEnabled.Measurements,
			BellyShape:    widgetCfg.StagesEnabled.Belly,
			FigureType:    widgetCfg.StagesEnabled.Figure,
			PrivacyPolicy: true, // always shown
			PhotoUpload:   true, // always shown
		},

		AvatarsEnabled:   widgetCfg.AvatarsEnabled,
		AvatarsMode:      widgetCfg.PhotoModeDefault,
		LogoURL:          widgetCfg.LogoURL,
		PoweredByEnabled: widgetCfg.ShowPoweredBy,
		RememberProgress: widgetCfg.RememberProgress,
		AutoOpen:         widgetCfg.AutoOpen,
		AutoOpenDelay:    widgetCfg.AutoOpenDelay,
		Language:         widgetCfg.Language,

		MonthlyTryOnLimit: widgetCfg.MonthlyTryOnLimit,

		ElementsEnabled: dto.WidgetElementsPublic{
			Favorites: widgetCfg.ElementsEnabled.Favorites,
			Cart:      widgetCfg.ElementsEnabled.Cart,
			History:   widgetCfg.ElementsEnabled.History,
			Settings:  widgetCfg.ElementsEnabled.Settings,
		},
		ClothTypesEnabled: dto.WidgetClothTypesPublic{
			Outerwear: widgetCfg.ClothTypesEnabled.Outerwear,
			Tops:      widgetCfg.ClothTypesEnabled.Tops,
			Bottoms:   widgetCfg.ClothTypesEnabled.Bottoms,
			Shoes:     widgetCfg.ClothTypesEnabled.Shoes,
		},

		IntroTitle:           widgetCfg.IntroTitle,
		IntroDescription:     widgetCfg.IntroDescription,
		IntroImage:           widgetCfg.IntroImage,
		ParamsTitle:          widgetCfg.ParamsTitle,
		ParamsSubtitle:       widgetCfg.ParamsSubtitle,
		MeasurementsTitle:    widgetCfg.MeasurementsTitle,
		MeasurementsSubtitle: widgetCfg.MeasurementsSubtitle,
		BellyTitle:           widgetCfg.BellyTitle,
		BellySubtitle:        widgetCfg.BellySubtitle,
		FigureTitle:          widgetCfg.FigureTitle,
		FigureSubtitle:       widgetCfg.FigureSubtitle,
	}

	// Map products
	resp.Products = make([]dto.WidgetProductPublic, 0, len(products))
	for _, p := range products {
		wp := dto.WidgetProductPublic{
			ID:       strconv.Itoa(p.ID),
			PublicID: p.PublicID.String(),
			Name:     p.Name,
			Price:    p.Price,
			Currency: p.Currency,
		}
		if p.Category != nil {
			wp.Category = *p.Category
		}
		if p.Subcategory != nil {
			wp.Subcategory = *p.Subcategory
		}
		if p.MarketingTag != nil {
			wp.MarketingTag = *p.MarketingTag
		}
		if p.SKU != nil {
			wp.SKU = *p.SKU
		}
		if p.Color != nil {
			wp.Color = *p.Color
		}
		if p.ProductURL != nil {
			wp.ProductURL = p.ProductURL
		}
		if p.ExternalID != nil {
			wp.ExternalID = *p.ExternalID
		}
		if p.Gender != nil {
			wp.Gender = *p.Gender
		}
		if p.SizeVariants != nil {
			var sv map[string]string
			if err := json.Unmarshal(*p.SizeVariants, &sv); err == nil {
				wp.SizeVariants = sv
			}
		}

		// First photo = main photo
		if len(p.Photos) > 0 {
			photo := p.Photos[0]
			if photo.ObjectKey != "" {
				wp.PhotoURL = s.storage.GetObjectURL(photoBucket, photo.ObjectKey)
				wp.ThumbnailURL = wp.PhotoURL
				// Use thumbnail if original_key exists
				if photo.OriginalKey != nil {
					wp.ThumbnailURL = s.storage.GetObjectURL(photoBucket, photo.ObjectKey)
					wp.PhotoURL = s.storage.GetObjectURL(photoBucket, *photo.OriginalKey)
				}
			} else if photo.ExternalURL != nil && *photo.ExternalURL != "" {
				// Fallback to external URL (e.g., Tilda CDN)
				wp.PhotoURL = *photo.ExternalURL
				wp.ThumbnailURL = *photo.ExternalURL
			}
		}

		resp.Products = append(resp.Products, wp)
	}

	return resp, nil
}

// verifyDomain checks the Origin header against the project's allowed domains.
func (s *WidgetAPIService) verifyDomain(ctx context.Context, projectID int, origin string) error {
	domains, err := s.repos.ProjectDomain.ListByProjectID(ctx, projectID)
	if err != nil {
		return fmt.Errorf("list domains: %w", err)
	}

	// Extract hostname from origin
	requestHost := extractHostname(origin)

	// localhost is always allowed
	if requestHost == "localhost" || strings.HasPrefix(requestHost, "127.0.0.") {
		return nil
	}

	// Empty origin (e.g. server-side, curl) — allow in development
	if requestHost == "" {
		if s.cfg.IsDevelopment() {
			return nil
		}
		return ErrDomainNotAllowed
	}

	// Check against project domains
	for _, d := range domains {
		if d.Domain == requestHost {
			return nil
		}
		// Wildcard subdomain match: domain "example.com" matches "www.example.com"
		if strings.HasSuffix(requestHost, "."+d.Domain) {
			return nil
		}
	}

	return ErrDomainNotAllowed
}

// extractHostname extracts just the hostname from an Origin header value.
// Origin is typically "https://example.com" or "http://localhost:3000".
func extractHostname(origin string) string {
	if origin == "" {
		return ""
	}

	parsed, err := url.Parse(origin)
	if err != nil {
		return origin
	}

	host := parsed.Hostname()
	if host == "" {
		return origin
	}

	return host
}
