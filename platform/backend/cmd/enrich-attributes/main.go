// enrich-attributes — LLM-обогащение атрибутов товаров. Идемпотентно: берёт
// товары с пустыми attributes ('{}'), или всё при -force. Пишет products.attributes.
// После обогащения полезно перегнать embed-backfill -force (атрибуты входят в текст).
package main

import (
	"context"
	"encoding/json"
	"flag"
	"log/slog"
	"os"

	"mml-platform-backend/internal/config"
	"mml-platform-backend/internal/database"
	"mml-platform-backend/internal/enrich"
)

const batchSize = 8 // компромисс: меньше вызовов vs надёжность JSON-парсинга

func main() {
	force := flag.Bool("force", false, "перезаписать все атрибуты")
	limit := flag.Int("limit", 0, "ограничить число товаров (0 = все)")
	flag.Parse()

	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}
	if cfg.AnthropicAPIKey == "" {
		log.Error("нужен ANTHROPIC_API_KEY")
		os.Exit(1)
	}
	ctx := context.Background()
	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("db", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	enr := enrich.New(cfg.AnthropicAPIKey, cfg.AnthropicModel)

	where := "p.attributes = '{}'::jsonb"
	if *force {
		where = "TRUE"
	}
	q := `
		SELECT p.public_id, p.name, b.name, COALESCE(p.garment_zone,''),
		       COALESCE(p.color,''), COALESCE(p.material,''), LEFT(COALESCE(p.description,''),400)
		FROM products p JOIN brands b ON b.id = p.brand_id
		WHERE p.deleted_at IS NULL AND ` + where + ` ORDER BY p.id`
	if *limit > 0 {
		q += " LIMIT " + itoa(*limit)
	}
	rows, err := pool.Query(ctx, q)
	if err != nil {
		log.Error("select", "err", err)
		os.Exit(1)
	}
	var todo []enrich.ProductInput
	for rows.Next() {
		var p enrich.ProductInput
		if err := rows.Scan(&p.ExternalRef, &p.Name, &p.Brand, &p.Zone, &p.Color, &p.Material, &p.Description); err != nil {
			log.Error("scan", "err", err)
			os.Exit(1)
		}
		todo = append(todo, p)
	}
	rows.Close()
	log.Info("к обогащению", "products", len(todo))

	done, failed := 0, 0
	for start := 0; start < len(todo); start += batchSize {
		end := min(start+batchSize, len(todo))
		batch := todo[start:end]
		attrs, err := enr.EnrichBatch(ctx, batch)
		if err != nil {
			log.Warn("батч не обогатился — пропускаю", "err", err, "start", start)
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
				`UPDATE products SET attributes = $1::jsonb, updated_at = now() WHERE public_id = $2`,
				raw, p.ExternalRef); err != nil {
				log.Error("update", "err", err, "ref", p.ExternalRef)
				failed++
				continue
			}
			done++
		}
		log.Info("прогресс", "done", done, "failed", failed, "total", len(todo))
	}
	log.Info("обогащение завершено", "enriched", done, "failed", failed)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [12]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
