package passport

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSummarizeNil(t *testing.T) {
	if Summarize(nil) != "" {
		t.Fatal("nil-паспорт должен давать пустую строку")
	}
}

func TestSummarizeEmpty(t *testing.T) {
	if got := Summarize(&Preferences{}); got != "" {
		t.Fatalf("пустой паспорт должен давать пустую строку, получили %q", got)
	}
}

func TestSummarizeIncludesSignals(t *testing.T) {
	p := &Preferences{
		ForWhom:           "female",
		StylePersonaBlend: []string{"Минимализм", "Old Money"},
		BrandsLove:        []string{"12 STOREEZ"},
		HardConstraints:   json.RawMessage(`{"no_fur":true}`),
	}
	got := Summarize(p)
	for _, want := range []string{"женское", "Минимализм", "Old Money", "12 STOREEZ", "no_fur"} {
		if !strings.Contains(got, want) {
			t.Fatalf("сводка не содержит %q:\n%s", want, got)
		}
	}
}

func TestSummarizeSkipsEmptyJSON(t *testing.T) {
	p := &Preferences{HardConstraints: json.RawMessage(`{}`)}
	if got := Summarize(p); strings.Contains(got, "ограничения") {
		t.Fatalf("пустой {} не должен попадать в сводку: %q", got)
	}
}

func TestJSONOrEmpty(t *testing.T) {
	if string(jsonOrEmpty(nil)) != "{}" {
		t.Fatal("nil должен стать {}")
	}
	if string(jsonOrEmpty(json.RawMessage(`{"a":1}`))) != `{"a":1}` {
		t.Fatal("непустой JSON должен пройти как есть")
	}
}

/*
 * Регрессия: частичная правка паспорта стирала всё остальное.
 *
 * Save вставлял новую версию ровно из присланного, а карточки «в паспорт»,
 * размеры и подписка на бренд шлют по одному полю. В проде у людей исчез
 * for_whom — и мужчинам предлагали платья, пайетки и мини.
 */
func TestMergeKeepsUntouchedFields(t *testing.T) {
	cur := &Preferences{
		ForWhom:          "men",
		BrandsLove:       []string{"Toteme"},
		SizeByCategory:   json.RawMessage(`{"top":"50 / L"}`),
		BudgetByCategory: json.RawMessage(`{"item":15000}`),
	}
	// пришёл только стоп-лист — как из карточки «что точно не наденете»
	got := mergePrefs(cur, Preferences{
		HardConstraints: json.RawMessage(`{"never_wear":["Неон"]}`),
	}, []string{"hard_constraints"})

	if got.ForWhom != "men" {
		t.Fatalf("пол стёрся: %q", got.ForWhom)
	}
	if len(got.BrandsLove) != 1 || got.BrandsLove[0] != "Toteme" {
		t.Fatalf("бренды стёрлись: %v", got.BrandsLove)
	}
	if !strings.Contains(string(got.SizeByCategory), "50 / L") {
		t.Fatalf("размеры стёрлись: %s", got.SizeByCategory)
	}
	if !strings.Contains(string(got.HardConstraints), "never_wear") {
		t.Fatal("стоп-лист не сохранился")
	}
}

func TestMergeAppliesSentField(t *testing.T) {
	cur := &Preferences{ForWhom: "women"}
	got := mergePrefs(cur, Preferences{ForWhom: "men"}, []string{"for_whom"})
	if got.ForWhom != "men" {
		t.Fatalf("присланное поле не применилось: %q", got.ForWhom)
	}
}

// Очистка списка обязана работать: отписка от последнего бренда шлёт [].
func TestMergeAllowsClearing(t *testing.T) {
	cur := &Preferences{BrandsLove: []string{"Toteme"}}
	got := mergePrefs(cur, Preferences{BrandsLove: []string{}}, []string{"brands_love"})
	if len(got.BrandsLove) != 0 {
		t.Fatalf("список не очистился: %v", got.BrandsLove)
	}
}

// Ключ не прислали — поле не трогаем, даже если в структуре оно нулевое.
func TestMergeIgnoresAbsentField(t *testing.T) {
	cur := &Preferences{BrandsLove: []string{"Toteme"}}
	got := mergePrefs(cur, Preferences{}, []string{"size_by_category"})
	if len(got.BrandsLove) != 1 {
		t.Fatalf("непришедшее поле затёрлось: %v", got.BrandsLove)
	}
}
