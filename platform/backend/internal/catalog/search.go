package catalog

import (
	"context"
	"fmt"
	"strings"
)

// SearchResult — товар + косинусная близость к запросу (0..1).
type SearchResult struct {
	Product
	Score float64 `json:"score"`
}

// Personalization — структурный профиль вошедшего из паспорта стиля. Влияет на
// РЕТРИВАЛ, а не только на тон ответа: любимые бренды поднимаются, нелюбимые
// опускаются, товары сильно выше бюджета мягко штрафуются, пол — дефолт фильтра.
// Пустой/nil → без персонализации (гость).
type Personalization struct {
	Gender       string             // female|male — дефолт, если запрос не задал пол
	BrandsLove   []string           // нижний регистр имён брендов
	BrandsAvoid  []string           // нижний регистр имён брендов
	BudgetByZone map[string]float64 // потолок ₽ по зоне (или общий максимум)
}

// budgetCeil — потолок для запроса: по зоне, иначе максимум по всем категориям.
func (p *Personalization) budgetCeil(zone string) float64 {
	if p == nil || len(p.BudgetByZone) == 0 {
		return 0
	}
	if v, ok := p.BudgetByZone[zone]; ok && v > 0 {
		return v
	}
	maxv := 0.0
	for _, v := range p.BudgetByZone {
		if v > maxv {
			maxv = v
		}
	}
	return maxv
}

// SemanticSearch — ANN по pgvector + жёсткие фильтры.
// Жёсткие фильтры (цена, наличие, пол, зона) режут ДО ранжирования:
// красивый, но недоступный товар — это не рекомендация, а раздражение.
func (r *Repo) SemanticSearch(ctx context.Context, queryVec string, f ListFilter) ([]SearchResult, error) {
	var (
		where []string
		args  []any
	)
	args = append(args, queryVec)
	add := func(cond string, val any) {
		args = append(args, val)
		where = append(where, fmt.Sprintf(cond, len(args)))
	}

	where = append(where, "p.deleted_at IS NULL", "p.is_active", "p.text_embedding IS NOT NULL")
	if f.Zone != "" {
		add("p.garment_zone = $%d", f.Zone)
	}
	if f.Gender != "" {
		add("(p.gender = $%d OR p.gender = 'unisex' OR p.gender = '')", f.Gender)
	}
	if f.Brand != "" {
		add("b.slug = $%d", f.Brand)
	}
	if f.MinPrice > 0 {
		add("EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.in_stock AND o.price >= $%d)", f.MinPrice)
	}
	if f.MaxPrice > 0 {
		add("EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.in_stock AND o.price <= $%d)", f.MaxPrice)
	}

	limit := f.Limit
	if limit <= 0 || limit > 50 {
		limit = 12
	}

	q := `
SELECT p.public_id, p.name, COALESCE(p.description,''), COALESCE(p.gender,''),
       COALESCE(p.garment_zone,''), COALESCE(p.category,''), COALESCE(p.subcategory,''),
       COALESCE(p.color,''), COALESCE(p.material,''), p.attributes, p.tryon_eligible,
       b.slug, b.name, COALESCE(b.logo_url,''),
       1 - (p.text_embedding <=> $1::vector) AS score
FROM products p
JOIN brands b ON b.id = p.brand_id
WHERE ` + strings.Join(where, " AND ") + fmt.Sprintf(`
ORDER BY p.text_embedding <=> $1::vector
LIMIT %d`, limit)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SearchResult
	for rows.Next() {
		var sr SearchResult
		if err := rows.Scan(&sr.PublicID, &sr.Name, &sr.Description, &sr.Gender,
			&sr.GarmentZone, &sr.Category, &sr.Subcategory, &sr.Color, &sr.Material,
			&sr.Attributes, &sr.TryonEligible,
			&sr.Brand.Slug, &sr.Brand.Name, &sr.Brand.LogoURL, &sr.Score); err != nil {
			return nil, err
		}
		out = append(out, sr)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return r.hydrate(ctx, out)
}

// HybridSearch сливает два ANN-списка через Reciprocal Rank Fusion:
//   - текстовый (e5, 384d) — силён в точной русской лексике;
//   - фото (Marqo-FashionSigLIP, 768d) — визуал и cold-start (запрос переведён
//     на EN и уже прогнан через fashion-text энкодер).
//
// RRF (score = Σ 1/(k+rank)) не требует калибровки шкал между разными
// пространствами — сравнивать косинусы e5 и Marqo напрямую нельзя.
// Де-риск показал: гибрид строго лучше любого одиночного метода.
func (r *Repo) HybridSearch(ctx context.Context, textVec, imgVec string, f ListFilter, pz *Personalization) ([]SearchResult, error) {
	const (
		rrfK     = 60 // сглаживающая константа RRF
		poolSize = 40 // кандидатов из каждого списка до слияния
		// Бусты калиброваны под шкалу RRF (ранг-1 ≈ 1/61 ≈ 0.0164): заметно
		// двигают, но не перекрывают релевантность запросу.
		boostLove   = 0.015
		penAvoid    = 0.040
		penOverBudg = 0.012
		budgSlack   = 1.15 // на 15% выше бюджета ещё ок, дальше — штраф
	)
	args := []any{textVec, imgVec}
	var where []string
	add := func(cond string, val any) {
		args = append(args, val)
		where = append(where, fmt.Sprintf(cond, len(args)))
	}
	where = append(where, "p.deleted_at IS NULL", "p.is_active", "p.text_embedding IS NOT NULL")
	if f.Zone != "" {
		add("p.garment_zone = $%d", f.Zone)
	}
	if f.Gender != "" {
		add("(p.gender = $%d OR p.gender = 'unisex' OR p.gender = '')", f.Gender)
	}
	if f.Brand != "" {
		add("b.slug = $%d", f.Brand)
	}
	if f.MinPrice > 0 {
		add("EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.in_stock AND o.price >= $%d)", f.MinPrice)
	}
	if f.MaxPrice > 0 {
		add("EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.in_stock AND o.price <= $%d)", f.MaxPrice)
	}
	limit := f.Limit
	if limit <= 0 || limit > 50 {
		limit = 12
	}

	// Персонализация: параметры бустов идут после фильтров.
	var love, avoid []string
	var ceil float64
	if pz != nil {
		love, avoid = pz.BrandsLove, pz.BrandsAvoid
		ceil = pz.budgetCeil(f.Zone)
	}
	args = append(args, love)
	pLove := len(args)
	args = append(args, avoid)
	pAvoid := len(args)
	args = append(args, ceil)
	pCeil := len(args)

	q := fmt.Sprintf(`
WITH filt AS (
  SELECT p.id, p.text_embedding, p.image_embedding
  FROM products p JOIN brands b ON b.id = p.brand_id
  WHERE %s
),
txt AS (
  SELECT id, row_number() OVER (ORDER BY text_embedding <=> $1::vector) AS rnk
  FROM filt ORDER BY text_embedding <=> $1::vector LIMIT %d
),
img AS (
  SELECT id, row_number() OVER (ORDER BY image_embedding <=> $2::vector) AS rnk
  FROM filt WHERE image_embedding IS NOT NULL
  ORDER BY image_embedding <=> $2::vector LIMIT %d
),
fused AS (
  SELECT COALESCE(t.id, i.id) AS id,
         COALESCE(1.0/(%d + t.rnk), 0) + COALESCE(1.0/(%d + i.rnk), 0) AS rrf
  FROM txt t FULL OUTER JOIN img i ON t.id = i.id
)
SELECT p.public_id, p.name, COALESCE(p.description,''), COALESCE(p.gender,''),
       COALESCE(p.garment_zone,''), COALESCE(p.category,''), COALESCE(p.subcategory,''),
       COALESCE(p.color,''), COALESCE(p.material,''), p.attributes, p.tryon_eligible,
       b.slug, b.name, COALESCE(b.logo_url,''),
       f.rrf
         + CASE WHEN %s THEN %g ELSE 0 END
         - CASE WHEN %s THEN %g ELSE 0 END
         - CASE WHEN $%d > 0 AND pr.mp IS NOT NULL AND pr.mp > $%d * %g THEN %g ELSE 0 END
         AS score
FROM fused f
JOIN products p ON p.id = f.id
JOIN brands b ON b.id = p.brand_id
LEFT JOIN LATERAL (
  SELECT min(price) AS mp FROM offers o WHERE o.product_id = p.id AND o.in_stock
) pr ON true
ORDER BY score DESC
LIMIT %d`,
		strings.Join(where, " AND "), poolSize, poolSize, rrfK, rrfK,
		brandMatch(pLove), boostLove, brandMatch(pAvoid), penAvoid,
		pCeil, pCeil, budgSlack, penOverBudg, limit)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SearchResult
	for rows.Next() {
		var sr SearchResult
		if err := rows.Scan(&sr.PublicID, &sr.Name, &sr.Description, &sr.Gender,
			&sr.GarmentZone, &sr.Category, &sr.Subcategory, &sr.Color, &sr.Material,
			&sr.Attributes, &sr.TryonEligible,
			&sr.Brand.Slug, &sr.Brand.Name, &sr.Brand.LogoURL, &sr.Score); err != nil {
			return nil, err
		}
		out = append(out, sr)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return r.hydrate(ctx, out)
}

// brandMatch — SQL-условие fuzzy-совпадения бренда товара со списком $N.
// Точное ИЛИ префиксное совпадение в обе стороны (паспортный «zara» ловит
// каталожный «zara home» и наоборот), гард length>=3 от переспичек коротких
// токенов. Пустой список → FALSE.
func brandMatch(pos int) string {
	return fmt.Sprintf(`EXISTS (SELECT 1 FROM unnest($%d::text[]) t
		WHERE length(t) >= 3 AND (
		  lower(b.name) = t OR lower(b.name) LIKE t || '%%' OR t LIKE lower(b.name) || '%%'))`, pos)
}

// hydrate догружает фото и офферы тем же батч-путём, что и List.
func (r *Repo) hydrate(ctx context.Context, out []SearchResult) ([]SearchResult, error) {
	if len(out) == 0 {
		return out, nil
	}
	products := make([]Product, len(out))
	for i := range out {
		products[i] = out[i].Product
	}
	hydrated, err := r.hydrateByPublicIDs(ctx, products)
	if err != nil {
		return nil, err
	}
	for i := range out {
		out[i].Product = hydrated[i]
	}
	return out, nil
}
