// Package curate — «AI-подборка» для стола стилиста. По паспорту клиента
// собирает персонализированный ранжированный набор товаров (семантический поиск
// e5 + доранжирование по бренд-предпочтениям и бюджету, теми же весами, что и
// гибридный ретривал чата) и генерирует короткую заметку стилиста (LLM).
package curate

import (
	"context"
	"fmt"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"

	"mml-platform-backend/internal/catalog"
	"mml-platform-backend/internal/reco"
)

// Веса доранжирования — согласованы с HybridSearch (search.go), чтобы подбор на
// столе и подбор в чате вели себя одинаково.
const (
	poolSize    = 24    // кандидатов из семантического поиска до доранжирования
	boostLove   = 0.015 // +score за любимый бренд
	penAvoid    = 0.040 // −score за нелюбимый бренд
	penOverBudg = 0.012 // −score за цену заметно выше бюджета
	budgSlack   = 1.15  // на 15% выше бюджета ещё ок
)

// Card — карточка товара для UI стола (то, что видит и отправляет стилист).
type Card struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Brand         string   `json:"brand"`
	Price         *float64 `json:"price"`
	ImageURL      string   `json:"image_url"`
	Zone          string   `json:"zone"`
	TryonEligible bool     `json:"tryon_eligible"`
}

// Result — итог подбора: карточки + заметка стилиста.
type Result struct {
	Cards []Card `json:"products"`
	Note  string `json:"note"`
}

type Engine struct {
	repo  *catalog.Repo
	reco  *reco.Client
	llm   *anthropic.Client
	model string
}

// New — apiKey пустой → заметку не генерируем (Note останется пустой, стилист
// напишет сам). repo и reco обязательны.
func New(repo *catalog.Repo, recoClient *reco.Client, apiKey, model string) *Engine {
	e := &Engine{repo: repo, reco: recoClient, model: model}
	if apiKey != "" {
		c := anthropic.NewClient(option.WithAPIKey(apiKey))
		e.llm = &c
	}
	return e
}

// Suggest: summary — человекочитаемый паспорт (passport.Summarize) как семантический
// запрос; pz — персонализация (бренды/бюджет/пол); limit — сколько карточек вернуть.
func (e *Engine) Suggest(ctx context.Context, summary string, pz *catalog.Personalization, limit int) (*Result, error) {
	if strings.TrimSpace(summary) == "" {
		summary = "стильная базовая одежда, универсальный гардероб"
	}
	if limit <= 0 || limit > 12 {
		limit = 6
	}

	vecs, err := e.reco.Embed(ctx, []string{summary}, "query")
	if err != nil || len(vecs) == 0 {
		return nil, fmt.Errorf("эмбеддинг запроса: %w", err)
	}
	filter := catalog.ListFilter{Limit: poolSize}
	if pz != nil {
		filter.Gender = pz.Gender
	}
	results, err := e.repo.SemanticSearch(ctx, reco.VectorLiteral(vecs[0]), filter)
	if err != nil {
		return nil, err
	}

	rerankPersonalized(results, pz)
	if len(results) > limit {
		results = results[:limit]
	}

	cards := make([]Card, 0, len(results))
	for _, r := range results {
		var price *float64
		if len(r.Offers) > 0 {
			p := r.Offers[0].Price
			price = &p
		}
		img := ""
		if len(r.Images) > 0 {
			img = r.Images[0].URL
		}
		cards = append(cards, Card{
			ID: r.PublicID, Name: r.Name, Brand: r.Brand.Name,
			Price: price, ImageURL: img, Zone: r.GarmentZone, TryonEligible: r.TryonEligible,
		})
	}

	return &Result{Cards: cards, Note: e.note(ctx, summary, cards)}, nil
}

// rerankPersonalized — доранжирование результатов семантического поиска по
// бренд-предпочтениям и бюджету (аналог персонализации HybridSearch, но в Go,
// т.к. текстовый поиск не применяет её сам).
func rerankPersonalized(results []catalog.SearchResult, pz *catalog.Personalization) {
	if pz == nil {
		return
	}
	for i := range results {
		r := &results[i]
		bn := strings.ToLower(r.Brand.Name)
		if brandHit(bn, pz.BrandsLove) {
			r.Score += boostLove
		}
		if brandHit(bn, pz.BrandsAvoid) {
			r.Score -= penAvoid
		}
		if len(r.Offers) > 0 {
			ceil := budgetCeil(pz, r.GarmentZone)
			if ceil > 0 && r.Offers[0].Price > ceil*budgSlack {
				r.Score -= penOverBudg
			}
		}
	}
	// стабильная сортировка по убыванию score
	for i := 1; i < len(results); i++ {
		for j := i; j > 0 && results[j].Score > results[j-1].Score; j-- {
			results[j], results[j-1] = results[j-1], results[j]
		}
	}
}

// brandHit — тот же нечёткий префиксный матч, что и brandMatch в SQL: имя бренда
// равно, начинается с t или t начинается с имени (len(t) >= 3).
func brandHit(brandLower string, brands []string) bool {
	for _, t := range brands {
		t = strings.ToLower(strings.TrimSpace(t))
		if len(t) < 3 {
			continue
		}
		if brandLower == t || strings.HasPrefix(brandLower, t) || strings.HasPrefix(t, brandLower) {
			return true
		}
	}
	return false
}

func budgetCeil(pz *catalog.Personalization, zone string) float64 {
	if pz == nil || len(pz.BudgetByZone) == 0 {
		return 0
	}
	if v, ok := pz.BudgetByZone[zone]; ok && v > 0 {
		return v
	}
	maxv := 0.0
	for _, v := range pz.BudgetByZone {
		if v > maxv {
			maxv = v
		}
	}
	return maxv
}

const noteSystem = `Ты — персональный стилист российского сервиса. По паспорту клиента и подобранным вещам напиши короткую тёплую заметку (1–2 предложения, по-русски), которая объяснит логику подборки: почему эти вещи клиенту подойдут. Без воды и клише, конкретно. Не перечисляй товары списком, не выдумывай того, чего нет. Верни ТОЛЬКО текст заметки.`

// note — заметка стилиста через LLM. При ошибке/без ключа возвращает "".
func (e *Engine) note(ctx context.Context, summary string, cards []Card) string {
	if e.llm == nil || len(cards) == 0 {
		return ""
	}
	var names []string
	for _, c := range cards {
		names = append(names, c.Brand+" · "+c.Name)
	}
	user := "Паспорт клиента:\n" + summary + "\n\nПодобранные вещи:\n- " + strings.Join(names, "\n- ")
	msg, err := e.llm.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.Model(e.model),
		MaxTokens: 300,
		System:    []anthropic.TextBlockParam{{Text: noteSystem}},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(user)),
		},
	})
	if err != nil {
		return ""
	}
	var b strings.Builder
	for _, blk := range msg.Content {
		if t, ok := blk.AsAny().(anthropic.TextBlock); ok {
			b.WriteString(t.Text)
		}
	}
	return strings.TrimSpace(b.String())
}
