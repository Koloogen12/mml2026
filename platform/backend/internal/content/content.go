// Package content — контент главной страницы, редактируемый из админки.
//
// Дефолты лежат здесь, а не константами во фронте: иначе «как из коробки»
// и «что показано» разъезжаются, и правка в админке не совпадает с тем, что
// увидит человек, пока база пуста. Фронт всегда берёт готовое с /content.
package content

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Query — популярный запрос: подпись на чипе и то, что уходит ассистенту.
type Query struct {
	Label string `json:"label"`
	Q     string `json:"q"`
}

// Tab — таб уточнения. Zone — реальная зона одежды из каталога; таб с чужой
// зоной отфильтрует карусель в ноль, поэтому zone проверяем.
type Tab struct {
	Zone  string `json:"zone"`
	Label string `json:"label"`
}

// Trend — плитка тренда. Image необязателен: пусто → плитка красится цветом.
type Trend struct {
	Tag   string `json:"tag"`
	Title string `json:"title"`
	Q     string `json:"q"`
	Image string `json:"image"`
}

// Feature — блок «как это работает».
type Feature struct {
	Label string `json:"label"`
	Title string `json:"title"`
	Body  string `json:"body"`
}

// Home — весь редактируемый контент главной.
type Home struct {
	Queries      map[string][]Query  `json:"queries"`
	Placeholders map[string][]string `json:"placeholders"`
	RefineTabs   []Tab               `json:"refine_tabs"`
	Trending     map[string][]Trend  `json:"trending"`
	Features     []Feature           `json:"features"`
}

// Zones — зоны одежды каталога. Единый источник: этим же списком проверяются
// табы главной и описывается zone в tool'е поиска чата — там перечень когда-то
// написали «по памяти», и он разошёлся с каталогом (не было dress, был shoes).
var Zones = []string{"tops", "bottoms", "outerwear", "accessories", "dress", "footwear"}

func validZone(z string) bool {
	for _, x := range Zones {
		if x == z {
			return true
		}
	}
	return false
}

// Defaults — страница «из коробки».
func Defaults() Home {
	return Home{
		Queries: map[string][]Query{
			"men": {
				{Label: "Образ на свидание", Q: "Собери образ на свидание"},
				{Label: "Худи до 10 000 ₽", Q: "Худи до 10 000 ₽"},
				{Label: "Что надеть в офис", Q: "Что надеть в офис, но без пиджака"},
				{Label: "Total look под кроссовки", Q: "Собери total look под белые кроссовки"},
				{Label: "Куртка на весну", Q: "Куртка на весну в город"},
			},
			"women": {
				{Label: "Образ на каждый день", Q: "Собери образ на каждый день"},
				{Label: "Оверсайз-худи", Q: "Оверсайз-худи"},
				{Label: "Лонгслив и брюки", Q: "Собери образ из лонгслива и брюк"},
				{Label: "Total look под кроссовки", Q: "Собери total look под белые кроссовки"},
				{Label: "Гардероб на выходные", Q: "Собери гардероб на выходные"},
			},
		},
		Placeholders: map[string][]string{
			"men": {
				"Худи под джинсы, до 10 000 ₽",
				"Total look под белые кроссовки",
				"Что надеть в офис, но без пиджака",
				"Куртка на весну в город",
			},
			"women": {
				"Оверсайз-худи на каждый день",
				"Total look под белые кроссовки",
				"Лонгслив и брюки на прогулку",
				"Что надеть в поездку на выходные",
			},
		},
		RefineTabs: []Tab{
			// Таб показывается, только если в витрине есть вещи этой зоны:
			// «Платья» женщина увидит, мужчина — нет.
			{Zone: "dress", Label: "Платья"},
			{Zone: "tops", Label: "Верх"},
			{Zone: "bottoms", Label: "Низ"},
			{Zone: "outerwear", Label: "Верхняя одежда"},
			{Zone: "accessories", Label: "Аксессуары"},
		},
		Trending: map[string][]Trend{
			"men": {
				{Tag: "ПО ОБРАЗУ", Title: "Total look под белые кроссовки", Q: "Собери total look под белые кроссовки"},
				{Tag: "ПО ПОВОДУ", Title: "Что надеть в офис без пиджака", Q: "Что надеть в офис, но без пиджака"},
			},
			"women": {
				{Tag: "ПО ОБРАЗУ", Title: "Total look под белые кроссовки", Q: "Собери total look под белые кроссовки"},
				{Tag: "ПО ПОВОДУ", Title: "Образ на каждый день", Q: "Собери образ на каждый день"},
			},
		},
		Features: []Feature{
			{Label: "Подбор", Title: "Персональный шопинг за пределами возможного.", Body: "Каждый запрос, сохранение и просмотр учат MakeMeLook вашему вкусу. Чем больше вы смотрите — тем точнее выдача."},
			{Label: "Чат", Title: "Опишите словами — получите образ.", Body: "Никаких фильтров-выпадашек. Просто скажите, что нужно и к какому поводу, — ассистент соберёт варианты в вашем бюджете и размере."},
			{Label: "Примерка", Title: "Увидьте вещь на себе до покупки.", Body: "Загрузите одно фото — и примерьте вещь на себе. Данные под защитой 152-ФЗ и удаляются в один тап."},
			{Label: "Уточнение", Title: "«Нравится, но…» — и выдача меняется.", Body: "Без рукавов, длиннее, дешевле, другой бренд. Уточняйте на естественном языке — новый виток выдачи за секунды."},
		},
	}
}

const homeKey = "home"

type Store struct{ pool *pgxpool.Pool }

func NewStore(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// Get — контент главной: дефолты, поверх которых легло сохранённое.
func (s *Store) Get(ctx context.Context) (Home, error) {
	h := Defaults()
	var raw []byte
	err := s.pool.QueryRow(ctx, `SELECT value FROM site_content WHERE key=$1`, homeKey).Scan(&raw)
	if err != nil {
		return h, nil // ничего не сохраняли — страница как из коробки
	}
	// Разбираем поверх дефолтов: добавится новый блок в коде — он появится
	// на странице, не потребовав правки сохранённого JSON.
	if err := json.Unmarshal(raw, &h); err != nil {
		return Defaults(), nil
	}
	return h, nil
}

// Save — валидируем и сохраняем. Пустой контент не пишем: пустая главная
// выглядит как поломка, а не как решение редактора.
func (s *Store) Save(ctx context.Context, h Home) error {
	if err := Validate(&h); err != nil {
		return err
	}
	raw, err := json.Marshal(h)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO site_content (key, value) VALUES ($1,$2)
		ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()`, homeKey, raw)
	return err
}

// Reset возвращает главную к дефолтам.
func (s *Store) Reset(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM site_content WHERE key=$1`, homeKey)
	return err
}

// Validate чистит и проверяет контент.
func Validate(h *Home) error {
	// Клиент может прислать неполный JSON — запись в nil-карту роняет процесс.
	if h.Queries == nil {
		h.Queries = map[string][]Query{}
	}
	if h.Placeholders == nil {
		h.Placeholders = map[string][]string{}
	}
	if h.Trending == nil {
		h.Trending = map[string][]Trend{}
	}
	for _, g := range []string{"men", "women"} {
		qs := h.Queries[g]
		out := qs[:0]
		for _, q := range qs {
			q.Label, q.Q = strings.TrimSpace(q.Label), strings.TrimSpace(q.Q)
			if q.Label == "" {
				continue
			}
			if q.Q == "" {
				q.Q = q.Label // без запроса чип вёл бы в пустоту
			}
			out = append(out, q)
		}
		if len(out) == 0 {
			return errors.New("нужен хотя бы один популярный запрос для каждого пола")
		}
		h.Queries[g] = out

		ph := h.Placeholders[g][:0]
		for _, p := range h.Placeholders[g] {
			if p = strings.TrimSpace(p); p != "" {
				ph = append(ph, p)
			}
		}
		if len(ph) == 0 {
			return errors.New("нужна хотя бы одна подсказка в поле поиска для каждого пола")
		}
		h.Placeholders[g] = ph

		tr := h.Trending[g][:0]
		for _, t := range h.Trending[g] {
			t.Title = strings.TrimSpace(t.Title)
			if t.Title == "" {
				continue
			}
			if strings.TrimSpace(t.Q) == "" {
				t.Q = t.Title
			}
			tr = append(tr, t)
		}
		h.Trending[g] = tr
	}

	tabs := h.RefineTabs[:0]
	for _, t := range h.RefineTabs {
		t.Label = strings.TrimSpace(t.Label)
		if t.Label == "" {
			continue
		}
		if !validZone(t.Zone) {
			return errors.New("неизвестная зона одежды: " + t.Zone)
		}
		tabs = append(tabs, t)
	}
	if len(tabs) == 0 {
		return errors.New("нужен хотя бы один таб уточнения")
	}
	h.RefineTabs = tabs

	fs := h.Features[:0]
	for _, f := range h.Features {
		f.Title = strings.TrimSpace(f.Title)
		if f.Title != "" {
			fs = append(fs, f)
		}
	}
	h.Features = fs
	return nil
}
