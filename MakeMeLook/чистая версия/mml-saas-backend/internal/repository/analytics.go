package repository

import (
	"context"
	"time"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AnalyticsRepository struct {
	db *gorm.DB
}

func newAnalyticsRepository(db *gorm.DB) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

// ── Period helpers ──────────────────────────────────────────────────────────

// periodRange returns (start, end) for a period string like "1d", "7d", "30d", "90d".
func periodRange(period string) (time.Time, time.Time) {
	now := time.Now().UTC()
	end := now
	var start time.Time
	switch period {
	case "1d":
		start = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	case "7d":
		start = now.AddDate(0, 0, -7)
	case "90d":
		start = now.AddDate(0, 0, -90)
	default: // "30d"
		start = now.AddDate(0, 0, -30)
	}
	return start, end
}

// prevPeriodRange returns the comparison period of the same length ending at start.
func prevPeriodRange(start, end time.Time) (time.Time, time.Time) {
	duration := end.Sub(start)
	return start.Add(-duration), start
}

// ── Summary (KPI) ──────────────────────────────────────────────────────────

type KPISummary struct {
	Views      int64
	Opens      int64
	TryOns     int64
	Leads      int64
	CartItems  int64
	Conversion float64 // cart / tryons * 100
}

func (r *AnalyticsRepository) countEvents(ctx context.Context, projectID int, eventType string, start, end time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.WidgetEvent{}).
		Where("project_id = ? AND event_type = ? AND created_at >= ? AND created_at < ? AND deleted_at IS NULL",
			projectID, eventType, start, end).
		Count(&count).Error
	return count, dbErr(err)
}

func (r *AnalyticsRepository) countLeads(ctx context.Context, projectID int, start, end time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.Lead{}).
		Where("project_id = ? AND created_at >= ? AND created_at < ? AND deleted_at IS NULL",
			projectID, start, end).
		Count(&count).Error
	return count, dbErr(err)
}

func (r *AnalyticsRepository) countTryOns(ctx context.Context, projectID int, start, end time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.LeadTryOn{}).
		Joins("JOIN leads ON leads.id = lead_try_ons.lead_id").
		Where("leads.project_id = ? AND lead_try_ons.created_at >= ? AND lead_try_ons.created_at < ? AND leads.deleted_at IS NULL AND lead_try_ons.deleted_at IS NULL",
			projectID, start, end).
		Count(&count).Error
	return count, dbErr(err)
}

func (r *AnalyticsRepository) countCartItems(ctx context.Context, projectID int, start, end time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.LeadCartItem{}).
		Joins("JOIN leads ON leads.id = lead_cart_items.lead_id").
		Where("leads.project_id = ? AND lead_cart_items.created_at >= ? AND lead_cart_items.created_at < ? AND leads.deleted_at IS NULL AND lead_cart_items.deleted_at IS NULL",
			projectID, start, end).
		Count(&count).Error
	return count, dbErr(err)
}

func (r *AnalyticsRepository) GetSummary(ctx context.Context, projectID int, period string) (*KPISummary, *KPISummary, error) {
	start, end := periodRange(period)
	prevStart, prevEnd := prevPeriodRange(start, end)

	current, err := r.buildSummary(ctx, projectID, start, end)
	if err != nil {
		return nil, nil, err
	}
	prev, err := r.buildSummary(ctx, projectID, prevStart, prevEnd)
	if err != nil {
		return nil, nil, err
	}
	return current, prev, nil
}

func (r *AnalyticsRepository) buildSummary(ctx context.Context, projectID int, start, end time.Time) (*KPISummary, error) {
	s := &KPISummary{}
	var err error

	s.Views, err = r.countEvents(ctx, projectID, "widget_view", start, end)
	if err != nil {
		return nil, err
	}
	s.Opens, err = r.countEvents(ctx, projectID, "widget_open", start, end)
	if err != nil {
		return nil, err
	}
	s.TryOns, err = r.countTryOns(ctx, projectID, start, end)
	if err != nil {
		return nil, err
	}
	s.Leads, err = r.countLeads(ctx, projectID, start, end)
	if err != nil {
		return nil, err
	}
	s.CartItems, err = r.countCartItems(ctx, projectID, start, end)
	if err != nil {
		return nil, err
	}
	if s.TryOns > 0 {
		s.Conversion = float64(s.CartItems) / float64(s.TryOns) * 100
	}
	return s, nil
}

// ── Funnel ─────────────────────────────────────────────────────────────────

type FunnelStage struct {
	Key   string
	Count int64
}

func (r *AnalyticsRepository) GetFunnel(ctx context.Context, projectID int, period string) ([]FunnelStage, error) {
	start, end := periodRange(period)

	// 8 stages: view, open, params_filled, photo_uploaded, first_tryon, repeat_tryon, favorite, cart
	eventCounts := map[string]int64{}
	eventTypes := []string{"widget_view", "widget_open", "params_filled", "photo_uploaded", "favorite_added", "cart_added"}
	for _, et := range eventTypes {
		c, err := r.countEvents(ctx, projectID, et, start, end)
		if err != nil {
			return nil, err
		}
		eventCounts[et] = c
	}

	tryOns, err := r.countTryOns(ctx, projectID, start, end)
	if err != nil {
		return nil, err
	}

	// Count repeat try-ons: sessions with > 1 try-on
	var repeatTryOns int64
	err = r.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(cnt - 1), 0) FROM (
			SELECT COUNT(*) as cnt FROM lead_try_ons
			JOIN leads ON leads.id = lead_try_ons.lead_id
			WHERE leads.project_id = ? AND lead_try_ons.created_at >= ? AND lead_try_ons.created_at < ?
			AND leads.deleted_at IS NULL AND lead_try_ons.deleted_at IS NULL
			GROUP BY leads.session_token HAVING COUNT(*) > 1
		) sub
	`, projectID, start, end).Scan(&repeatTryOns).Error
	if err != nil {
		return nil, dbErr(err)
	}

	stages := []FunnelStage{
		{Key: "view", Count: eventCounts["widget_view"]},
		{Key: "open", Count: eventCounts["widget_open"]},
		{Key: "params", Count: eventCounts["params_filled"]},
		{Key: "photo", Count: eventCounts["photo_uploaded"]},
		{Key: "first_tryon", Count: tryOns},
		{Key: "repeat_tryon", Count: repeatTryOns},
		{Key: "favorite", Count: eventCounts["favorite_added"]},
		{Key: "cart", Count: eventCounts["cart_added"]},
	}

	return stages, nil
}

// ── Trends ─────────────────────────────────────────────────────────────────

type TrendPoint struct {
	Date  string `json:"date"`
	Value int64  `json:"value"`
}

func (r *AnalyticsRepository) GetTrends(ctx context.Context, projectID int, period, metric string) ([]TrendPoint, error) {
	start, end := periodRange(period)

	// For "tryon" metric, query lead_try_ons directly; for others, query widget_events
	var rows []TrendPoint

	switch metric {
	case "tryon":
		err := r.db.WithContext(ctx).Raw(`
			SELECT to_char(lead_try_ons.created_at::date, 'YYYY-MM-DD') as date,
			       COUNT(*) as value
			FROM lead_try_ons
			JOIN leads ON leads.id = lead_try_ons.lead_id
			WHERE leads.project_id = ? AND lead_try_ons.created_at >= ? AND lead_try_ons.created_at < ?
			AND leads.deleted_at IS NULL AND lead_try_ons.deleted_at IS NULL
			GROUP BY lead_try_ons.created_at::date
			ORDER BY date
		`, projectID, start, end).Scan(&rows).Error
		if err != nil {
			return nil, dbErr(err)
		}
	case "leads":
		err := r.db.WithContext(ctx).Raw(`
			SELECT to_char(created_at::date, 'YYYY-MM-DD') as date,
			       COUNT(*) as value
			FROM leads
			WHERE project_id = ? AND created_at >= ? AND created_at < ?
			AND deleted_at IS NULL
			GROUP BY created_at::date
			ORDER BY date
		`, projectID, start, end).Scan(&rows).Error
		if err != nil {
			return nil, dbErr(err)
		}
	case "cart":
		err := r.db.WithContext(ctx).Raw(`
			SELECT to_char(lead_cart_items.created_at::date, 'YYYY-MM-DD') as date,
			       COUNT(*) as value
			FROM lead_cart_items
			JOIN leads ON leads.id = lead_cart_items.lead_id
			WHERE leads.project_id = ? AND lead_cart_items.created_at >= ? AND lead_cart_items.created_at < ?
			AND leads.deleted_at IS NULL AND lead_cart_items.deleted_at IS NULL
			GROUP BY lead_cart_items.created_at::date
			ORDER BY date
		`, projectID, start, end).Scan(&rows).Error
		if err != nil {
			return nil, dbErr(err)
		}
	default: // views, opens — event types from widget_events
		eventType := metric
		if metric == "views" {
			eventType = "widget_view"
		} else if metric == "opens" {
			eventType = "widget_open"
		}
		err := r.db.WithContext(ctx).Raw(`
			SELECT to_char(created_at::date, 'YYYY-MM-DD') as date,
			       COUNT(*) as value
			FROM widget_events
			WHERE project_id = ? AND event_type = ? AND created_at >= ? AND created_at < ?
			AND deleted_at IS NULL
			GROUP BY created_at::date
			ORDER BY date
		`, projectID, eventType, start, end).Scan(&rows).Error
		if err != nil {
			return nil, dbErr(err)
		}
	}

	// Fill gaps with zero values
	return fillTrendGaps(rows, start, end), nil
}

// fillTrendGaps fills in missing dates with zero values.
func fillTrendGaps(data []TrendPoint, start, end time.Time) []TrendPoint {
	lookup := make(map[string]int64, len(data))
	for _, p := range data {
		lookup[p.Date] = p.Value
	}

	var result []TrendPoint
	for d := start; d.Before(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		result = append(result, TrendPoint{
			Date:  dateStr,
			Value: lookup[dateStr],
		})
	}
	return result
}

// ── Top Products ───────────────────────────────────────────────────────────

type TopProduct struct {
	ProductID int    `json:"product_id" gorm:"column:product_id"`
	Name      string `json:"name" gorm:"column:name"`
	PhotoURL  string `json:"photo_url" gorm:"column:photo_url"`
	TryOns    int64  `json:"tryons" gorm:"column:tryons"`
	Favorites int64  `json:"favorites" gorm:"column:favorites"`
	Cart      int64  `json:"cart" gorm:"column:cart"`
}

func (r *AnalyticsRepository) GetTopProducts(ctx context.Context, projectID int, period, sortBy string) ([]TopProduct, error) {
	start, end := periodRange(period)

	// Simplified: unnest try-on product IDs, filter NULLs, count per product.
	var products []TopProduct
	err := r.db.WithContext(ctx).Raw(`
		WITH tryon_products AS (
			SELECT pid, lt_id FROM (
				SELECT unnest(ARRAY[lt.outerwear_product_id, lt.tops_product_id, lt.bottoms_product_id]) AS pid,
					lt.id AS lt_id
				FROM lead_try_ons lt
				JOIN leads l ON l.id = lt.lead_id
				WHERE l.project_id = ? AND lt.created_at >= ? AND lt.created_at < ?
				AND l.deleted_at IS NULL AND lt.deleted_at IS NULL
			) sub WHERE pid IS NOT NULL
		),
		product_tryons AS (
			SELECT p.id AS product_id, p.name, COUNT(tp.lt_id) AS tryon_count
			FROM products p
			LEFT JOIN tryon_products tp ON tp.pid = p.id
			WHERE p.project_id = ? AND p.deleted_at IS NULL
			GROUP BY p.id, p.name
		),
		product_cart AS (
			SELECT lci.product_id, COUNT(*) AS cart
			FROM lead_cart_items lci
			JOIN leads l ON l.id = lci.lead_id
			WHERE l.project_id = ? AND lci.created_at >= ? AND lci.created_at < ?
			AND l.deleted_at IS NULL AND lci.deleted_at IS NULL
			GROUP BY lci.product_id
		),
		product_favs AS (
			SELECT COALESCE(lt.outerwear_product_id, lt.tops_product_id, lt.bottoms_product_id) AS product_id,
				COUNT(*) AS favorites
			FROM lead_favorites lf
			JOIN lead_try_ons lt ON lt.id = lf.try_on_id
			JOIN leads l ON l.id = lt.lead_id
			WHERE l.project_id = ? AND lf.created_at >= ? AND lf.created_at < ?
			AND l.deleted_at IS NULL AND lf.deleted_at IS NULL AND lt.deleted_at IS NULL
			GROUP BY 1
		)
		SELECT pt.product_id, pt.name,
			COALESCE((SELECT object_key FROM product_photos WHERE product_id = pt.product_id AND deleted_at IS NULL ORDER BY sort_order LIMIT 1), '') AS photo_url,
			pt.tryon_count AS tryons,
			COALESCE(pf.favorites, 0) AS favorites,
			COALESCE(pc.cart, 0) AS cart
		FROM product_tryons pt
		LEFT JOIN product_favs pf ON pf.product_id = pt.product_id
		LEFT JOIN product_cart pc ON pc.product_id = pt.product_id
		WHERE pt.tryon_count > 0 OR COALESCE(pf.favorites, 0) > 0 OR COALESCE(pc.cart, 0) > 0
		ORDER BY `+sortColumn(sortBy)+` DESC
		LIMIT 10
	`, projectID, start, end,
		projectID,
		projectID, start, end,
		projectID, start, end,
	).Scan(&products).Error

	return products, dbErr(err)
}

func sortColumn(sortBy string) string {
	switch sortBy {
	case "favorites":
		return "favorites"
	case "cart":
		return "cart"
	default:
		return "tryons"
	}
}

// ── Audience ───────────────────────────────────────────────────────────────

type AudienceDistribution struct {
	Name  string `json:"name"`
	Value int64  `json:"value"`
}

type AudienceData struct {
	Gender      []AudienceDistribution `json:"gender"`
	Sizes       []AudienceDistribution `json:"sizes"`
	FigureTypes []AudienceDistribution `json:"figure_types"`
	Devices     []AudienceDistribution `json:"devices"`
}

func (r *AnalyticsRepository) GetAudience(ctx context.Context, projectID int, period string) (*AudienceData, error) {
	start, end := periodRange(period)
	data := &AudienceData{}

	// Gender distribution
	err := r.db.WithContext(ctx).Raw(`
		SELECT COALESCE(gender, 'unknown') as name, COUNT(*) as value
		FROM leads
		WHERE project_id = ? AND created_at >= ? AND created_at < ? AND deleted_at IS NULL
		GROUP BY gender ORDER BY value DESC
	`, projectID, start, end).Scan(&data.Gender).Error
	if err != nil {
		return nil, dbErr(err)
	}

	// Size distribution
	err = r.db.WithContext(ctx).Raw(`
		SELECT COALESCE(size, 'unknown') as name, COUNT(*) as value
		FROM leads
		WHERE project_id = ? AND created_at >= ? AND created_at < ? AND deleted_at IS NULL
		AND size IS NOT NULL AND size != ''
		GROUP BY size ORDER BY value DESC
	`, projectID, start, end).Scan(&data.Sizes).Error
	if err != nil {
		return nil, dbErr(err)
	}

	// Figure type distribution
	err = r.db.WithContext(ctx).Raw(`
		SELECT COALESCE(figure_type, 'unknown') as name, COUNT(*) as value
		FROM leads
		WHERE project_id = ? AND created_at >= ? AND created_at < ? AND deleted_at IS NULL
		AND figure_type IS NOT NULL AND figure_type != ''
		GROUP BY figure_type ORDER BY value DESC
	`, projectID, start, end).Scan(&data.FigureTypes).Error
	if err != nil {
		return nil, dbErr(err)
	}

	// Device distribution (from widget_events user_agent)
	err = r.db.WithContext(ctx).Raw(`
		SELECT
			CASE
				WHEN user_agent ILIKE '%%mobile%%' OR user_agent ILIKE '%%android%%' OR user_agent ILIKE '%%iphone%%' THEN 'Mobile'
				WHEN user_agent ILIKE '%%tablet%%' OR user_agent ILIKE '%%ipad%%' THEN 'Tablet'
				ELSE 'Desktop'
			END as name,
			COUNT(DISTINCT session_token) as value
		FROM widget_events
		WHERE project_id = ? AND event_type = 'widget_open' AND created_at >= ? AND created_at < ?
		AND deleted_at IS NULL
		GROUP BY name ORDER BY value DESC
	`, projectID, start, end).Scan(&data.Devices).Error
	if err != nil {
		return nil, dbErr(err)
	}

	return data, nil
}

// ── Event Aggregation (cron) ───────────────────────────────────────────────

// AggregateEvents aggregates widget_events into event_aggregates for a given project.
// Processes events from the last 24 hours, upserting daily counts.
func (r *AnalyticsRepository) AggregateEvents(ctx context.Context, projectID int) error {
	since := time.Now().UTC().AddDate(0, 0, -1)

	// Aggregate event counts by date and type
	type aggRow struct {
		MetricDate string
		Metric     string
		Value      int64
	}
	var rows []aggRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT to_char(created_at::date, 'YYYY-MM-DD') as metric_date,
		       event_type as metric,
		       COUNT(*) as value
		FROM widget_events
		WHERE project_id = ? AND created_at >= ? AND deleted_at IS NULL
		GROUP BY created_at::date, event_type
	`, projectID, since).Scan(&rows).Error
	if err != nil {
		return dbErr(err)
	}

	// Upsert each aggregate
	for _, row := range rows {
		agg := model.EventAggregate{
			ProjectID:  projectID,
			MetricDate: row.MetricDate,
			Metric:     row.Metric,
			Value:      row.Value,
		}
		err := r.db.WithContext(ctx).
			Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "project_id"}, {Name: "metric_date"}, {Name: "metric"}},
				DoUpdates: clause.AssignmentColumns([]string{"value", "updated_at"}),
			}).
			Create(&agg).Error
		if err != nil {
			return dbErr(err)
		}
	}

	return nil
}

// GetActiveProjectIDs returns IDs of projects that have recent widget events.
func (r *AnalyticsRepository) GetActiveProjectIDs(ctx context.Context) ([]int, error) {
	var ids []int
	err := r.db.WithContext(ctx).Raw(`
		SELECT DISTINCT project_id FROM widget_events
		WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
		AND deleted_at IS NULL
	`).Scan(&ids).Error
	return ids, dbErr(err)
}
