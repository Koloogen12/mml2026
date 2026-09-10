package enrich

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

const batchSize = 8 // тот же компромисс, что в cmd/enrich-attributes

// RunForPublicIDs пересобирает атрибуты выбранных товаров (по public_id) через LLM
// и перезаписывает products.attributes. Возвращает число успешно обновлённых и
// проваленных. Идемпотентно: всегда перезапись (это ручное «пересобрать»).
func (e *Enricher) RunForPublicIDs(ctx context.Context, pool *pgxpool.Pool, publicIDs []string) (done, failed int) {
	if len(publicIDs) == 0 {
		return 0, 0
	}
	rows, err := pool.Query(ctx, `
		SELECT p.public_id::text, p.name, b.name, COALESCE(p.garment_zone,''),
		       COALESCE(p.color,''), COALESCE(p.material,''), LEFT(COALESCE(p.description,''),400)
		FROM products p JOIN brands b ON b.id = p.brand_id
		WHERE p.deleted_at IS NULL AND p.public_id::text = ANY($1)
		ORDER BY p.id`, publicIDs)
	if err != nil {
		return 0, len(publicIDs)
	}
	var todo []ProductInput
	for rows.Next() {
		var p ProductInput
		if err := rows.Scan(&p.ExternalRef, &p.Name, &p.Brand, &p.Zone, &p.Color, &p.Material, &p.Description); err != nil {
			continue
		}
		todo = append(todo, p)
	}
	rows.Close()

	for start := 0; start < len(todo); start += batchSize {
		end := min(start+batchSize, len(todo))
		batch := todo[start:end]
		attrs, err := e.EnrichBatch(ctx, batch)
		if err != nil {
			failed += len(batch)
			continue
		}
		for _, p := range batch {
			a, ok := attrs[p.ExternalRef]
			if !ok {
				failed++
				continue
			}
			raw, _ := json.Marshal(a)
			if _, err := pool.Exec(ctx,
				`UPDATE products SET attributes = $1::jsonb, updated_at = now() WHERE public_id::text = $2`,
				raw, p.ExternalRef); err != nil {
				failed++
				continue
			}
			done++
		}
	}
	return done, failed
}
