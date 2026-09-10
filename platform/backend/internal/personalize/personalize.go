// Package personalize превращает паспорт стиля в структурный профиль для
// ретривала (catalog.Personalization). Общий код для чата и дрип-реактивации.
package personalize

import (
	"context"
	"encoding/json"
	"strings"

	"mml-platform-backend/internal/catalog"
	"mml-platform-backend/internal/passport"
)

// Build: пол (дефолт фильтра), любимые/нелюбимые бренды (нижний регистр),
// потолки бюджета по категориям. nil, если персонализировать нечего.
func Build(prefs *passport.Preferences) *catalog.Personalization {
	if prefs == nil {
		return nil
	}
	pz := &catalog.Personalization{}
	// Онбординг пишет for_whom неоднородно (female/women, male/men), а
	// products.gender — строго female/male. Нормализуем, иначе гендер-фильтр
	// персонализации молча не срабатывает.
	switch strings.ToLower(strings.TrimSpace(prefs.ForWhom)) {
	case "female", "women", "woman", "женское", "ж":
		pz.Gender = "female"
	case "male", "men", "man", "мужское", "м":
		pz.Gender = "male"
	}
	lower := func(in []string) []string {
		out := make([]string, 0, len(in))
		for _, s := range in {
			if s = strings.ToLower(strings.TrimSpace(s)); s != "" {
				out = append(out, s)
			}
		}
		return out
	}
	pz.BrandsLove = lower(prefs.BrandsLove)
	pz.BrandsAvoid = lower(prefs.BrandsAvoid)

	// Бюджет: {"outerwear": 30000, ...}. Терпимы к формату — что распарсилось,
	// то и учли; ключ-зона ищется в HybridSearch, иначе берётся общий максимум.
	if len(prefs.BudgetByCategory) > 2 {
		var m map[string]float64
		if json.Unmarshal(prefs.BudgetByCategory, &m) == nil && len(m) > 0 {
			pz.BudgetByZone = m
		}
	}
	if pz.Gender == "" && len(pz.BrandsLove) == 0 && len(pz.BrandsAvoid) == 0 && len(pz.BudgetByZone) == 0 {
		return nil // нечего персонализировать
	}
	return pz
}

// AnalogResolver — любимые бренды человека → бренды нашего каталога.
type AnalogResolver func(ctx context.Context, brands []string) ([]string, error)

// WithAnalogs дополняет BrandsLove аналогами из каталога.
//
// Без этого выбор брендов в онбординге почти всегда ни на что не влиял: буст
// ищет точное совпадение имени, а человек называет марки, которых у нас нет
// (Burberry, Zara). Сами названия оставляем — если бренд у нас есть, он и
// должен подниматься напрямую.
func WithAnalogs(ctx context.Context, pz *catalog.Personalization, resolve AnalogResolver) {
	if pz == nil || resolve == nil || len(pz.BrandsLove) == 0 {
		return
	}
	analogs, err := resolve(ctx, pz.BrandsLove)
	if err != nil || len(analogs) == 0 {
		return // не разошлись аналоги — работаем как раньше, без них
	}
	seen := map[string]bool{}
	for _, b := range pz.BrandsLove {
		seen[b] = true
	}
	for _, a := range analogs {
		a = strings.ToLower(strings.TrimSpace(a))
		if a != "" && !seen[a] {
			seen[a] = true
			pz.BrandsLove = append(pz.BrandsLove, a)
		}
	}
}
