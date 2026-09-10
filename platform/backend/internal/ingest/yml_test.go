package ingest

import "strings"

import "testing"

const sampleYML = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog><shop>
<categories><category id="1">Верхняя одежда</category></categories>
<offers>
  <offer id="A1" available="true">
    <name>Пальто бежевое</name><vendor>TESTWEAR</vendor>
    <url>https://t.ru/A1</url><price>18 990</price><oldprice>24990</oldprice>
    <currencyId>RUR</currencyId><categoryId>1</categoryId>
    <picture>https://cdn/1.jpg</picture><picture>https://cdn/2.jpg</picture>
    <param name="Размер">M</param><param name="Размер">L</param>
    <param name="Цвет">Бежевый</param>
  </offer>
  <offer id="A2">
    <typePrefix>Куртка</typePrefix><vendor>ACME</vendor><model>Bomber</model>
    <price>5000,50</price><picture>https://cdn/3.jpg</picture>
  </offer>
</offers></shop></yml_catalog>`

func TestParseYML(t *testing.T) {
	offers, err := ParseYML(strings.NewReader(sampleYML))
	if err != nil {
		t.Fatal(err)
	}
	if len(offers) != 2 {
		t.Fatalf("офферов = %d, ждали 2", len(offers))
	}

	a1 := offers[0]
	if a1.Name != "Пальто бежевое" || a1.Brand != "TESTWEAR" {
		t.Errorf("A1 name/brand = %q/%q", a1.Name, a1.Brand)
	}
	if a1.Price != 18990 { // «18 990» с пробелом
		t.Errorf("A1 price = %v (ждали 18990)", a1.Price)
	}
	if a1.OldPrice != 24990 || a1.Currency != "RUB" { // RUR→RUB
		t.Errorf("A1 oldprice/currency = %v/%s", a1.OldPrice, a1.Currency)
	}
	if len(a1.Pictures) != 2 || len(a1.Sizes) != 2 || a1.Color != "Бежевый" {
		t.Errorf("A1 pics/sizes/color = %d/%d/%q", len(a1.Pictures), len(a1.Sizes), a1.Color)
	}
	if a1.Category != "Верхняя одежда" {
		t.Errorf("A1 category = %q", a1.Category)
	}

	a2 := offers[1]
	if a2.Name != "Куртка ACME Bomber" { // сборка из typePrefix+vendor+model
		t.Errorf("A2 name = %q", a2.Name)
	}
	if a2.Price != 5000.50 { // запятая как разделитель
		t.Errorf("A2 price = %v", a2.Price)
	}
	if !a2.InStock { // отсутствие available → в наличии
		t.Error("A2 должен быть InStock по умолчанию")
	}
}

func TestValidateRejections(t *testing.T) {
	cases := []struct {
		o    FeedOffer
		want string
	}{
		{FeedOffer{Name: "ok", Pictures: []string{"u"}, Price: 100}, ""},
		{FeedOffer{Name: "", Pictures: []string{"u"}, Price: 100}, reasonNoName},
		{FeedOffer{Name: "x", Pictures: nil, Price: 100}, reasonNoPhoto},
		{FeedOffer{Name: "x", Pictures: []string{"u"}, Price: 0}, reasonNoPrice},
	}
	for _, c := range cases {
		if got := validate(c.o); got != c.want {
			t.Errorf("validate(%+v) = %q, ждали %q", c.o, got, c.want)
		}
	}
}
