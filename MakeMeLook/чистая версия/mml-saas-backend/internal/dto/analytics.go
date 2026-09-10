package dto

// ── Summary (KPI) ──────────────────────────────────────────────────────────

type AnalyticsKPI struct {
	Value int64   `json:"value"`
	Trend float64 `json:"trend"` // % change vs previous period
}

type AnalyticsSummaryResponse struct {
	Views      AnalyticsKPI `json:"views"`
	Opens      AnalyticsKPI `json:"opens"`
	TryOns     AnalyticsKPI `json:"tryons"`
	Leads      AnalyticsKPI `json:"leads"`
	Conversion AnalyticsKPI `json:"conversion"`
	CartItems  AnalyticsKPI `json:"cart_items"`
	Revenue    AnalyticsKPI `json:"revenue"`
	AOV        AnalyticsKPI `json:"aov"`
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
