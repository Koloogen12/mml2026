package handler

import "net/http"

type ReferenceHandler struct{}

func NewReference() *ReferenceHandler {
	return &ReferenceHandler{}
}

type referenceItem struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type colorItem struct {
	Value string `json:"value"`
	Hex   string `json:"hex"`
}

type referenceResponse struct {
	Genders           []referenceItem `json:"genders"`
	Categories        []referenceItem `json:"categories"`
	ProductCategories []referenceItem `json:"product_categories"`
	Sizes             []string        `json:"sizes"`
	Currencies        []referenceItem `json:"currencies"`
	Seasons           []referenceItem `json:"seasons"`
	Colors            []colorItem     `json:"colors"`
}

var referenceData = referenceResponse{
	Genders: []referenceItem{
		{Value: "female", Label: "Female"},
		{Value: "male", Label: "Male"},
		{Value: "kids", Label: "Kids"},
		{Value: "unisex", Label: "Unisex"},
	},
	Categories: []referenceItem{
		{Value: "clothing", Label: "Clothing"},
		{Value: "shoes", Label: "Shoes"},
		{Value: "accessories", Label: "Accessories"},
		{Value: "multi", Label: "Multi-category"},
	},
	ProductCategories: []referenceItem{
		{Value: "outerwear", Label: "Верхняя одежда"},
		{Value: "tops", Label: "Топы и блузки"},
		{Value: "bottoms", Label: "Юбки и брюки"},
		{Value: "dresses", Label: "Платья"},
		{Value: "shoes", Label: "Обувь"},
		{Value: "accessories", Label: "Аксессуары"},
		{Value: "underwear", Label: "Нижнее бельё"},
		{Value: "sportswear", Label: "Спортивная одежда"},
	},
	Sizes: []string{"XS", "S", "M", "L", "XL", "XXL"},
	Currencies: []referenceItem{
		{Value: "RUB", Label: "₽ RUB"},
		{Value: "USD", Label: "$ USD"},
		{Value: "EUR", Label: "€ EUR"},
		{Value: "GBP", Label: "£ GBP"},
		{Value: "CNY", Label: "¥ CNY"},
	},
	Seasons: []referenceItem{
		{Value: "spring", Label: "Весна"},
		{Value: "summer", Label: "Лето"},
		{Value: "autumn", Label: "Осень"},
		{Value: "winter", Label: "Зима"},
		{Value: "all-season", Label: "Всесезон"},
		{Value: "spring-summer", Label: "Весна-Лето"},
		{Value: "autumn-winter", Label: "Осень-Зима"},
	},
	Colors: []colorItem{
		{Value: "Чёрный", Hex: "#1a1a1a"},
		{Value: "Белый", Hex: "#f0f0f0"},
		{Value: "Серый", Hex: "#9e9e9e"},
		{Value: "Красный", Hex: "#e53935"},
		{Value: "Синий", Hex: "#1e88e5"},
		{Value: "Тёмно-синий", Hex: "#1a237e"},
		{Value: "Зелёный", Hex: "#43a047"},
		{Value: "Бежевый", Hex: "#d7bc96"},
		{Value: "Розовый", Hex: "#e91e63"},
		{Value: "Коричневый", Hex: "#795548"},
		{Value: "Молочный", Hex: "#FFFDD0"},
		{Value: "Бордовый", Hex: "#800020"},
	},
}

// GET /api/v1/reference
func (h *ReferenceHandler) Get(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, referenceData)
}
