package partner

import "testing"

func TestParseProductOG(t *testing.T) {
	html := `<html><head>
	<meta property="og:title" content="Пальто оверсайз бежевое">
	<meta property="og:image" content="https://cdn.shop.ru/coat.jpg">
	<meta property="product:price:amount" content="12990">
	<meta property="product:price:currency" content="RUB">
	<meta property="og:site_name" content="LOOKSHOP">
	<title>Пальто — LOOKSHOP</title></head><body>...</body></html>`

	p := parseProduct("https://shop.ru/coat", html)
	if p.Name != "Пальто оверсайз бежевое" {
		t.Fatalf("name = %q", p.Name)
	}
	if p.ImageURL != "https://cdn.shop.ru/coat.jpg" {
		t.Fatalf("image = %q", p.ImageURL)
	}
	if p.Price != "12990" || p.Currency != "RUB" {
		t.Fatalf("price = %q %q", p.Price, p.Currency)
	}
	if p.Brand != "LOOKSHOP" {
		t.Fatalf("brand = %q", p.Brand)
	}
	if !p.SourceOK {
		t.Fatal("SourceOK должен быть true при name+image")
	}
}

func TestParseProductReversedAttrOrder(t *testing.T) {
	// content раньше property — второй регэксп должен подхватить.
	html := `<meta content="https://cdn/x.jpg" property="og:image">
	<meta content="Юбка миди" property="og:title">`
	p := parseProduct("https://x", html)
	if p.Name != "Юбка миди" || p.ImageURL != "https://cdn/x.jpg" {
		t.Fatalf("reversed order: name=%q image=%q", p.Name, p.ImageURL)
	}
}

func TestParseProductTitleFallback(t *testing.T) {
	html := `<title>Кроссовки белые</title>`
	p := parseProduct("https://x", html)
	if p.Name != "Кроссовки белые" {
		t.Fatalf("title fallback = %q", p.Name)
	}
	if p.Currency != "RUB" {
		t.Fatalf("currency default = %q", p.Currency)
	}
	if p.SourceOK {
		t.Fatal("без картинки SourceOK должен быть false")
	}
}

func TestPreviewProductRejectsNonHTTP(t *testing.T) {
	if _, err := PreviewProduct(t.Context(), "ftp://x/y"); err != ErrBadURL {
		t.Fatalf("ожидали ErrBadURL, got %v", err)
	}
}
