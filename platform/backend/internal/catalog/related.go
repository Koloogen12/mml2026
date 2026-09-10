package catalog

import (
	"context"
	"fmt"
	"strings"
)

/*
 * «Похожее» и «С этим носят».
 *
 * Раньше и то и другое считалось на фронте одной строкой: похожее = первые 4
 * товара той же гардеробной зоны, «с этим носят» = первые 3 любой другой зоны.
 * Зона — это не сходство: белый пиджак и кимоно adidas оба outerwear. А «любая
 * другая зона» для пиджака означала три платья подряд. Ни пола, ни сочетаемости.
 *
 * При этом у каждого товара уже посчитан image_embedding (Marqo-FashionSigLIP) —
 * он и даёт настоящее визуальное сходство, просто им никто не пользовался.
 */

// Похожее: та же зона, тот же пол, ближайшие по вектору картинки.
func (r *Repo) Similar(ctx context.Context, publicID string, limit int) ([]Product, error) {
	if limit <= 0 || limit > 24 {
		limit = 4
	}
	q := productSelect + `
		WHERE p.deleted_at IS NULL AND p.is_active
		  AND p.public_id <> $1::uuid
		  AND p.image_embedding IS NOT NULL
		  AND p.garment_zone IS NOT DISTINCT FROM (SELECT garment_zone FROM products WHERE public_id = $1::uuid)
		  -- Пол обязателен: женское платье не «похоже» на мужское пальто, даже
		  -- если вектор их сблизил.
		  AND (
		    p.gender = (SELECT gender FROM products WHERE public_id = $1::uuid)
		    OR p.gender = 'unisex' OR p.gender = ''
		    OR (SELECT gender FROM products WHERE public_id = $1::uuid) IN ('unisex', '')
		  )
		ORDER BY p.image_embedding <=> (SELECT image_embedding FROM products WHERE public_id = $1::uuid)
		LIMIT ` + fmt.Sprint(limit)

	rows, err := r.pool.Query(ctx, q, publicID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanAndHydrate(ctx, rows)
}

/*
 * Сочетаемость зон. Правило, а не вкус: платье не носят с верхом и низом,
 * к низу не подбирают второй низ. Обувь и аксессуары идут ко всему.
 *
 * Это скелет образа. Внутри разрешённой зоны порядок задаёт вектор картинки —
 * то есть подбирается вещь, визуально близкая по стилю к исходной.
 */
var complementary = map[string][]string{
	"tops":        {"bottoms", "outerwear", "footwear", "accessories"},
	"bottoms":     {"tops", "outerwear", "footwear", "accessories"},
	"dress":       {"outerwear", "footwear", "accessories"}, // с платьем — не верх и не низ
	"outerwear":   {"tops", "bottoms", "footwear", "accessories"},
	"footwear":    {"tops", "bottoms", "outerwear", "accessories"},
	"accessories": {"tops", "bottoms", "outerwear", "footwear"},
}

// С этим носят: по одной вещи из каждой сочетаемой зоны, ближайшей по стилю.
// По одной — потому что образ, а не «ещё три платья».
func (r *Repo) Complementary(ctx context.Context, publicID string, limit int) ([]Product, error) {
	var zone, gender string
	if err := r.pool.QueryRow(ctx,
		`SELECT COALESCE(garment_zone,''), COALESCE(gender,'') FROM products WHERE public_id = $1::uuid`,
		publicID).Scan(&zone, &gender); err != nil {
		return nil, err
	}
	zones := complementary[zone]
	if len(zones) == 0 {
		return nil, nil // зона неизвестна — честно молчим, а не выдумываем образ
	}
	if limit <= 0 || limit > len(zones) {
		limit = 3
	}

	var out []Product
	for _, z := range zones {
		if len(out) >= limit {
			break
		}
		q := productSelect + `
			WHERE p.deleted_at IS NULL AND p.is_active
			  AND p.public_id <> $1::uuid
			  AND p.garment_zone = $2
			  AND p.image_embedding IS NOT NULL
			  AND ($3 = '' OR p.gender = $3 OR p.gender = 'unisex' OR p.gender = '')
			ORDER BY p.image_embedding <=> (SELECT image_embedding FROM products WHERE public_id = $1::uuid)
			LIMIT 1`
		rows, err := r.pool.Query(ctx, q, publicID, z, gender)
		if err != nil {
			return nil, err
		}
		items, err := r.scanAndHydrate(ctx, rows)
		rows.Close()
		if err != nil {
			return nil, err
		}
		out = append(out, items...)
	}
	return out, nil
}

// Ярлык зоны для подписи «Соберите образ: …».
func ZoneWord(zone string) string {
	switch strings.ToLower(zone) {
	case "tops":
		return "верх"
	case "bottoms":
		return "низ"
	case "outerwear":
		return "верхнюю одежду"
	case "dress":
		return "платье"
	case "footwear":
		return "обувь"
	case "accessories":
		return "аксессуары"
	}
	return zone
}
