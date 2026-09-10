// embed-backfill считает текстовые эмбеддинги для товаров без вектора.
// Идемпотентен: берёт только строки с text_embedding IS NULL.
// Флаг -force пересчитывает всё (после смены модели или текста паспорта товара).
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"mml-platform-backend/internal/config"
	"mml-platform-backend/internal/database"
	"mml-platform-backend/internal/reco"
)

const batchSize = 64

type row struct {
	ID   int64
	Text string
}

func main() {
	force := flag.Bool("force", false, "пересчитать все эмбеддинги")
	flag.Parse()

	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("db", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	rc := reco.New(cfg.RecoURL)

	where := "p.text_embedding IS NULL"
	if *force {
		where = "TRUE"
	}
	rows, err := pool.Query(ctx, fmt.Sprintf(`
		SELECT p.id,
		       concat_ws('. ',
		         p.name,
		         'Бренд '||b.name,
		         NULLIF(concat_ws(' / ', p.garment_zone, p.category, p.subcategory),''),
		         NULLIF('Цвет '||p.color, 'Цвет '),
		         NULLIF('Материал '||p.material, 'Материал '),
		         -- Обогащённые LLM-атрибуты (эстетики/повод/формальность/палитра) —
		         -- добавляют стилевую семантику в вектор.
		         NULLIF(array_to_string(ARRAY(SELECT jsonb_array_elements_text(p.attributes->'style_tags')),', '),''),
		         NULLIF(array_to_string(ARRAY(SELECT jsonb_array_elements_text(p.attributes->'occasion')),', '),''),
		         p.attributes->>'formality',
		         p.attributes->>'palette',
		         LEFT(COALESCE(p.description,''), 500))
		FROM products p JOIN brands b ON b.id = p.brand_id
		WHERE p.deleted_at IS NULL AND %s
		ORDER BY p.id`, where))
	if err != nil {
		log.Error("select", "err", err)
		os.Exit(1)
	}
	var todo []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.ID, &r.Text); err != nil {
			log.Error("scan", "err", err)
			os.Exit(1)
		}
		todo = append(todo, r)
	}
	rows.Close()
	log.Info("к обработке", "products", len(todo))

	done := 0
	for start := 0; start < len(todo); start += batchSize {
		end := min(start+batchSize, len(todo))
		batch := todo[start:end]
		texts := make([]string, len(batch))
		for i, r := range batch {
			texts[i] = strings.TrimSpace(r.Text)
		}
		vecs, err := rc.Embed(ctx, texts, "passage")
		if err != nil {
			log.Error("embed", "err", err, "batch_start", start)
			os.Exit(1)
		}
		for i, r := range batch {
			if _, err := pool.Exec(ctx,
				`UPDATE products SET text_embedding = $1::vector, updated_at = now() WHERE id = $2`,
				reco.VectorLiteral(vecs[i]), r.ID); err != nil {
				log.Error("update", "err", err, "id", r.ID)
				os.Exit(1)
			}
		}
		done += len(batch)
		log.Info("прогресс", "done", done, "total", len(todo))
	}
	log.Info("бэкфилл завершён", "embedded", done)
}
