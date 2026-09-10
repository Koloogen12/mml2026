package service

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"mml-saas-backend/internal/model"
)

// Tests for the custom-feed adapter. We split into two layers:
//   1. parseCustomFeedBody — pure JSON-bytes-in, products-out. Lets us
//      cover normalization, validation, and edge cases without TLS.
//   2. fetchCustomFeedProducts — full adapter. Only spot-checked for HTTPS
//      enforcement; the rest of its behavior is covered transitively by (1).

const sampleFeed = `{
  "products": [
    {
      "external_id": "SKU-1",
      "name": "Платье шёлковое",
      "price": 14990,
      "currency": "RUB",
      "available": true,
      "stock_qty": 3,
      "category": "outerwear",
      "gender": "female",
      "brand": "Bruler",
      "color": "красный",
      "sku": "BR-001",
      "product_url": "https://example.com/p/1",
      "images": ["https://example.com/1.jpg", "https://example.com/2.jpg"],
      "sizes": [
        {"label": "S", "available": true, "stock_qty": 1},
        {"label": "M", "available": false},
        {"label": "L", "available": true}
      ]
    },
    {
      "external_id": "SKU-2",
      "name": "Брюки",
      "price": 7990,
      "available": false,
      "category": "bottoms",
      "gender": "MALE",
      "images": ["https://example.com/3.jpg"]
    },
    {
      "external_id": "SKU-3",
      "name": "Кепка",
      "price": 1990,
      "category": "garbage_value",
      "gender": "undefined"
    },
    {
      "external_id": "",
      "name": "Empty external_id should be skipped",
      "price": 100
    }
  ],
  "generated_at": "2026-04-29T12:00:00Z"
}`

func TestParseCustomFeedBody(t *testing.T) {
	products, total, err := parseCustomFeedBody([]byte(sampleFeed))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if total != 4 {
		t.Errorf("total = %d, want 4", total)
	}
	// Empty external_id is skipped, so we expect 3 products.
	if len(products) != 3 {
		t.Fatalf("len(products) = %d, want 3 (one row with empty external_id should be skipped)", len(products))
	}

	p1 := products[0]
	if p1.ExternalID != "SKU-1" || p1.Name != "Платье шёлковое" {
		t.Errorf("p1 wrong: %+v", p1)
	}
	if p1.Category != "outerwear" || p1.Gender != "female" {
		t.Errorf("p1 category/gender: %q / %q", p1.Category, p1.Gender)
	}
	if !p1.IsActive {
		t.Errorf("p1 should be active")
	}
	// available:true sizes only — M (false) is filtered out
	if len(p1.AvailableSizes) != 2 || p1.AvailableSizes[0] != "S" || p1.AvailableSizes[1] != "L" {
		t.Errorf("p1 sizes: %v", p1.AvailableSizes)
	}
	if len(p1.ImageURLs) != 2 {
		t.Errorf("p1 images: %v", p1.ImageURLs)
	}

	p2 := products[1]
	if p2.IsActive {
		t.Errorf("p2 (available:false) should be inactive")
	}
	if p2.Gender != "male" {
		t.Errorf("p2 gender should be normalized to lowercase: got %q", p2.Gender)
	}

	p3 := products[2]
	if p3.Category != "" {
		t.Errorf("p3 unknown category should be dropped, got %q", p3.Category)
	}
	if p3.Gender != "" {
		t.Errorf("p3 unknown gender should be dropped, got %q", p3.Gender)
	}
}

func TestFetchCustomFeedProducts_RejectsHTTP(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(sampleFeed))
	}))
	defer server.Close()

	svc := &EcommerceService{}
	store := &model.EcommerceStore{
		Platform: model.EcommercePlatformCustomFeed,
		ApiURL:   server.URL, // http://...
		ApiKey:   "x",
	}
	_, err := svc.fetchCustomFeedProducts(store)
	if err == nil {
		t.Fatal("expected HTTPS-only rejection, got nil")
	}
	if !strings.Contains(err.Error(), "HTTPS") {
		t.Errorf("error should mention HTTPS, got: %v", err)
	}
}
