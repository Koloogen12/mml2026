// embed-images считает фото-эмбеддинги Marqo-FashionSigLIP (768d) для товаров.
// Инкрементально: берёт товары с главным фото и image_embedding IS NULL
// (или всё при -force). Нескачавшиеся фото помечает image_embed_error, а не
// пишет мусорный вектор. Это ETL онбординга каталога партнёра (гоняется при
// первой загрузке и потом только на новые/изменённые SKU).
package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"os"

	"mml-platform-backend/internal/config"
	"mml-platform-backend/internal/database"
	"mml-platform-backend/internal/reco"
)

const batchSize = 24 // фото тяжелее текста: скачивание + image-энкодер

type row struct {
	ID  int64
	URL string
}

func main() {
	force := flag.Bool("force", false, "пересчитать все фото-эмбеддинги")
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

	where := "p.image_embedding IS NULL AND p.image_embed_error IS NULL"
	if *force {
		where = "TRUE"
	}
	// Главное фото товара (min position).
	rows, err := pool.Query(ctx, `
		SELECT p.id, pi.url
		FROM products p
		JOIN LATERAL (
		  SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1
		) pi ON true
		WHERE p.deleted_at IS NULL AND (`+where+`)
		ORDER BY p.id`)
	if err != nil {
		log.Error("select", "err", err)
		os.Exit(1)
	}
	var todo []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.ID, &r.URL); err != nil {
			log.Error("scan", "err", err)
			os.Exit(1)
		}
		todo = append(todo, r)
	}
	rows.Close()
	log.Info("к обработке", "products", len(todo))

	done, failed := 0, 0
	for start := 0; start < len(todo); start += batchSize {
		end := min(start+batchSize, len(todo))
		batch := todo[start:end]

		// Скачивание может отсеять часть URL — ретраим батч без битых.
		for len(batch) > 0 {
			urls := make([]string, len(batch))
			for i, r := range batch {
				urls[i] = r.URL
			}
			vecs, err := rc.EmbedImage(ctx, urls)
			var unf *reco.ErrUnfetchable
			if errors.As(err, &unf) {
				bad := map[string]bool{}
				for _, u := range unf.URLs {
					bad[u] = true
				}
				var retry []row
				for _, r := range batch {
					if bad[r.URL] {
						_, _ = pool.Exec(ctx,
							`UPDATE products SET image_embed_error = 'photo_unfetchable', updated_at = now() WHERE id = $1`, r.ID)
						failed++
					} else {
						retry = append(retry, r)
					}
				}
				batch = retry
				continue // повтор с оставшимися
			}
			if err != nil {
				log.Error("embed-image", "err", err, "batch_start", start)
				os.Exit(1)
			}
			for i, r := range batch {
				if _, err := pool.Exec(ctx, `
					UPDATE products SET image_embedding = $1::vector,
					       image_embedded_at = now(), image_embed_error = NULL, updated_at = now()
					WHERE id = $2`, reco.VectorLiteral(vecs[i]), r.ID); err != nil {
					log.Error("update", "err", err, "id", r.ID)
					os.Exit(1)
				}
			}
			done += len(batch)
			break
		}
		log.Info("прогресс", "done", done, "failed", failed, "total", len(todo))
	}
	log.Info("фото-бэкфилл завершён", "embedded", done, "failed", failed)
}
