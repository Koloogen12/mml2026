// coerce-categories — zero-shot приведение категорий партнёров к нашим 5 зонам
// по ФОТО (Marqo-FashionSigLIP). Решает проблему 1000 разных таксономий: не
// доверяем категории партнёра, а классифицируем товар заново по изображению.
//
// Принцип «флаг на ревью, не слепая перезапись»:
//   - garment_zone пустой (новый партнёр не дал) → заполняем предсказанием;
//   - garment_zone задан, но расходится с фото → пишем zone_suggested + логируем,
//     НЕ перезаписываем (де-риск: 74% совпало, часть расхождений — партнёр неправ).
//
// Переиспользует уже сохранённые image_embedding (никакого повторного скачивания).
package main

import (
	"context"
	"flag"
	"log/slog"
	"os"

	"mml-platform-backend/internal/config"
	"mml-platform-backend/internal/database"
	"mml-platform-backend/internal/reco"
)

// Английские якоря зон (text-энкодер Marqo англоязычный). КОРОТКИЕ: SigLIP
// обучен на лаконичных подписях, длинные «or»-списки замыливают эмбеддинг
// (де-риск: короткие якоря = 74%, длинные = 57%). Платья в нашем каталоге
// живут в tops.
var zoneAnchors = []struct{ zone, anchor string }{
	{"outerwear", "a coat or jacket"},
	{"tops", "a shirt, top or dress"},
	{"bottoms", "pants, jeans or a skirt"},
	{"shoes", "shoes or boots"},
	{"accessories", "a bag or accessory"},
}

// confMargin — минимальный отрыв ближайшей зоны от второй (в косинусном
// расстоянии), чтобы считать предсказание уверенным. Ниже — «не знаю»
// (zone_suggested = NULL): лучше молчать, чем врать флагом на ревью.
const confMargin = 0.04

func main() {
	fill := flag.Bool("fill", true, "заполнять garment_zone там, где он пустой")
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

	// Эмбеддинги якорей зон в том же пространстве, что и фото.
	rc := reco.New(cfg.RecoURL)
	anchors := make([]string, len(zoneAnchors))
	for i, a := range zoneAnchors {
		anchors[i] = a.anchor
	}
	labelVecs, err := rc.EmbedFashionText(ctx, anchors)
	if err != nil {
		log.Error("embed anchors", "err", err)
		os.Exit(1)
	}

	// Ближайший якорь считаем в SQL по сохранённому image_embedding: на каждую
	// зону — косинусное расстояние, берём минимум. Векторы зон идут как $1..$N,
	// имена зон — литералы (из нашего кода, не пользовательский ввод).
	args := make([]any, len(labelVecs))
	vs := ""
	for i, a := range zoneAnchors {
		if i > 0 {
			vs += ","
		}
		vs += "('" + a.zone + "', p.image_embedding <=> $" + itoa(i+1) + "::vector)"
		args[i] = reco.VectorLiteral(labelVecs[i])
	}

	// Топ-2 зоны по фото: ближайшая (best) и её отрыв от второй (margin).
	rows, err := pool.Query(ctx, `
		SELECT p.id, COALESCE(p.garment_zone,''), r.best, (r.second_d - r.best_d) AS margin
		FROM products p
		CROSS JOIN LATERAL (
		  SELECT
		    (array_agg(z ORDER BY d))[1]  AS best,
		    (array_agg(d ORDER BY d))[1]  AS best_d,
		    (array_agg(d ORDER BY d))[2]  AS second_d
		  FROM (VALUES `+vs+`) v(z, d)
		) r
		WHERE p.deleted_at IS NULL AND p.image_embedding IS NOT NULL`, args...)
	if err != nil {
		log.Error("classify", "err", err)
		os.Exit(1)
	}
	type res struct {
		id      int64
		current string
		guess   string
		margin  float64
	}
	var all []res
	for rows.Next() {
		var r res
		if err := rows.Scan(&r.id, &r.current, &r.guess, &r.margin); err != nil {
			log.Error("scan", "err", err)
			os.Exit(1)
		}
		all = append(all, r)
	}
	rows.Close()

	filled, mismatched, agreed, unsure := 0, 0, 0, 0
	for _, r := range all {
		confident := r.margin >= confMargin
		if !confident {
			// Неуверенно — молчим (аудит-флаг должен быть надёжным).
			_, _ = pool.Exec(ctx, `UPDATE products SET zone_suggested = NULL WHERE id = $1`, r.id)
			unsure++
			continue
		}
		_, _ = pool.Exec(ctx, `UPDATE products SET zone_suggested = $2 WHERE id = $1`, r.id, r.guess)
		switch {
		case r.current == "":
			if *fill {
				// Заполняя зону, ставим и пригодность к примерке (одежда — да,
				// обувь/аксессуары — нет): от неё зависит честная метрика «% пригодных».
				elig, reason := zoneEligible(r.guess)
				_, _ = pool.Exec(ctx, `
					UPDATE products SET garment_zone = $2, tryon_eligible = $3,
					  tryon_ineligible_reason = NULLIF($4,''), updated_at = now()
					WHERE id = $1`, r.id, r.guess, elig, reason)
				filled++
			}
		case r.current == r.guess:
			agreed++
		default:
			mismatched++
		}
	}
	log.Info("коерция завершена", "total", len(all),
		"agreed", agreed, "filled_empty", filled, "mismatch_flagged", mismatched, "unsure_skipped", unsure)
}

// zoneEligible — пригодность зоны к примерке (те же правила, что в импорте):
// одежда примеряется, обувь и аксессуары пока нет.
func zoneEligible(zone string) (bool, string) {
	switch zone {
	case "tops", "bottoms", "outerwear":
		return true, ""
	case "shoes":
		return false, "Обувь пока не поддерживается примеркой"
	case "accessories":
		return false, "Аксессуары примерка не поддерживает"
	default:
		return false, ""
	}
}

// itoa без strconv-импорта ради краткости хелпера построения плейсхолдеров.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [4]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
