package partner

import (
	"context"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// ParsedProduct — карточка, вытянутая из страницы товара по URL.
// Герой онбординга: партнёр вставляет ссылку на один товар, мы показываем,
// как он будет выглядеть в подборе (og-теги → карточка → превью примерки).
type ParsedProduct struct {
	URL      string `json:"url"`
	Name     string `json:"name"`
	ImageURL string `json:"image_url"`
	Price    string `json:"price"`
	Currency string `json:"currency"`
	Brand    string `json:"brand"`
	SourceOK bool   `json:"source_ok"` // удалось ли распарсить хоть что-то осмысленное
}

var (
	ErrBadURL    = errors.New("некорректный URL товара")
	ErrFetch     = errors.New("не удалось загрузить страницу товара")
	metaTagRe    = regexp.MustCompile(`(?is)<meta\s+[^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*?>`)
	metaTagAltRe = regexp.MustCompile(`(?is)<meta\s+[^>]*?content\s*=\s*["']([^"']*)["'][^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?>`)
	titleRe      = regexp.MustCompile(`(?is)<title[^>]*>(.*?)</title>`)
)

// PreviewProduct грузит страницу и достаёт карточку из Open Graph / schema.org.
// Никакого LLM на критическом пути демо: og-теги покрывают ≈все витрины.
func PreviewProduct(ctx context.Context, rawURL string) (*ParsedProduct, error) {
	rawURL = strings.TrimSpace(rawURL)
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		return nil, ErrBadURL
	}

	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, ErrBadURL
	}
	// Многие витрины отдают og-теги только «браузерным» клиентам.
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; MakeMeLookBot/1.0; +https://makemelook.ai)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, ErrFetch
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, ErrFetch
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20)) // 1 МБ головы страницы хватает
	if err != nil {
		return nil, ErrFetch
	}
	return parseProduct(rawURL, string(body)), nil
}

func parseProduct(rawURL, html string) *ParsedProduct {
	meta := extractMeta(html)
	p := &ParsedProduct{URL: rawURL}

	p.Name = firstNonEmpty(meta["og:title"], meta["twitter:title"], stripTitle(html))
	p.ImageURL = firstNonEmpty(meta["og:image"], meta["og:image:secure_url"], meta["twitter:image"])
	p.Price = firstNonEmpty(
		meta["product:price:amount"], meta["og:price:amount"],
		meta["product:price"], meta["twitter:data1"])
	p.Currency = firstNonEmpty(
		meta["product:price:currency"], meta["og:price:currency"], "RUB")
	p.Brand = firstNonEmpty(meta["og:site_name"], meta["product:brand"])

	p.Name = strings.TrimSpace(p.Name)
	p.SourceOK = p.Name != "" && p.ImageURL != ""
	return p
}

// extractMeta собирает все og/twitter/product-мета в map (учитывая оба порядка
// атрибутов property→content и content→property).
func extractMeta(html string) map[string]string {
	out := make(map[string]string)
	for _, m := range metaTagRe.FindAllStringSubmatch(html, -1) {
		key := strings.ToLower(strings.TrimSpace(m[1]))
		if _, seen := out[key]; !seen {
			out[key] = htmlUnescape(m[2])
		}
	}
	for _, m := range metaTagAltRe.FindAllStringSubmatch(html, -1) {
		key := strings.ToLower(strings.TrimSpace(m[2]))
		if _, seen := out[key]; !seen {
			out[key] = htmlUnescape(m[1])
		}
	}
	return out
}

func stripTitle(html string) string {
	m := titleRe.FindStringSubmatch(html)
	if len(m) < 2 {
		return ""
	}
	return htmlUnescape(strings.TrimSpace(m[1]))
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func htmlUnescape(s string) string {
	r := strings.NewReplacer(
		"&amp;", "&", "&lt;", "<", "&gt;", ">",
		"&quot;", `"`, "&#39;", "'", "&apos;", "'", "&nbsp;", " ",
	)
	return strings.TrimSpace(r.Replace(s))
}
