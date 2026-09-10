// reactivate-leads — авто-дрип реактивации заглохших лидов. Находит клиентов,
// которые замолчали (in_dialog/sent_selection, тишина N дней), собирает им
// персональную подборку через curate и кладёт её в чат; ставит reactivated_at
// (антиспам-кулдаун). Запускается по cron (напр. раз в сутки).
//
// Это НЕ дубль чат-выдачи: чат реактивен и сам не инициирует — здесь мы первыми
// дотягиваемся до ушедшего клиента. Ручного аналога на столе стилиста нет.
package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"strings"

	"mml-platform-backend/internal/catalog"
	"mml-platform-backend/internal/chat"
	"mml-platform-backend/internal/config"
	"mml-platform-backend/internal/curate"
	"mml-platform-backend/internal/database"
	"mml-platform-backend/internal/passport"
	"mml-platform-backend/internal/personalize"
	"mml-platform-backend/internal/reco"
)

func main() {
	staleDays := flag.Int("stale-days", 3, "порог тишины лида (дней)")
	cooldownDays := flag.Int("cooldown-days", 14, "не реактивировать чаще, чем раз в N дней")
	limit := flag.Int("limit", 100, "максимум лидов за прогон")
	dryRun := flag.Bool("dry-run", false, "только показать кандидатов, ничего не отправлять")
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

	engine := curate.New(catalog.NewRepo(pool), reco.New(cfg.RecoURL), cfg.AnthropicAPIKey, cfg.AnthropicModel)
	passportStore := passport.NewStore(pool)
	chatStore := chat.NewStore(pool)

	// Кандидаты: замолчавшие лиды с паспортом, вне кулдауна. Джойн на текущий
	// паспорт гарантирует, что есть на чём строить персонализацию.
	rows, err := pool.Query(ctx, `
		SELECT u.id
		FROM users u
		JOIN user_preferences up ON up.user_id = u.id AND up.valid_to IS NULL
		WHERE u.lead_status IN ('in_dialog','sent_selection')
		  AND u.last_action_at < now() - make_interval(days => $1)
		  AND (u.reactivated_at IS NULL OR u.reactivated_at < now() - make_interval(days => $2))
		ORDER BY u.last_action_at ASC
		LIMIT $3`, *staleDays, *cooldownDays, *limit)
	if err != nil {
		log.Error("select candidates", "err", err)
		os.Exit(1)
	}
	var ids []int64
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	rows.Close()
	log.Info("кандидаты на реактивацию", "count", len(ids), "stale_days", *staleDays, "dry_run", *dryRun)

	sent, skipped, failed := 0, 0, 0
	for _, uid := range ids {
		prefs, _ := passportStore.Current(ctx, uid)
		res, err := engine.Suggest(ctx, passport.Summarize(prefs), personalize.Build(prefs), 6)
		if err != nil || res == nil || len(res.Cards) == 0 {
			skipped++ // нет подходящих товаров — не шлём пустоту
			continue
		}
		if *dryRun {
			log.Info("dry-run: подобрали", "user", uid, "items", len(res.Cards))
			sent++
			continue
		}

		productIDs := make([]string, 0, len(res.Cards))
		for _, c := range res.Cards {
			productIDs = append(productIDs, c.ID)
		}
		note := res.Note
		if strings.TrimSpace(note) == "" {
			note = "Заглянули в новинки под ваш вкус — собрали свежую подборку. Посмотрите, что приглянётся."
		}

		// Последняя сессия клиента, иначе заводим новую.
		var sid int64
		if err := pool.QueryRow(ctx,
			`SELECT id FROM chat_sessions WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 1`,
			uid).Scan(&sid); err != nil {
			sid, _, err = chatStore.EnsureSession(ctx, "", uid)
			if err != nil {
				log.Warn("нет сессии", "user", uid, "err", err)
				failed++
				continue
			}
		}
		if err := chatStore.Append(ctx, sid, "assistant", note, productIDs); err != nil {
			log.Warn("не доставили", "user", uid, "err", err)
			failed++
			continue
		}
		_, _ = pool.Exec(ctx, `UPDATE users SET reactivated_at = now() WHERE id = $1`, uid)
		sent++
	}
	log.Info("реактивация завершена", "sent", sent, "skipped_no_items", skipped, "failed", failed)
}
