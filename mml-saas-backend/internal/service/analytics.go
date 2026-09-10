package service

import (
	"context"
	"fmt"
	"math"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"
)

type AnalyticsService struct {
	repos *repository.Repositories
	cfg   *config.Config
}

func NewAnalytics(repos *repository.Repositories, cfg *config.Config) *AnalyticsService {
	return &AnalyticsService{repos: repos, cfg: cfg}
}

func trendPct(current, prev int64) float64 {
	if prev == 0 {
		if current > 0 {
			return 100
		}
		return 0
	}
	return math.Round(float64(current-prev)/float64(prev)*1000) / 10
}

func (s *AnalyticsService) GetSummary(ctx context.Context, userID, projectID int, period string) (*dto.AnalyticsSummaryResponse, error) {
	if err := s.checkAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	current, prev, err := s.repos.Analytics.GetSummary(ctx, projectID, period)
	if err != nil {
		return nil, err
	}

	successRate := int64(math.Round(current.TryOnSuccessRate))
	prevSuccessRate := int64(math.Round(prev.TryOnSuccessRate))
	avgSec := int64(math.Round(current.AvgSessionSeconds))
	prevAvgSec := int64(math.Round(prev.AvgSessionSeconds))

	return &dto.AnalyticsSummaryResponse{
		Opens:             dto.AnalyticsKPI{Value: current.Opens, Trend: trendPct(current.Opens, prev.Opens)},
		Leads:             dto.AnalyticsKPI{Value: current.Leads, Trend: trendPct(current.Leads, prev.Leads)},
		ParamsFilled:      dto.AnalyticsKPI{Value: current.ParamsFilled, Trend: trendPct(current.ParamsFilled, prev.ParamsFilled)},
		PhotoUploads:      dto.AnalyticsKPI{Value: current.PhotoUploads, Trend: trendPct(current.PhotoUploads, prev.PhotoUploads)},
		TryOns:            dto.AnalyticsKPI{Value: current.TryOns, Trend: trendPct(current.TryOns, prev.TryOns)},
		Favorites:         dto.AnalyticsKPI{Value: current.Favorites, Trend: trendPct(current.Favorites, prev.Favorites)},
		CartItems:         dto.AnalyticsKPI{Value: current.CartItems, Trend: trendPct(current.CartItems, prev.CartItems)},
		Conversion:        dto.AnalyticsKPI{Value: int64(math.Round(current.Conversion*10) / 10), Trend: trendPct(int64(current.Conversion*10), int64(prev.Conversion*10))},
		TryOnSuccessRate:  dto.AnalyticsKPI{Value: successRate, Trend: trendPct(successRate, prevSuccessRate)},
		AvgSessionSeconds: dto.AnalyticsKPI{Value: avgSec, Trend: trendPct(avgSec, prevAvgSec)},
		Revenue:           dto.AnalyticsKPI{Value: 0, Trend: 0},
		AOV:               dto.AnalyticsKPI{Value: 0, Trend: 0},
	}, nil
}

func (s *AnalyticsService) GetFunnel(ctx context.Context, userID, projectID int, period string) (*dto.AnalyticsFunnelResponse, error) {
	if err := s.checkAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	stages, err := s.repos.Analytics.GetFunnel(ctx, projectID, period)
	if err != nil {
		return nil, err
	}

	// Calculate percentages relative to the first stage
	var firstCount int64
	if len(stages) > 0 {
		firstCount = stages[0].Count
	}

	resp := &dto.AnalyticsFunnelResponse{
		Stages: make([]dto.FunnelStageResponse, len(stages)),
	}
	for i, st := range stages {
		pct := 0.0
		if firstCount > 0 {
			pct = math.Round(float64(st.Count)/float64(firstCount)*1000) / 10
		}
		resp.Stages[i] = dto.FunnelStageResponse{
			Key:   st.Key,
			Count: st.Count,
			Pct:   pct,
		}
	}
	return resp, nil
}

func (s *AnalyticsService) GetTrends(ctx context.Context, userID, projectID int, period, metric string) (*dto.AnalyticsTrendsResponse, error) {
	if err := s.checkAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	// Validate metric. We dropped `views` because the underlying widget_view
	// event is never emitted; the chart was always flat-zero.
	validMetrics := map[string]bool{"opens": true, "tryon": true, "leads": true, "cart": true, "favorites": true}
	if !validMetrics[metric] {
		metric = "tryon"
	}

	points, err := s.repos.Analytics.GetTrends(ctx, projectID, period, metric)
	if err != nil {
		return nil, err
	}

	resp := &dto.AnalyticsTrendsResponse{
		Metric: metric,
		Points: make([]dto.TrendPointResponse, len(points)),
	}
	for i, p := range points {
		resp.Points[i] = dto.TrendPointResponse{Date: p.Date, Value: p.Value}
	}
	return resp, nil
}

func (s *AnalyticsService) GetTopProducts(ctx context.Context, userID, projectID int, period, sortBy string) (*dto.AnalyticsTopProductsResponse, error) {
	if err := s.checkAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	validSorts := map[string]bool{"tryon": true, "favorites": true, "cart": true}
	if !validSorts[sortBy] {
		sortBy = "tryon"
	}

	products, err := s.repos.Analytics.GetTopProducts(ctx, projectID, period, sortBy)
	if err != nil {
		return nil, err
	}

	resp := &dto.AnalyticsTopProductsResponse{
		SortBy:   sortBy,
		Products: make([]dto.TopProductResponse, len(products)),
	}
	for i, p := range products {
		photoURL := p.PhotoURL
		if photoURL != "" {
			if s.cfg.MinioPublicURL != "" {
				photoURL = fmt.Sprintf("%s/%s/%s", s.cfg.MinioPublicURL, photoBucket, photoURL)
			} else {
				photoURL = fmt.Sprintf("http://%s/%s/%s", s.cfg.MinioEndpoint, photoBucket, photoURL)
			}
		}
		resp.Products[i] = dto.TopProductResponse{
			ProductID: p.ProductID,
			Name:      p.Name,
			PhotoURL:  photoURL,
			TryOns:    p.TryOns,
			Favorites: p.Favorites,
			Cart:      p.Cart,
		}
	}
	return resp, nil
}

func (s *AnalyticsService) GetAudience(ctx context.Context, userID, projectID int, period string) (*dto.AnalyticsAudienceResponse, error) {
	if err := s.checkAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	data, err := s.repos.Analytics.GetAudience(ctx, projectID, period)
	if err != nil {
		return nil, err
	}

	resp := &dto.AnalyticsAudienceResponse{
		Gender:      make([]dto.DistributionItem, len(data.Gender)),
		Sizes:       make([]dto.DistributionItem, len(data.Sizes)),
		FigureTypes: make([]dto.DistributionItem, len(data.FigureTypes)),
		Devices:     make([]dto.DistributionItem, len(data.Devices)),
	}
	for i, d := range data.Gender {
		resp.Gender[i] = dto.DistributionItem{Name: d.Name, Value: d.Value}
	}
	for i, d := range data.Sizes {
		resp.Sizes[i] = dto.DistributionItem{Name: d.Name, Value: d.Value}
	}
	for i, d := range data.FigureTypes {
		resp.FigureTypes[i] = dto.DistributionItem{Name: d.Name, Value: d.Value}
	}
	for i, d := range data.Devices {
		resp.Devices[i] = dto.DistributionItem{Name: d.Name, Value: d.Value}
	}
	return resp, nil
}

// RunAggregation runs the event aggregation cron job for all active projects.
func (s *AnalyticsService) RunAggregation(ctx context.Context) {
	ids, err := s.repos.Analytics.GetActiveProjectIDs(ctx)
	if err != nil {
		logger.Error("analytics", "Failed to get active project IDs for aggregation", "error", err)
		return
	}

	for _, id := range ids {
		if err := s.repos.Analytics.AggregateEvents(ctx, id); err != nil {
			logger.Error("analytics", "Failed to aggregate events", "project_id", id, "error", err)
		}
	}

	logger.Info("analytics", "Event aggregation completed", "projects", len(ids))
}

// checkAccess verifies the user owns the project.
func (s *AnalyticsService) checkAccess(ctx context.Context, userID, projectID int) error {
	project, err := s.repos.Project.GetByID(ctx, projectID)
	if err != nil {
		return err
	}
	if project == nil {
		return ErrProjectNotFound
	}
	if project.OwnerID != userID {
		return ErrUnauthorized
	}
	return nil
}
