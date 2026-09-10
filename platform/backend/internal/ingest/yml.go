// Package ingest — приём каталогов партнёров. Фаза 1: YML (Яндекс.Маркет) —
// де-факто стандарт товарных фидов в РФ. Парсим фид → валидируем → приводим к
// нашей модели. Категорию партнёра НЕ берём как истину (коерция по фото отдельно).
package ingest

import (
	"encoding/xml"
	"io"
	"strings"
)

// ymlCatalog — минимальная модель YML под то, что нам нужно.
type ymlCatalog struct {
	Shop struct {
		Name       string        `xml:"name"`
		Categories []ymlCategory `xml:"categories>category"`
		Offers     []ymlOffer    `xml:"offers>offer"`
	} `xml:"shop"`
}

type ymlCategory struct {
	ID   string `xml:"id,attr"`
	Name string `xml:",chardata"`
}

type ymlOffer struct {
	ID         string     `xml:"id,attr"`
	Available  string     `xml:"available,attr"` // "true"/"false" (может отсутствовать)
	Name       string     `xml:"name"`
	Vendor     string     `xml:"vendor"`
	TypePrefix string     `xml:"typePrefix"`
	Model      string     `xml:"model"`
	URL        string     `xml:"url"`
	Price      string     `xml:"price"`
	OldPrice   string     `xml:"oldprice"`
	CurrencyID string     `xml:"currencyId"`
	CategoryID string     `xml:"categoryId"`
	Pictures   []string   `xml:"picture"`
	Desc       string     `xml:"description"`
	Params     []ymlParam `xml:"param"`
}

type ymlParam struct {
	Name  string `xml:"name,attr"`
	Value string `xml:",chardata"`
}

// FeedOffer — нормализованный товар из фида (формат-независимый).
type FeedOffer struct {
	ExternalID  string
	Name        string
	Brand       string
	Description string
	URL         string
	Price       float64
	OldPrice    float64
	Currency    string
	Category    string // название категории партнёра (для аудита, не для зоны)
	Pictures    []string
	Sizes       []string
	Color       string
	Material    string
	InStock     bool
}

// ParseYML читает YML-фид в нормализованные офферы + карту категорий.
func ParseYML(r io.Reader) ([]FeedOffer, error) {
	var cat ymlCatalog
	if err := xml.NewDecoder(r).Decode(&cat); err != nil {
		return nil, err
	}
	catName := map[string]string{}
	for _, c := range cat.Shop.Categories {
		catName[c.ID] = strings.TrimSpace(c.Name)
	}

	out := make([]FeedOffer, 0, len(cat.Shop.Offers))
	for _, o := range cat.Shop.Offers {
		fo := FeedOffer{
			ExternalID:  strings.TrimSpace(o.ID),
			Name:        offerName(o),
			Brand:       strings.TrimSpace(o.Vendor),
			Description: strings.TrimSpace(o.Desc),
			URL:         strings.TrimSpace(o.URL),
			Price:       parseFloat(o.Price),
			OldPrice:    parseFloat(o.OldPrice),
			Currency:    normCurrency(o.CurrencyID),
			Category:    catName[o.CategoryID],
			Pictures:    trimAll(o.Pictures),
			InStock:     o.Available != "false", // отсутствие атрибута трактуем как «в наличии»
		}
		for _, p := range o.Params {
			switch strings.ToLower(strings.TrimSpace(p.Name)) {
			case "размер", "размеры", "size":
				if v := strings.TrimSpace(p.Value); v != "" {
					fo.Sizes = append(fo.Sizes, v)
				}
			case "цвет", "color":
				fo.Color = strings.TrimSpace(p.Value)
			case "материал", "состав", "material":
				fo.Material = strings.TrimSpace(p.Value)
			}
		}
		out = append(out, fo)
	}
	return out, nil
}

// offerName собирает имя из <name> или из typePrefix+vendor+model (vendor.model-офферы).
func offerName(o ymlOffer) string {
	if n := strings.TrimSpace(o.Name); n != "" {
		return n
	}
	parts := []string{}
	for _, s := range []string{o.TypePrefix, o.Vendor, o.Model} {
		if s = strings.TrimSpace(s); s != "" {
			parts = append(parts, s)
		}
	}
	return strings.Join(parts, " ")
}

func trimAll(in []string) []string {
	out := make([]string, 0, len(in))
	for _, s := range in {
		if s = strings.TrimSpace(s); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func normCurrency(c string) string {
	c = strings.ToUpper(strings.TrimSpace(c))
	if c == "RUR" || c == "" { // RUR — старый код рубля в YML
		return "RUB"
	}
	return c
}
