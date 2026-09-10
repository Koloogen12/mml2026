// sync-catalog — синхронизация каталога партнёра из фида. Запускается вручную
// или по cron. Без -source синкает все зарегистрированные источники.
// После синка эмбеддинги/коерцию досчитывают embed-images + coerce-categories.
package main

import (
	"context"
	"flag"
	"log/slog"
	"os"

	"mml-platform-backend/internal/config"
	"mml-platform-backend/internal/database"
	"mml-platform-backend/internal/ingest"
)

func main() {
	source := flag.Int64("source", 0, "id источника (0 = по расписанию)")
	all := flag.Bool("all", false, "синкать все feed-источники, игнорируя расписание")
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

	store := ingest.NewStore(pool)

	var ids []int64
	switch {
	case *source != 0:
		ids = []int64{*source}
	case *all:
		rows, err := pool.Query(ctx, `SELECT id FROM partner_catalog_sources WHERE kind='feed'`)
		if err != nil {
			log.Error("select sources", "err", err)
			os.Exit(1)
		}
		for rows.Next() {
			var id int64
			if rows.Scan(&id) == nil {
				ids = append(ids, id)
			}
		}
		rows.Close()
	default:
		// Обычный cron-прогон: только источники, которым пора по их расписанию.
		ids, err = store.DueSourceIDs(ctx)
		if err != nil {
			log.Error("select due sources", "err", err)
			os.Exit(1)
		}
	}
	if len(ids) == 0 {
		log.Info("нет источников для синка")
		return
	}

	for _, id := range ids {
		res, err := store.Sync(ctx, id)
		if err != nil {
			log.Error("синк", "source", id, "err", err)
			continue
		}
		log.Info("синк завершён", "source", res.SourceID, "status", res.Status,
			"added", res.Added, "updated", res.Updated, "removed", res.Removed,
			"rejected", res.Rejected, "error", res.Error)
	}
}
