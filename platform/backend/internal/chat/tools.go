package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"mml-platform-backend/internal/content"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"

	"mml-platform-backend/internal/catalog"
)

// Embedder — превращает текст запроса в векторы (reco-сайдкар). Два пространства:
// e5 (текст, русский) и Marqo fashion-текст (общее с фото, англоязычный вход).
type Embedder interface {
	Embed(ctx context.Context, texts []string, kind string) ([][]float32, error)
	EmbedFashionText(ctx context.Context, texts []string) ([][]float32, error)
}

type searchInput struct {
	Query    string  `json:"query"`
	QueryEN  string  `json:"query_en,omitempty"`
	Zone     string  `json:"zone,omitempty"`
	Gender   string  `json:"gender,omitempty"`
	MinPrice float64 `json:"min_price,omitempty"`
	MaxPrice float64 `json:"max_price,omitempty"`
	Limit    int     `json:"limit,omitempty"`
}

func searchCatalogTool() anthropic.ToolUnionParam {
	tool := anthropic.ToolParam{
		Name: "search_catalog",
		Description: anthropic.String(
			"Семантический поиск по каталогу одежды. Вызывайте всякий раз, когда нужно подобрать " +
				"или показать товары — не отвечайте про ассортимент по памяти. Запрос формулируйте " +
				"по-русски описательно (силуэт, ткань, цвет, повод). Возвращает товары с ценами."),
		InputSchema: anthropic.ToolInputSchemaParam{
			Properties: map[string]any{
				"query": map[string]any{
					"type":        "string",
					"description": "Описательный поисковый запрос по-русски, например «тёплое шерстяное пальто оверсайз»",
				},
				"query_en": map[string]any{
					"type": "string",
					"description": "Тот же запрос, кратко переведённый на английский (например «warm oversized wool coat»). " +
						"Нужен для поиска по фото — модель изображений англоязычная. Заполняйте всегда.",
				},
				"zone": map[string]any{
					"type": "string",
					// Зоны берём из каталога, а не списком «по памяти»: в перечне
					// не было dress (модель не могла попросить платье и отвечала,
					// что платьев нет — при 52 в каталоге), зато были shoes,
					// которых в каталоге не существует вовсе → пустая выдача.
					"enum":        content.Zones,
					"description": "Гардеробная зона, если очевидна из запроса",
				},
				"gender": map[string]any{
					"type":        "string",
					"enum":        []string{"female", "male"},
					"description": "Пол, если известен",
				},
				"min_price": map[string]any{"type": "number", "description": "Минимальная цена, ₽"},
				"max_price": map[string]any{"type": "number", "description": "Максимальная цена, ₽"},
				"limit":     map[string]any{"type": "integer", "description": "Сколько вернуть (по умолчанию 6)"},
			},
			Required: []string{"query"},
		},
	}
	return anthropic.ToolUnionParam{OfTool: &tool}
}

// executeSearch выполняет поиск и возвращает две проекции результата:
// компактную для модели (экономим токены) и полную для фронта (SSE-событие products).
func executeSearch(ctx context.Context, repo *catalog.Repo, embed Embedder, encode func([]float32) string, raw json.RawMessage, pz *catalog.Personalization) (modelResult string, cards []catalog.SearchResult, err error) {
	var in searchInput
	if err := json.Unmarshal(raw, &in); err != nil {
		return "", nil, fmt.Errorf("разбор входа search_catalog: %w", err)
	}
	if in.Limit <= 0 || in.Limit > 12 {
		in.Limit = 6
	}

	textVecs, err := embed.Embed(ctx, []string{in.Query}, "query")
	if err != nil {
		return "", nil, err
	}
	filter := catalog.ListFilter{
		Zone:     in.Zone,
		Gender:   in.Gender,
		MinPrice: in.MinPrice,
		MaxPrice: in.MaxPrice,
		Limit:    in.Limit,
	}
	// Персонализация вошедшего применяется всегда, даже если модель не передала
	// пол/бренды в tool: пол из паспорта — дефолт, когда запрос его не задал.
	if filter.Gender == "" && pz != nil && pz.Gender != "" {
		filter.Gender = pz.Gender
	}

	// Гибрид, если модель дала английский вариант: сливаем e5 (лексика) и
	// Marqo-image (визуал) через RRF + персонализация (бренды/бюджет). Если
	// фото-эмбеддер недоступен или EN нет — мягкий откат на текстовый поиск.
	var items []catalog.SearchResult
	if strings.TrimSpace(in.QueryEN) != "" {
		if imgVecs, e := embed.EmbedFashionText(ctx, []string{in.QueryEN}); e == nil && len(imgVecs) > 0 {
			items, err = repo.HybridSearch(ctx, encode(textVecs[0]), encode(imgVecs[0]), filter, pz)
		} else {
			items, err = repo.SemanticSearch(ctx, encode(textVecs[0]), filter)
		}
	} else {
		items, err = repo.SemanticSearch(ctx, encode(textVecs[0]), filter)
	}
	if err != nil {
		return "", nil, err
	}

	if len(items) == 0 {
		return "Ничего не найдено по этому запросу. Каталог ограничен — скажите об этом честно и предложите переформулировать.", nil, nil
	}

	// Компактная проекция для модели.
	var b strings.Builder
	fmt.Fprintf(&b, "Найдено %d товаров:\n", len(items))
	for _, it := range items {
		price := "цена не указана"
		if len(it.Offers) > 0 {
			price = fmt.Sprintf("%.0f %s (%s)", it.Offers[0].Price, it.Offers[0].Currency, it.Offers[0].Retailer)
		}
		fmt.Fprintf(&b, "- id=%s | %s — %s | %s/%s | цвет: %s | %s | примерка: %v\n",
			it.PublicID, it.Brand.Name, it.Name, it.GarmentZone, it.Category,
			orDash(it.Color), price, it.TryonEligible)
	}
	b.WriteString("Карточки уже показаны человеку — не перечисляйте их заново, дайте заметку стилиста.")
	return b.String(), items, nil
}

func orDash(s string) string {
	if s == "" {
		return "—"
	}
	return s
}
