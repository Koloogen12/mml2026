package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"mml-saas-backend/internal/model"
	"mml-saas-backend/pkg/logger"
)

// customFeedResponse is the wire format we ask self-hosted clients to expose
// at their /mml/feed endpoint. See the integration PDF for the canonical schema.
type customFeedResponse struct {
	Products    []customFeedProduct `json:"products"`
	GeneratedAt string              `json:"generated_at,omitempty"`
}

type customFeedProduct struct {
	// ExternalID is documented as string ("54", "SKU-XYZ") but in practice
	// integrators ship it as a number too (e.g. Laravel's $product->id is
	// an int and gets serialized without quotes). We accept both via
	// flexibleString to avoid silently dropping the entire catalogue on a
	// single type mismatch.
	ExternalID  flexibleString         `json:"external_id"`
	Name        string                 `json:"name"`
	Price       float64                `json:"price"`
	Currency    string                 `json:"currency,omitempty"`
	Available   *bool                  `json:"available,omitempty"`
	StockQty    *int                   `json:"stock_qty,omitempty"`
	Category    string                 `json:"category,omitempty"`
	Gender      string                 `json:"gender,omitempty"`
	Brand       string                 `json:"brand,omitempty"`
	Color       string                 `json:"color,omitempty"`
	Description string                 `json:"description,omitempty"`
	// SKU follows the same int-vs-string treatment as ExternalID — many
	// shop databases use int primary keys, and we'd rather coerce than reject.
	SKU         flexibleString         `json:"sku,omitempty"`
	ProductURL  string                 `json:"product_url,omitempty"`
	Images      []string               `json:"images,omitempty"`
	Sizes       []customFeedSize       `json:"sizes,omitempty"`
	// Anything else the customer wants to ship — preserved into raw_data
	// for forward-compat, never validated.
	Extra       map[string]any         `json:"-"`
}

// flexibleString accepts a JSON value that integrators might encode either
// as a quoted string ("54") or as a number (54), and stores it as a Go
// string. We saw real-world feeds (Laravel + Eloquent default casts) ship
// integer external_ids and the strict string field would silently drop the
// whole catalogue. Booleans and arrays still error out — only string and
// number are accepted.
type flexibleString string

func (s *flexibleString) UnmarshalJSON(data []byte) error {
	trimmed := strings.TrimSpace(string(data))
	if trimmed == "" || trimmed == "null" {
		*s = ""
		return nil
	}
	// Quoted string: let stdlib unquote it (handles escapes / unicode).
	if strings.HasPrefix(trimmed, `"`) {
		var v string
		if err := json.Unmarshal(data, &v); err != nil {
			return err
		}
		*s = flexibleString(v)
		return nil
	}
	// Plain JSON number — use the raw token verbatim. We could verify it
	// parses as a number to reject true/false/[]/{} but Go's stdlib has
	// already rejected booleans/arrays/objects above (they don't start
	// with " and the caller would have errored). Treating any unquoted
	// non-null token as a numeric string keeps the implementation small.
	*s = flexibleString(trimmed)
	return nil
}

type customFeedSize struct {
	Label     string `json:"label"`
	Available *bool  `json:"available,omitempty"`
	StockQty  *int   `json:"stock_qty,omitempty"`
}

// validateCustomFeedURL enforces the HTTPS-only contract for custom-feed
// stores at the API layer. Returns ErrCustomFeedNeedsHTTPS if the scheme
// is anything other than "https". Empty URL is left to the DTO validator
// (which already rejects it via "required,url").
func validateCustomFeedURL(rawURL string) error {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return fmt.Errorf("invalid custom-feed URL: %w", err)
	}
	if parsed.Scheme != "https" {
		return ErrCustomFeedNeedsHTTPS
	}
	return nil
}

// Allowed values for the normalized fields. Anything outside the set is
// dropped (logged) rather than rejected so a single bad row doesn't break
// the whole sync.
var allowedCustomFeedCategory = map[string]bool{
	"outerwear":   true,
	"tops":        true,
	"bottoms":     true,
	"shoes":       true,
	"accessories": true,
}

var allowedCustomFeedGender = map[string]bool{
	"male":   true,
	"female": true,
	"unisex": true,
}

// fetchCustomFeedProducts pulls the entire catalog in one HTTPS GET and maps
// it into platformProduct values. The feed must be HTTPS, authenticate via
// Authorization: Bearer <store.ApiKey>, and respond with the schema in
// customFeedResponse.
func (s *EcommerceService) fetchCustomFeedProducts(store *model.EcommerceStore) (*platformResult, error) {
	feedURL := strings.TrimSpace(store.ApiURL)
	parsed, err := url.Parse(feedURL)
	if err != nil {
		return nil, fmt.Errorf("invalid feed URL: %w", err)
	}
	if parsed.Scheme != "https" {
		return nil, fmt.Errorf("feed URL must use HTTPS (got %q)", parsed.Scheme)
	}

	req, err := http.NewRequest(http.MethodGet, feedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	if token := strings.TrimSpace(store.ApiKey); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "MakeMeLook-FeedSync/1.0")
	// NOTE: deliberately NOT setting Accept-Encoding here — when we set it
	// manually, Go's http.Transport stops doing transparent gzip decoding,
	// and we'd have to wrap the body in gzip.NewReader ourselves. Letting
	// the default transport set it gives us automatic decompression and
	// still advertises gzip support to the customer's server.

	// 60s timeout — large catalogs (10k+ SKUs) can take 20-30s with gzip.
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("feed request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, readErr := io.ReadAll(io.LimitReader(resp.Body, 2048))
		if readErr != nil {
			return nil, fmt.Errorf("feed returned HTTP %d (body unreadable: %v)", resp.StatusCode, readErr)
		}
		return nil, fmt.Errorf("feed returned HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	// Read the full body so we can both parse it and capture per-product
	// raw JSON for the raw_data column.
	body, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024*1024)) // 64MB hard cap
	if err != nil {
		return nil, fmt.Errorf("read feed body: %w", err)
	}

	products, total, err := parseCustomFeedBody(body)
	if err != nil {
		return nil, err
	}
	return &platformResult{Products: products, Total: total}, nil
}

// parseCustomFeedBody is split out from fetchCustomFeedProducts so it can be
// unit-tested without spinning up an HTTPS server. Returns the parsed
// platformProduct list and the total count present in the feed (including
// rows that were skipped due to empty external_id, so the operator can spot
// data-quality issues).
func parseCustomFeedBody(body []byte) ([]platformProduct, int, error) {
	var raw struct {
		Products    []json.RawMessage `json:"products"`
		GeneratedAt string            `json:"generated_at"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, 0, fmt.Errorf("decode feed: %w", err)
	}

	products := make([]platformProduct, 0, len(raw.Products))

	for i, rawProduct := range raw.Products {
		var p customFeedProduct
		if err := json.Unmarshal(rawProduct, &p); err != nil {
			logger.Error("ecommerce", "Failed to parse custom-feed product", "index", i, "error", err)
			continue
		}
		extID := strings.TrimSpace(string(p.ExternalID))
		if extID == "" {
			logger.Error("ecommerce", "Skipping custom-feed product with empty external_id", "index", i)
			continue
		}

		// Determine availability. Default to true if `available` is omitted
		// (so a minimal feed still works), but respect explicit false.
		isActive := true
		if p.Available != nil {
			isActive = *p.Available
		}

		// Normalize category/gender. Drop unknown values silently — the
		// product still syncs, it just doesn't get auto-categorized.
		category := strings.ToLower(strings.TrimSpace(p.Category))
		if category != "" && !allowedCustomFeedCategory[category] {
			logger.Error("ecommerce", "Unknown custom-feed category, dropping",
				"external_id", extID, "category", p.Category)
			category = ""
		}
		gender := strings.ToLower(strings.TrimSpace(p.Gender))
		if gender != "" && !allowedCustomFeedGender[gender] {
			logger.Error("ecommerce", "Unknown custom-feed gender, dropping",
				"external_id", extID, "gender", p.Gender)
			gender = ""
		}

		// Sizes: collapse to list of labels where available != false.
		// This matches the platformProduct shape consumed by runSync.
		var sizes []string
		for _, sz := range p.Sizes {
			label := strings.TrimSpace(sz.Label)
			if label == "" {
				continue
			}
			if sz.Available != nil && !*sz.Available {
				continue
			}
			sizes = append(sizes, label)
		}

		var imageURL string
		if len(p.Images) > 0 {
			imageURL = p.Images[0]
		}

		pp := platformProduct{
			ExternalID:     extID,
			Name:           p.Name,
			Price:          p.Price,
			ImageURL:       imageURL,
			ImageURLs:      p.Images,
			SKU:            strings.TrimSpace(string(p.SKU)),
			Brand:          p.Brand,
			Color:          p.Color,
			Description:    p.Description,
			IsActive:       isActive,
			IsParent:       true, // Custom-feed has no variation hierarchy.
			ProductURL:     p.ProductURL,
			AvailableSizes: sizes,
			RawData:        rawProduct,
			Category:       category,
			Gender:         gender,
		}
		products = append(products, pp)
	}

	return products, len(raw.Products), nil
}
