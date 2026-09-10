// Package enrich — LLM-обогащение атрибутов каталога. Из name+описания+бренда
// достраиваем структурные признаки (эстетики, повод, формальность, силуэт,
// палитра, сезон), которых нет в фиде. Обогащённые атрибуты идут: в текст для
// эмбеддинга (лучше подбор), стилисту в подсказку и в разметку gold-set.
package enrich

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

type Enricher struct {
	client anthropic.Client
	model  anthropic.Model
}

func New(apiKey, model string) *Enricher {
	return &Enricher{
		client: anthropic.NewClient(option.WithAPIKey(apiKey)),
		model:  anthropic.Model(model),
	}
}

// ProductInput — что подаём модели на обогащение.
type ProductInput struct {
	ExternalRef string `json:"ref"` // наш ключ для сопоставления ответа (public_id)
	Name        string `json:"name"`
	Brand       string `json:"brand"`
	Zone        string `json:"zone,omitempty"`
	Color       string `json:"color,omitempty"`
	Material    string `json:"material,omitempty"`
	Description string `json:"description,omitempty"`
}

// Attributes — структурные признаки (кладём в products.attributes jsonb).
type Attributes struct {
	StyleTags  []string `json:"style_tags,omitempty"`
	Occasion   []string `json:"occasion,omitempty"`
	Formality  string   `json:"formality,omitempty"`
	Silhouette string   `json:"silhouette,omitempty"`
	Palette    string   `json:"palette,omitempty"`
	Season     []string `json:"season,omitempty"`
	Warmth     string   `json:"warmth,omitempty"`
}

const systemPrompt = `Ты — фэшн-аналитик российского каталога одежды. По названию, бренду и описанию товара достраиваешь его стилевые атрибуты. Отвечай кратко, по-русски, реалистично — не выдумывай того, чего не может быть у этого товара.

Верни СТРОГО JSON-массив (без markdown, без пояснений) объектов в ТОМ ЖЕ порядке, что и входные товары. Каждый объект:
{
  "ref": "<ref из входа>",
  "style_tags": ["2-4 эстетики: напр. минимализм, casual, старые деньги, стритвир"],
  "occasion": ["поводы: повседневный, офис, вечер, спорт, свидание..."],
  "formality": "одно из: casual | smart-casual | formal | sport",
  "silhouette": "короткая фраза про крой/силуэт",
  "palette": "цветовая семья: нейтральная | тёплая | холодная | яркая | пастель | монохром",
  "season": ["весна","лето","осень","зима" — что подходит],
  "warmth": "одно из: лёгкий | демисезон | тёплый (для одежды; иначе пропусти)"
}`

// EnrichBatch обогащает пачку товаров одним вызовом. Возвращает атрибуты по ref.
func (e *Enricher) EnrichBatch(ctx context.Context, items []ProductInput) (map[string]Attributes, error) {
	payload, _ := json.Marshal(items)
	msg, err := e.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     e.model,
		MaxTokens: 2048,
		System:    []anthropic.TextBlockParam{{Text: systemPrompt}},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(
				"Товары для обогащения (JSON):\n" + string(payload))),
		},
	})
	if err != nil {
		return nil, err
	}

	var raw strings.Builder
	for _, b := range msg.Content {
		if t, ok := b.AsAny().(anthropic.TextBlock); ok {
			raw.WriteString(t.Text)
		}
	}
	jsonText := extractJSONArray(raw.String())

	var out []struct {
		Ref string `json:"ref"`
		Attributes
	}
	if err := json.Unmarshal([]byte(jsonText), &out); err != nil {
		return nil, fmt.Errorf("разбор ответа модели: %w", err)
	}
	res := make(map[string]Attributes, len(out))
	for _, o := range out {
		res[o.Ref] = o.Attributes
	}
	return res, nil
}

// extractJSONArray вырезает JSON-массив из ответа (на случай, если модель обернула
// его в ```json ... ``` или добавила текст).
func extractJSONArray(s string) string {
	s = strings.TrimSpace(s)
	if i := strings.IndexByte(s, '['); i >= 0 {
		if j := strings.LastIndexByte(s, ']'); j > i {
			return s[i : j+1]
		}
	}
	return s
}
