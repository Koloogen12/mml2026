package dto

// ── Summary (KPI) ──────────────────────────────────────────────────────────

type AnalyticsKPI struct {
	Value int64   `json:"value"`
	Trend float64 `json:"trend"` // % change vs previous period
}

type AnalyticsSummaryResponse struct {
	Opens             AnalyticsKPI `json:"opens"`         // widget_open events
	Leads             AnalyticsKPI `json:"leads"`         // unique sessions
	ParamsFilled      AnalyticsKPI `json:"params_filled"` // distinct leads with gender filled
	PhotoUploads      AnalyticsKPI `json:"photo_uploads"` // distinct leads with model_photo
	TryOns            AnalyticsKPI `json:"tryons"`
	Favorites         AnalyticsKPI `json:"favorites"` // lead_favorites count
	CartItems         AnalyticsKPI `json:"cart_items"`
	Conversion        AnalyticsKPI `json:"conversion"`
	TryOnSuccessRate  AnalyticsKPI `json:"tryon_success_rate"`  // % done / (done+failed)
	AvgSessionSeconds AnalyticsKPI `json:"avg_session_seconds"` // engagement, in seconds
	Revenue           AnalyticsKPI `json:"revenue"`
	AOV               AnalyticsKPI `json:"aov"`
}

// ── Funnel ─────────────────────────────────────────────────────────────────

type FunnelStageResponse struct {
	Key   string  `json:"key"`
	Count int64   `json:"count"`
	Pct   float64 `json:"pct"` // % relative to first stage
}

type AnalyticsFunnelResponse struct {
	Stages []FunnelStageResponse `json:"stages"`
}

// ── Trends ─────────────────────────────────────────────────────────────────

type TrendPointResponse struct {
	Date  string `json:"date"`
	Value int64  `json:"value"`
}

type AnalyticsTrendsResponse struct {
	Metric string               `json:"metric"`
	Points []TrendPointResponse `json:"points"`
}

// ── Top Products ───────────────────────────────────────────────────────────

type TopProductResponse struct {
	ProductID int    `json:"product_id"`
	Name      string `json:"name"`
	PhotoURL  string `json:"photo_url"`
	TryOns    int64  `json:"tryons"`
	Favorites int64  `json:"favorites"`
	Cart      int64  `json:"cart"`
}

type AnalyticsTopProductsResponse struct {
	SortBy   string               `json:"sort_by"`
	Products []TopProductResponse `json:"products"`
}

// ── Audience ───────────────────────────────────────────────────────────────

type DistributionItem struct {
	Name  string `json:"name"`
	Value int64  `json:"value"`
}

type AnalyticsAudienceResponse struct {
	Gender      []DistributionItem `json:"gender"`
	Sizes       []DistributionItem `json:"sizes"`
	FigureTypes []DistributionItem `json:"figure_types"`
	Devices     []DistributionItem `json:"devices"`
}
