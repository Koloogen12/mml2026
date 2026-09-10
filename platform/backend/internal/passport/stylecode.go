package passport

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

// Стиль-код — «Your style DNA» по образцу Daydream: короткое имя стиля,
// объяснение на одну фразу и оси-настройки.
//
// Раньше в паспорте висело захардкоженное «Спокойно · Дорого · Женственно» —
// одно и то же у всех, включая мужчин. Потом поле привязали к
// style_self_described, которое никто не заполняет, и код у всех был «не
// собран». Теперь его генерирует модель из реальных ответов онбординга.

// StyleAxis — ось характера стиля. Value 0..100 между полюсами.
type StyleAxis struct {
	Key   string `json:"key"`
	Left  string `json:"left"`
	Right string `json:"right"`
	Value int    `json:"value"`
}

// StyleCode — то, что показывает паспорт.
type StyleCode struct {
	Title string      `json:"title"` // «Тихий минимализм»
	Body  string      `json:"body"`  // одно предложение — из чего это собрано
	Axes  []StyleAxis `json:"axes"`
}

// Оси фиксированы: их сравнивают между собой и хранят во времени, поэтому
// набор задаём мы, а модель только расставляет значения.
var styleAxes = []struct{ Key, Left, Right string }{
	{"boldness", "Сдержанно", "Заметно"},
	{"maturity", "Молодо", "Взросло"},
	{"romanticism", "Минимализм", "Романтика"},
	{"silhouette", "Мягкий силуэт", "Строгий силуэт"},
	{"temporal", "Современно", "Винтаж"},
	{"trendiness", "Вне времени", "Тренды"},
}

const styleSystem = `Ты — стилист. По ответам человека из онбординга собери его «стиль-код».

Верни СТРОГО JSON без пояснений:
{"title":"...","body":"...","axes":{"boldness":0-100,"maturity":0-100,"romanticism":0-100,"silhouette":0-100,"temporal":0-100,"trendiness":0-100}}

title — 2–3 слова по-русски, имя стиля этого человека. Не клише, не «Стильный образ».
body — ОДНО предложение по-русски: из чего этот вывод следует. Опирайся только на
то, что человек реально указал. Не выдумывай фактов о нём.

Оси (0 — левый полюс, 100 — правый):
boldness: 0 сдержанно … 100 заметно
maturity: 0 молодо … 100 взросло
romanticism: 0 минимализм … 100 романтика
silhouette: 0 мягкий … 100 строгий
temporal: 0 современно … 100 винтаж
trendiness: 0 вне времени … 100 тренды

Если данных мало — ставь значения ближе к 50 и скажи об этом в body честно.`

// GenerateStyleCode собирает стиль-код по паспорту.
// Возвращает ошибку, если describe нечего: пустой паспорт → пустой код,
// выдумывать человеку его стиль нельзя.
func GenerateStyleCode(ctx context.Context, apiKey, model string, p Preferences) (*StyleCode, error) {
	facts := describeForStyle(p)
	if facts == "" {
		return nil, errors.New("паспорт пуст — стиль-код собирать не из чего")
	}
	llm := anthropic.NewClient(option.WithAPIKey(apiKey))
	msg, err := llm.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.Model(model),
		MaxTokens: 400,
		System:    []anthropic.TextBlockParam{{Text: styleSystem}},
		Messages:  []anthropic.MessageParam{anthropic.NewUserMessage(anthropic.NewTextBlock(facts))},
	})
	if err != nil {
		return nil, err
	}
	var raw string
	for _, b := range msg.Content {
		if b.Type == "text" {
			raw += b.Text
		}
	}
	return parseStyleCode(raw)
}

func parseStyleCode(raw string) (*StyleCode, error) {
	// Модель иногда оборачивает JSON в ```json — вырезаем тело объекта.
	i, j := strings.Index(raw, "{"), strings.LastIndex(raw, "}")
	if i < 0 || j <= i {
		return nil, errors.New("модель вернула не JSON")
	}
	var parsed struct {
		Title string         `json:"title"`
		Body  string         `json:"body"`
		Axes  map[string]int `json:"axes"`
	}
	if err := json.Unmarshal([]byte(raw[i:j+1]), &parsed); err != nil {
		return nil, err
	}
	if strings.TrimSpace(parsed.Title) == "" {
		return nil, errors.New("модель не назвала стиль")
	}
	out := &StyleCode{Title: strings.TrimSpace(parsed.Title), Body: strings.TrimSpace(parsed.Body)}
	for _, a := range styleAxes {
		v, ok := parsed.Axes[a.Key]
		if !ok {
			v = 50
		}
		out.Axes = append(out.Axes, StyleAxis{Key: a.Key, Left: a.Left, Right: a.Right, Value: clamp(v)})
	}
	return out, nil
}

func clamp(v int) int {
	if v < 0 {
		return 0
	}
	if v > 100 {
		return 100
	}
	return v
}

// describeForStyle — только то, что человек реально указал.
func describeForStyle(p Preferences) string {
	var b strings.Builder
	add := func(label string, vals []string) {
		if len(vals) > 0 {
			fmt.Fprintf(&b, "%s: %s\n", label, strings.Join(vals, ", "))
		}
	}
	if p.ForWhom != "" {
		fmt.Fprintf(&b, "Покупает: %s\n", p.ForWhom)
	}
	add("Выбранные эстетики", p.StylePersonaBlend)
	add("Про свой стиль", p.StyleSelfDescribed)
	add("К чему стремится", p.StyleAspirational)
	add("Любимые бренды", p.BrandsLove)
	add("Не носит", p.BrandsAvoid)
	if p.DesiredMoodDefault != "" {
		fmt.Fprintf(&b, "Настроение: %s\n", p.DesiredMoodDefault)
	}
	// LifestyleAllocation и BudgetByCategory — это json.RawMessage, а не карты:
	// пройтись по ним range'ом значит пройтись по байтам.
	if m := decodeMap(p.LifestyleAllocation); len(m) > 0 {
		parts := make([]string, 0, len(m))
		for k, v := range m {
			parts = append(parts, fmt.Sprintf("%s — %v", k, v))
		}
		sort.Strings(parts)
		fmt.Fprintf(&b, "Образ жизни: %s\n", strings.Join(parts, "; "))
	}
	if m := decodeMap(p.BudgetByCategory); len(m) > 0 {
		parts := make([]string, 0, len(m))
		for k, v := range m {
			parts = append(parts, fmt.Sprintf("%s — %v ₽", k, v))
		}
		sort.Strings(parts)
		fmt.Fprintf(&b, "Бюджет: %s\n", strings.Join(parts, "; "))
	}
	return strings.TrimSpace(b.String())
}

func decodeMap(raw json.RawMessage) map[string]any {
	if len(raw) == 0 {
		return nil
	}
	var m map[string]any
	if json.Unmarshal(raw, &m) != nil {
		return nil
	}
	return m
}

// ── Хранение ────────────────────────────────────────────────────────────────

// StyleCodeFor возвращает стиль-код: сохранённый, если паспорт с тех пор не
// менялся, иначе генерирует заново. nil без ошибки — паспорт пуст, показывать
// нечего (и выдумывать нечего).
func (s *Store) StyleCodeFor(ctx context.Context, userID int64, apiKey, model string) (*StyleCode, error) {
	p, err := s.Current(ctx, userID)
	if err != nil || p == nil {
		return nil, nil
	}
	facts := describeForStyle(*p)
	if facts == "" {
		return nil, nil
	}
	rev := revOf(facts)

	var out StyleCode
	var savedRev string
	var axesRaw []byte
	err = s.pool.QueryRow(ctx,
		`SELECT title, body, axes, passport_rev FROM user_style_code WHERE user_id=$1`, userID).
		Scan(&out.Title, &out.Body, &axesRaw, &savedRev)
	if err == nil && savedRev == rev {
		_ = json.Unmarshal(axesRaw, &out.Axes)
		return &out, nil
	}

	gen, err := GenerateStyleCode(ctx, apiKey, model, *p)
	if err != nil {
		return nil, err
	}
	axes, _ := json.Marshal(gen.Axes)
	_, err = s.pool.Exec(ctx, `
		INSERT INTO user_style_code (user_id, title, body, axes, passport_rev)
		VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (user_id) DO UPDATE
		  SET title=$2, body=$3, axes=$4, passport_rev=$5, updated_at=now()`,
		userID, gen.Title, gen.Body, axes, rev)
	return gen, err
}

// revOf — отпечаток паспорта: тот же паспорт → тот же код, без повторного
// обращения к модели.
func revOf(facts string) string {
	h := sha256.Sum256([]byte(facts))
	return hex.EncodeToString(h[:8])
}
