package ingest

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

type Store struct {
	pool *pgxpool.Pool
	http *http.Client
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool, http: &http.Client{Timeout: 60 * time.Second}}
}

// SyncResult — итог синхронизации источника (для журнала и письма партнёру P3/P4).
type SyncResult struct {
	SourceID int64
	Added    int
	Updated  int
	Removed  int
	Rejected int
	Status   string // ok|partial|failed
	Error    string
}

// Причины отклонения (совпадают со спекой админки, блок «Что сломалось»).
const (
	reasonNoPhoto = "no_photo"
	reasonNoPrice = "no_price"
	reasonNoName  = "no_name"
)

// Sync тянет фид источника, валидирует, приводит к нашей модели и дифф-обновляет
// товары этого источника. Пишет catalog_sync_runs + catalog_rejects. Эмбеддинги
// и коерцию зоны считают отдельные инкрементальные джобы (embed-*, coerce-*).
func (s *Store) Sync(ctx context.Context, sourceID int64) (*SyncResult, error) {
	res := &SyncResult{SourceID: sourceID, Status: "running"}

	var url, kind string
	var partnerID int64
	var paused bool
	if err := s.pool.QueryRow(ctx, `
		SELECT pcs.partner_id, pcs.kind, COALESCE(pcs.url,''), p.paused
		FROM partner_catalog_sources pcs JOIN partners p ON p.id = pcs.partner_id
		WHERE pcs.id=$1`,
		sourceID).Scan(&partnerID, &kind, &url, &paused); err != nil {
		return nil, fmt.Errorf("источник %d: %w", sourceID, err)
	}
	if paused {
		res.Status, res.Error = "failed", "партнёр на паузе — синк пропущен"
		return res, nil
	}

	var runID int64
	if err := s.pool.QueryRow(ctx,
		`INSERT INTO catalog_sync_runs (source_id, status) VALUES ($1,'running') RETURNING id`,
		sourceID).Scan(&runID); err != nil {
		return nil, err
	}
	// Любой ранний выход фиксируем в журнале как failed с причиной.
	finish := func(status, errMsg string) {
		_, _ = s.pool.Exec(ctx, `
			UPDATE catalog_sync_runs SET finished_at=now(), status=$2,
			  added=$3, updated=$4, removed=$5, rejected=$6, error=NULLIF($7,'')
			WHERE id=$1`, runID, status, res.Added, res.Updated, res.Removed, res.Rejected, errMsg)
		_, _ = s.pool.Exec(ctx, `
			UPDATE partner_catalog_sources SET status=$2, last_sync_at=now(),
			  last_error=NULLIF($3,'') WHERE id=$1`,
			sourceID, map[bool]string{true: "ok", false: "failed"}[status != "failed"], errMsg)
	}

	if kind != "feed" {
		res.Status, res.Error = "failed", "поддерживается только kind=feed (YML) в фазе 1"
		finish(res.Status, res.Error)
		return res, nil
	}
	if url == "" {
		res.Status, res.Error = "failed", "у источника нет URL фида"
		finish(res.Status, res.Error)
		return res, nil
	}

	offers, err := s.fetchYML(ctx, url)
	if err != nil {
		res.Status, res.Error = "failed", "не удалось загрузить/разобрать фид: "+err.Error()
		finish(res.Status, res.Error)
		return res, nil
	}

	seen := map[string]bool{} // external_id, встреченные в фиде — для дифф-удаления
	for _, o := range offers {
		reason := validate(o)
		if reason != "" {
			s.recordReject(ctx, runID, o, reason)
			res.Rejected++
			continue
		}
		seen[o.ExternalID] = true
		isNew, err := s.upsertOffer(ctx, partnerID, sourceID, o)
		if err != nil {
			// Один битый оффер не валит весь синк — помечаем и идём дальше.
			s.recordReject(ctx, runID, o, "ingest_error")
			res.Rejected++
			continue
		}
		if isNew {
			res.Added++
		} else {
			res.Updated++
		}
	}

	// Дифф-удаление: товары этого источника, которых больше нет в фиде.
	res.Removed = s.deactivateMissing(ctx, sourceID, seen)

	res.Status = "ok"
	if res.Rejected > 0 {
		res.Status = "partial"
	}
	finish(res.Status, "")
	return res, nil
}

// DueSourceIDs возвращает id feed-источников, которым пора синкаться по их
// каденции (schedule): hourly — если прошёл час, daily — если прошли сутки,
// впервые (last_sync_at NULL) — всегда. manual пропускаются. Партнёры на паузе
// исключены. Используется cron'ом cmd/sync-catalog (запускать хотя бы раз в час).
func (s *Store) DueSourceIDs(ctx context.Context) ([]int64, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT pcs.id FROM partner_catalog_sources pcs
		JOIN partners p ON p.id = pcs.partner_id
		WHERE pcs.kind = 'feed' AND p.paused = false AND pcs.schedule <> 'manual'
		  AND (
		    pcs.last_sync_at IS NULL
		    OR (pcs.schedule = 'hourly' AND pcs.last_sync_at < now() - interval '1 hour')
		    OR (pcs.schedule = 'daily'  AND pcs.last_sync_at < now() - interval '1 day')
		  )
		ORDER BY pcs.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids, rows.Err()
}

func (s *Store) fetchYML(ctx context.Context, url string) ([]FeedOffer, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "MakeMeLookBot/1.0")
	resp, err := s.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("фид вернул статус %d", resp.StatusCode)
	}
	return ParseYML(io.LimitReader(resp.Body, 64<<20)) // до 64 МБ фида
}

// validate возвращает причину отклонения или "" если товар годен.
func validate(o FeedOffer) string {
	switch {
	case strings.TrimSpace(o.Name) == "":
		return reasonNoName
	case len(o.Pictures) == 0:
		return reasonNoPhoto // без фото не примерить и не заэмбедить визуально
	case o.Price <= 0:
		return reasonNoPrice
	}
	return ""
}

func (s *Store) recordReject(ctx context.Context, runID int64, o FeedOffer, reason string) {
	_, _ = s.pool.Exec(ctx, `
		INSERT INTO catalog_rejects (sync_run_id, external_id, product_title, reason)
		VALUES ($1, NULLIF($2,''), NULLIF($3,''), $4)`,
		runID, o.ExternalID, o.Name, reason)
}

// upsertOffer заводит/обновляет бренд, товар (source_id, garment_zone пустой —
// заполнит коерция по фото), фото и оффер. Возвращает true, если товар создан.
func (s *Store) upsertOffer(ctx context.Context, partnerID, sourceID int64, o FeedOffer) (bool, error) {
	brandName := o.Brand
	if strings.TrimSpace(brandName) == "" {
		// Бренд не указан — берём имя бренда партнёра.
		_ = s.pool.QueryRow(ctx, `SELECT COALESCE(brand_name,'') FROM partners WHERE id=$1`, partnerID).Scan(&brandName)
	}
	if strings.TrimSpace(brandName) == "" {
		brandName = "Разное"
	}
	slug := slugify(brandName)

	var brandID int64
	if err := s.pool.QueryRow(ctx, `
		INSERT INTO brands (slug, name) VALUES ($1,$2)
		ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
		slug, brandName).Scan(&brandID); err != nil {
		return false, err
	}

	var productID int64
	var inserted bool
	// xmax=0 в RETURNING отличает INSERT от UPDATE при ON CONFLICT.
	if err := s.pool.QueryRow(ctx, `
		INSERT INTO products (brand_id, name, description, color, material,
		                      source, external_key, source_id)
		VALUES ($1,$2,NULLIF($3,''),NULLIF($4,''),NULLIF($5,''),'partner-feed',$6,$7)
		ON CONFLICT (brand_id, external_key) DO UPDATE SET
		  name=EXCLUDED.name, description=EXCLUDED.description, color=EXCLUDED.color,
		  material=EXCLUDED.material, source_id=EXCLUDED.source_id,
		  is_active=true, deleted_at=NULL, updated_at=now()
		RETURNING id, (xmax=0)`,
		brandID, o.Name, o.Description, o.Color, o.Material, o.ExternalID, sourceID).
		Scan(&productID, &inserted); err != nil {
		return false, err
	}

	// Фото и оффер перезаписываем целиком — фид каноничен для этого товара.
	if _, err := s.pool.Exec(ctx, `DELETE FROM product_images WHERE product_id=$1`, productID); err != nil {
		return false, err
	}
	for i, u := range o.Pictures {
		if _, err := s.pool.Exec(ctx,
			`INSERT INTO product_images (product_id, url, position) VALUES ($1,$2,$3)`,
			productID, u, i); err != nil {
			return false, err
		}
	}

	var oldPrice *float64
	if o.OldPrice > o.Price {
		v := o.OldPrice
		oldPrice = &v
	}
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO offers (product_id, retailer, retailer_slug, price, old_price,
		                    currency, sizes, in_stock, product_url)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (product_id, retailer_slug) DO UPDATE SET
		  price=EXCLUDED.price, old_price=EXCLUDED.old_price, sizes=EXCLUDED.sizes,
		  in_stock=EXCLUDED.in_stock, product_url=EXCLUDED.product_url, updated_at=now()`,
		productID, brandName, slug, o.Price, oldPrice, o.Currency, o.Sizes, o.InStock, o.URL); err != nil {
		return false, err
	}
	return inserted, nil
}

// deactivateMissing гасит товары источника, которых нет в свежем фиде (soft-delete).
func (s *Store) deactivateMissing(ctx context.Context, sourceID int64, seen map[string]bool) int {
	rows, err := s.pool.Query(ctx,
		`SELECT id, external_key FROM products WHERE source_id=$1 AND deleted_at IS NULL`, sourceID)
	if err != nil {
		return 0
	}
	type row struct {
		id  int64
		key string
	}
	var live []row
	for rows.Next() {
		var r row
		if rows.Scan(&r.id, &r.key) == nil {
			live = append(live, r)
		}
	}
	rows.Close()

	removed := 0
	for _, r := range live {
		if !seen[r.key] {
			if _, err := s.pool.Exec(ctx,
				`UPDATE products SET is_active=false, deleted_at=now(), updated_at=now() WHERE id=$1`,
				r.id); err == nil {
				removed++
			}
		}
	}
	return removed
}

func parseFloat(s string) float64 {
	s = strings.ReplaceAll(strings.TrimSpace(s), " ", "")
	s = strings.ReplaceAll(s, ",", ".")
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

// slugify — тот же алгоритм, что в импорте снапшота (чтобы не плодить дубли брендов).
func slugify(s string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	clean, _, err := transform.String(t, s)
	if err != nil {
		clean = s
	}
	clean = strings.ToLower(clean)
	var b strings.Builder
	prev := false
	for _, r := range clean {
		switch {
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			b.WriteRune(r)
			prev = false
		case r >= 'а' && r <= 'я' || r == 'ё':
			b.WriteRune(r)
			prev = false
		default:
			if !prev && b.Len() > 0 {
				b.WriteByte('-')
				prev = true
			}
		}
	}
	return strings.Trim(b.String(), "-")
}

var _ = pgx.ErrNoRows
