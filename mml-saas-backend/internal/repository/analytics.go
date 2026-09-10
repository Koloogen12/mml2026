package repository

import (
	"context"
	"database/sql"
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

// KPISummary — top-of-page tiles. We deliberately drop the historical
// `Views` (was sourced from a `widget_view` event the widget never emits)
// and add three real-table-backed metrics so the admin sees a complete
// onboarding-to-cart picture without depending on the patchy event log:
//
//   - ParamsFilled: distinct leads who completed the gender/measurements
//     stage in the period.
//   - PhotoUploads: distinct leads who uploaded a model photo in the period.
//   - Favorites:    lead_favorites rows (one per "added to favourites").
type KPISummary struct {
	Opens             int64
	TryOns            int64
	Leads             int64
	ParamsFilled      int64
	PhotoUploads      int64
	Favorites         int64
	CartItems         int64
	Conversion        float64 // cart / tryons * 100
	TryOnSuccessRate  float64 // done / (done+error) * 100 — quality of the AI pipeline
	AvgSessionSeconds float64 // avg of (last_event - first_event) per session — engagement depth
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

// countFavorites — rows in lead_favorites for the project / period. One row
// per "user clicks heart on a try-on result".
func (r *AnalyticsRepository) countFavorites(ctx context.Context, projectID int, start, end time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Raw(`
		SELECT COUNT(*) FROM lead_favorites lf
		JOIN leads l ON l.id = lf.lead_id
		WHERE l.project_id = ? AND lf.created_at >= ? AND lf.created_at < ?
		  AND lf.deleted_at IS NULL AND l.deleted_at IS NULL
	`, projectID, start, end).Scan(&count).Error
	return count, dbErr(err)
}

// countDistinctPhotoUploaders — distinct leads in the period that uploaded
// at least one model_photo. Counted by row in lead_photos so we capture the
// upload moment, not the lead-creation moment.
func (r *AnalyticsRepository) countDistinctPhotoUploaders(ctx context.Context, projectID int, start, end time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Raw(`
		SELECT COUNT(DISTINCT lp.lead_id) FROM lead_photos lp
		JOIN leads l ON l.id = lp.lead_id
		WHERE l.project_id = ? AND lp.created_at >= ? AND lp.created_at < ?
		  AND lp.deleted_at IS NULL AND l.deleted_at IS NULL
		  AND lp.type = 'model_photo'
	`, projectID, start, end).Scan(&count).Error
	return count, dbErr(err)
}

// countParamsFilledLeads — distinct sessions in the period that completed
// the onboarding parameters stage. Source: distinct session_tokens that
// emitted a `stage_view` event with stage='photo_upload' or later. We
// deliberately don't use `leads.gender IS NOT NULL` as a proxy: the widget
// initialises gender='female' as a default the moment a session is created,
// so every lead would qualify regardless of whether the user actually
// reached the parameters step.
//
// `photo_upload` is the first stage that comes AFTER all of the parameters
// substages (gender / measurements / belly / figure), so a session reaching
// it has provably gone through onboarding. Sessions that drop off earlier
// (intro / gender / parameters) won't appear here, which is what we want.
func (r *AnalyticsRepository) countParamsFilledLeads(ctx context.Context, projectID int, start, end time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Raw(`
		SELECT COUNT(DISTINCT session_token) FROM widget_events
		WHERE project_id = ? AND created_at >= ? AND created_at < ?
		  AND deleted_at IS NULL
		  AND event_type = 'stage_view'
		  AND event_data->>'stage' IN ('photoUpload', 'showroom')
	`, projectID, start, end).Scan(&count).Error
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

	// Distinct sessions (not total events) — keeps the tile's number
	// identical to the funnel's first stage. Counting raw events made the
	// two surfaces disagree (one user opening + closing + reopening = 3
	// events but one session) and confused admins comparing both views.
	err = r.db.WithContext(ctx).Raw(`
		SELECT COUNT(DISTINCT session_token) FROM widget_events
		WHERE project_id = ? AND event_type = 'widget_open'
		  AND created_at >= ? AND created_at < ? AND deleted_at IS NULL
	`, projectID, start, end).Scan(&s.Opens).Error
	if err != nil {
		return nil, dbErr(err)
	}
	s.TryOns, err = r.countTryOns(ctx, projectID, start, end)
	if err != nil {
		return nil, err
	}
	s.Leads, err = r.countLeads(ctx, projectID, start, end)
	if err != nil {
		return nil, err
	}
	s.ParamsFilled, err = r.countParamsFilledLeads(ctx, projectID, start, end)
	if err != nil {
		return nil, err
	}
	s.PhotoUploads, err = r.countDistinctPhotoUploaders(ctx, projectID, start, end)
	if err != nil {
		return nil, err
	}
	s.Favorites, err = r.countFavorites(ctx, projectID, start, end)
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

	// Try-on success rate — done / (done + failed). Surfaces AI pipeline
	// quality: a healthy V1 should be >85% (the rest are IMAGE_SAFETY
	// blocks that even the safety-fallback chain couldn't unblock).
	var tryonSplit struct {
		Done  int64
		Total int64
	}
	if err := r.db.WithContext(ctx).Raw(`
		SELECT
			COUNT(*) FILTER (WHERE status = 'done')                 AS done,
			COUNT(*) FILTER (WHERE status IN ('done','error','failed')) AS total
		FROM lead_try_ons lt
		JOIN leads l ON l.id = lt.lead_id
		WHERE l.project_id = ? AND lt.created_at >= ? AND lt.created_at < ?
		  AND l.deleted_at IS NULL AND lt.deleted_at IS NULL
	`, projectID, start, end).Scan(&tryonSplit).Error; err != nil {
		return nil, dbErr(err)
	}
	if tryonSplit.Total > 0 {
		s.TryOnSuccessRate = float64(tryonSplit.Done) / float64(tryonSplit.Total) * 100
	}

	// Avg session time in seconds. We cap each session at 30 min: a single
	// session_token can survive in localStorage for days and the user may
	// "reopen" the widget on day 7, producing a 600,000-second diff that
	// pulls the unweighted average to ~4 hours. The 30-minute cap matches
	// a typical browser session and yields admin-readable medians (~3 min
	// on Malina at the time of writing). Sessions with <2 events have
	// duration 0 by definition and are excluded.
	const sessionCapSec = 1800
	var avgSec sql.NullFloat64
	if err := r.db.WithContext(ctx).Raw(`
		SELECT AVG(diff_sec) FROM (
			SELECT EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS diff_sec
			FROM widget_events
			WHERE project_id = ? AND created_at >= ? AND created_at < ?
			  AND deleted_at IS NULL
			GROUP BY session_token HAVING COUNT(*) >= 2
		) sub WHERE diff_sec > 0 AND diff_sec < ?
	`, projectID, start, end, sessionCapSec).Scan(&avgSec).Error; err != nil {
		return nil, dbErr(err)
	}
	if avgSec.Valid {
		s.AvgSessionSeconds = avgSec.Float64
	}

	return s, nil
}

// ── Funnel ─────────────────────────────────────────────────────────────────

type FunnelStage struct {
	Key   string
	Count int64
}

// GetFunnel walks the user-journey conversion stages. Every stage is in
// the same unit — distinct sessions that reached the stage — so the
// percentages between stages are directly comparable. Without this,
// mixing "events" and "rows" produced confusing inversions like
// `first_tryon (3598) > photo_uploads (973)`.
//
// Stages (top → bottom of conversion funnel):
//   - open         distinct sessions that fired widget_open
//   - params       distinct sessions that reached photo_upload stage
//                  (= "completed onboarding parameters")
//   - photo        distinct sessions that uploaded a model photo
//   - first_tryon  distinct sessions that produced ≥1 try-on
//   - repeat_tryon distinct sessions that produced ≥2 try-ons (engagement)
//   - favorite     distinct sessions that added ≥1 favorite
//   - cart         distinct sessions that added ≥1 cart item
func (r *AnalyticsRepository) GetFunnel(ctx context.Context, projectID int, period string) ([]FunnelStage, error) {
	start, end := periodRange(period)

	scalar := func(sql string, args ...interface{}) (int64, error) {
		var v int64
		err := r.db.WithContext(ctx).Raw(sql, args...).Scan(&v).Error
		return v, dbErr(err)
	}

	opens, err := scalar(`
		SELECT COUNT(DISTINCT session_token) FROM widget_events
		WHERE project_id = ? AND created_at >= ? AND created_at < ?
		  AND deleted_at IS NULL AND event_type = 'widget_open'
	`, projectID, start, end)
	if err != nil {
		return nil, err
	}

	params, err := scalar(`
		SELECT COUNT(DISTINCT session_token) FROM widget_events
		WHERE project_id = ? AND created_at >= ? AND created_at < ?
		  AND deleted_at IS NULL AND event_type = 'stage_view'
		  AND event_data->>'stage' IN ('photoUpload', 'showroom')
	`, projectID, start, end)
	if err != nil {
		return nil, err
	}

	photoSessions, err := scalar(`
		SELECT COUNT(DISTINCT l.session_token) FROM lead_photos lp
		JOIN leads l ON l.id = lp.lead_id
		WHERE l.project_id = ? AND lp.created_at >= ? AND lp.created_at < ?
		  AND lp.deleted_at IS NULL AND l.deleted_at IS NULL
		  AND lp.type = 'model_photo'
	`, projectID, start, end)
	if err != nil {
		return nil, err
	}

	tryOnSessions, err := scalar(`
		SELECT COUNT(DISTINCT l.session_token) FROM lead_try_ons lt
		JOIN leads l ON l.id = lt.lead_id
		WHERE l.project_id = ? AND lt.created_at >= ? AND lt.created_at < ?
		  AND lt.deleted_at IS NULL AND l.deleted_at IS NULL
	`, projectID, start, end)
	if err != nil {
		return nil, err
	}

	repeatTryOnSessions, err := scalar(`
		SELECT COUNT(*) FROM (
			SELECT 1 FROM lead_try_ons lt
			JOIN leads l ON l.id = lt.lead_id
			WHERE l.project_id = ? AND lt.created_at >= ? AND lt.created_at < ?
			  AND lt.deleted_at IS NULL AND l.deleted_at IS NULL
			GROUP BY l.session_token HAVING COUNT(*) > 1
		) sub
	`, projectID, start, end)
	if err != nil {
		return nil, err
	}

	favSessions, err := scalar(`
		SELECT COUNT(DISTINCT l.session_token) FROM lead_favorites lf
		JOIN leads l ON l.id = lf.lead_id
		WHERE l.project_id = ? AND lf.created_at >= ? AND lf.created_at < ?
		  AND lf.deleted_at IS NULL AND l.deleted_at IS NULL
	`, projectID, start, end)
	if err != nil {
		return nil, err
	}

	cartSessions, err := scalar(`
		SELECT COUNT(DISTINCT l.session_token) FROM lead_cart_items lci
		JOIN leads l ON l.id = lci.lead_id
		WHERE l.project_id = ? AND lci.created_at >= ? AND lci.created_at < ?
		  AND lci.deleted_at IS NULL AND l.deleted_at IS NULL
	`, projectID, start, end)
	if err != nil {
		return nil, err
	}

	stages := []FunnelStage{
		{Key: "open", Count: opens},
		{Key: "params", Count: params},
		{Key: "photo", Count: photoSessions},
		{Key: "first_tryon", Count: tryOnSessions},
		{Key: "repeat_tryon", Count: repeatTryOnSessions},
		{Key: "favorite", Count: favSessions},
		{Key: "cart", Count: cartSessions},
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
	case "favorites":
		err := r.db.WithContext(ctx).Raw(`
			SELECT to_char(lf.created_at::date, 'YYYY-MM-DD') as date,
			       COUNT(*) as value
			FROM lead_favorites lf
			JOIN leads l ON l.id = lf.lead_id
			WHERE l.project_id = ? AND lf.created_at >= ? AND lf.created_at < ?
			AND l.deleted_at IS NULL AND lf.deleted_at IS NULL
			GROUP BY lf.created_at::date
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
		-- Each favourited try-on can have up to 5 garments (outerwear /
		-- tops / bottoms / shoes / accessories). We unnest all five
		-- product_id columns instead of COALESCE-ing the first non-null
		-- one — otherwise a try-on of "tops + bottoms" only credits one
		-- of them. The link to lead_favorites is via image_key (the
		-- result_key of the try-on PNG); lead_favorites.try_on_id
		-- exists in the schema but the widget never populates it, so
		-- joining on it returns 0 rows.
		product_favs AS (
			SELECT pid AS product_id, COUNT(*) AS favorites FROM (
				SELECT unnest(ARRAY[
					lt.outerwear_product_id, lt.tops_product_id,
					lt.bottoms_product_id, lt.shoes_product_id,
					lt.accessories_product_id
				]) AS pid
				FROM lead_favorites lf
				JOIN lead_try_ons lt ON lt.result_key = lf.image_key
				JOIN leads l ON l.id = lt.lead_id
				WHERE l.project_id = ? AND lf.created_at >= ? AND lf.created_at < ?
				AND l.deleted_at IS NULL AND lf.deleted_at IS NULL AND lt.deleted_at IS NULL
			) sub WHERE pid IS NOT NULL GROUP BY pid
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

	// CRITICAL: limit audience charts to leads who actually completed
	// onboarding. The widget store ships with default `gender='female'`,
	// `size='M'`, `figureType='hourglass'` baked into BodyParameters, and
	// a session_token row is created in `leads` the moment loader.js boots,
	// long before the user touches gender/size pickers. Counting all leads
	// would show 70%+ female / 70%+ size M / 70%+ hourglass for every
	// project on earth — completely useless. So we restrict to sessions
	// that reached the photo_upload stage (= passed every parameters
	// substage) and join their lead row to read what they actually picked.
	const realSessionsFilter = `
		l.project_id = ? AND l.created_at >= ? AND l.created_at < ?
		AND l.deleted_at IS NULL
		AND l.session_token::text IN (
			SELECT DISTINCT session_token::text FROM widget_events
			WHERE project_id = ? AND created_at >= ? AND created_at < ?
			  AND deleted_at IS NULL AND event_type = 'stage_view'
			  AND event_data->>'stage' IN ('photoUpload', 'showroom')
		)
	`

	// Gender distribution (real engaged sessions only)
	err := r.db.WithContext(ctx).Raw(`
		SELECT COALESCE(NULLIF(l.gender, ''), 'unknown') as name, COUNT(*) as value
		FROM leads l
		WHERE `+realSessionsFilter+`
		GROUP BY l.gender ORDER BY value DESC
	`, projectID, start, end, projectID, start, end).Scan(&data.Gender).Error
	if err != nil {
		return nil, dbErr(err)
	}

	// Size distribution
	err = r.db.WithContext(ctx).Raw(`
		SELECT l.size as name, COUNT(*) as value
		FROM leads l
		WHERE `+realSessionsFilter+`
		  AND l.size IS NOT NULL AND l.size != ''
		GROUP BY l.size ORDER BY value DESC
	`, projectID, start, end, projectID, start, end).Scan(&data.Sizes).Error
	if err != nil {
		return nil, dbErr(err)
	}

	// Figure type distribution
	err = r.db.WithContext(ctx).Raw(`
		SELECT l.figure_type as name, COUNT(*) as value
		FROM leads l
		WHERE `+realSessionsFilter+`
		  AND l.figure_type IS NOT NULL AND l.figure_type != ''
		GROUP BY l.figure_type ORDER BY value DESC
	`, projectID, start, end, projectID, start, end).Scan(&data.FigureTypes).Error
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
