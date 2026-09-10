// map-analogs размечает аналоги: бренд вкуса → бренды нашего каталога.
//
//	go run ./cmd/map-analogs           # только неразмеченные
//	go run ./cmd/map-analogs -all      # пересобрать всё (ручную правку не трогает)
//
// Почему LLM, а не эмбеддинги: у бренда вкуса, которого нет в каталоге
// (Burberry), нет ни одного товара — считать по ним вектор не из чего.
// Знание «кто на кого похож» здесь внешнее, и его даёт модель.
// Разметка идёт из списка НАШИХ брендов: модель выбирает из закрытого набора
// и не может придумать бренд, которого у нас нет.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/jackc/pgx/v5/pgxpool"

	"mml-platform-backend/internal/config"
)

const maxAnalogs = 8

const system = `Ты — fashion-аналитик. Тебе дают бренд и ЗАКРЫТЫЙ список брендов каталога.
Выбери те из списка, которыми можно заменить этот бренд для покупателя: близкие по
эстетике, силуэту, ценовому уровню и аудитории.

Верни СТРОГО JSON: {"analogs":[{"brand":"<имя ИЗ СПИСКА>","reason":"<до 8 слов>"}]}
Порядок — от самого близкого. Максимум 8. Брать ТОЛЬКО имена из списка, дословно.
Если близких нет — верни {"analogs":[]}. Пустой ответ лучше натянутого.`

func main() {
	all := flag.Bool("all", false, "пересобрать всё, а не только неразмеченное")
	flag.Parse()

	cfg, err := config.Load()
	log := slog.Default()
	if err != nil {
		log.Error("конфиг", "err", err)
		os.Exit(1)
	}
	if cfg.AnthropicAPIKey == "" {
		log.Error("нет ANTHROPIC_API_KEY")
		os.Exit(1)
	}
	ctx := context.Background()
	pool, err2 := pgxpool.New(ctx, cfg.DatabaseURL)
	err = err2
	if err != nil {
		log.Error("db", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Бренды каталога — закрытый список, из которого выбирает модель.
	catalog := map[string]int64{}
	var names []string
	rows, err := pool.Query(ctx, `
		SELECT b.id, b.name FROM brands b
		WHERE EXISTS (SELECT 1 FROM products p
		              WHERE p.brand_id = b.id AND p.deleted_at IS NULL AND p.is_active)
		ORDER BY b.name`)
	if err != nil {
		log.Error("бренды каталога", "err", err)
		os.Exit(1)
	}
	for rows.Next() {
		var id int64
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			log.Error("scan", "err", err)
			os.Exit(1)
		}
		catalog[strings.ToLower(name)] = id
		names = append(names, name)
	}
	rows.Close()
	if len(names) == 0 {
		log.Error("в каталоге нет брендов с живыми товарами — размечать не на что")
		os.Exit(1)
	}
	log.Info("каталог", "брендов", len(names))

	// Бренды вкуса к разметке.
	q := `SELECT tb.id, tb.name, tb.grade FROM taste_brands tb`
	if !*all {
		q += ` WHERE NOT EXISTS (SELECT 1 FROM brand_analogs a WHERE a.taste_brand_id = tb.id)`
	}
	q += ` ORDER BY tb.rank`
	type tb struct {
		id    int64
		name  string
		grade string
	}
	var todo []tb
	rows, err = pool.Query(ctx, q)
	if err != nil {
		log.Error("бренды вкуса", "err", err)
		os.Exit(1)
	}
	for rows.Next() {
		var t tb
		if err := rows.Scan(&t.id, &t.name, &t.grade); err != nil {
			log.Error("scan", "err", err)
			os.Exit(1)
		}
		todo = append(todo, t)
	}
	rows.Close()
	log.Info("к разметке", "брендов", len(todo))

	llm := anthropic.NewClient(option.WithAPIKey(cfg.AnthropicAPIKey))
	list := strings.Join(names, "\n")
	var mapped, empty, failed int

	for _, t := range todo {
		prompt := fmt.Sprintf("Бренд: %s (уровень: %s)\n\nСписок брендов каталога:\n%s",
			t.name, gradeRu(t.grade), list)
		msg, err := llm.Messages.New(ctx, anthropic.MessageNewParams{
			Model:     anthropic.Model(cfg.AnthropicModel),
			MaxTokens: 600,
			System:    []anthropic.TextBlockParam{{Text: system}},
			Messages:  []anthropic.MessageParam{anthropic.NewUserMessage(anthropic.NewTextBlock(prompt))},
		})
		if err != nil {
			log.Warn("модель", "бренд", t.name, "err", err)
			failed++
			continue
		}
		var raw string
		for _, b := range msg.Content {
			if b.Type == "text" {
				raw += b.Text
			}
		}
		analogs, err := parse(raw)
		if err != nil {
			log.Warn("разбор", "бренд", t.name, "err", err)
			failed++
			continue
		}

		// Ручную разметку не трогаем — человек важнее прогона.
		if _, err := pool.Exec(ctx,
			`DELETE FROM brand_analogs WHERE taste_brand_id=$1 AND source='llm'`, t.id); err != nil {
			log.Warn("очистка", "бренд", t.name, "err", err)
			failed++
			continue
		}
		n := 0
		for _, a := range analogs {
			bid, ok := catalog[strings.ToLower(strings.TrimSpace(a.Brand))]
			if !ok {
				// Модель назвала бренд не из списка — пропускаем молча:
				// придуманный аналог хуже отсутствующего.
				continue
			}
			if n >= maxAnalogs {
				break
			}
			n++
			if _, err := pool.Exec(ctx, `
				INSERT INTO brand_analogs (taste_brand_id, brand_id, rank, reason, source)
				VALUES ($1,$2,$3,$4,'llm')
				ON CONFLICT (taste_brand_id, brand_id) DO NOTHING`, t.id, bid, n, a.Reason); err != nil {
				log.Warn("вставка", "бренд", t.name, "err", err)
			}
		}
		if n == 0 {
			empty++
			log.Info("аналогов нет", "бренд", t.name)
		} else {
			mapped++
			log.Info("размечен", "бренд", t.name, "аналогов", n)
		}
	}
	log.Info("готово", "размечено", mapped, "без_аналогов", empty, "ошибок", failed)
}

type analog struct {
	Brand  string `json:"brand"`
	Reason string `json:"reason"`
}

func parse(raw string) ([]analog, error) {
	i, j := strings.Index(raw, "{"), strings.LastIndex(raw, "}")
	if i < 0 || j <= i {
		return nil, fmt.Errorf("не JSON")
	}
	var out struct {
		Analogs []analog `json:"analogs"`
	}
	if err := json.Unmarshal([]byte(raw[i:j+1]), &out); err != nil {
		return nil, err
	}
	return out.Analogs, nil
}

func gradeRu(g string) string {
	if g == "local" {
		return "локальный/региональный"
	}
	return "всемирно известный"
}
