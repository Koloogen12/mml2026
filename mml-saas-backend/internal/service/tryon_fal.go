package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"mml-saas-backend/internal/model"
	"mml-saas-backend/pkg/logger"
)

// fal.ai is an alternative gateway to the *same* Google Gemini image-edit
// models we already use via CometAPI — Nano Banana 1 (`gemini-2.5-flash-image`,
// fast / cheap / good for fashion) and Nano Banana 2 (`gemini-3-pro-image-preview`,
// slower / pricier / max detail). We integrate fal because:
//
//  1. fal.ai's gateway is ~45% faster than CometAPI on identical Pro-model
//     requests (measured 2026-05-14: fal 27s vs CometAPI 50s for the same
//     pair of images + prompt). NB1 finishes in ~14s.
//  2. fal accepts `image_urls` as PLAIN URLs (no base64 encoding required),
//     so payloads are ~1KB instead of ~2MB and multi-garment is native.
//  3. Pricing is comparable (NB1 ≈ $0.04/img, NB2 ≈ $0.10/img).
//
// Earlier (2026-05-14) we tried fal.ai's `fashn/tryon` — a purpose-built
// fashion try-on model — to bypass Gemini's IMAGE_SAFETY block on
// intimates. The fidelity on detailed garments (3D applique, embroidery,
// lace) was poor and Danil rejected it. This file no longer calls FASHN
// — it calls the same Gemini family of models that powers CometAPI, just
// through a faster gateway.
//
// Two providers expose this code path (see internal/model/project.go):
//
//   - TryonProviderFalNB1 ("fal-nb1") → MML V3, default fal model is
//     fal-ai/nano-banana/edit (~14s, ~$0.04). Use for production fashion
//     catalogs where speed matters and the catalog isn't lingerie-heavy.
//   - TryonProviderFalNB2 ("fal-nb2") → MML V4, default fal model is
//     fal-ai/nano-banana-pro/edit (~27s, ~$0.10). Use for premium demos
//     or projects where output fidelity wins over latency / cost.
//
// Both providers reuse the same buildTryOnPrompt() the CometAPI path uses,
// so output behavior (identity lock, framing rules, garment-replacement
// instructions, body-measurement awareness) is consistent across gateways.

const (
	falDefaultEndpoint = "https://fal.run"
	falNB1DefaultModel = "fal-ai/nano-banana/edit"
	falNB2DefaultModel = "fal-ai/nano-banana-pro/edit"
)

// falEditRequest mirrors the request schema accepted by both
// fal-ai/nano-banana/edit and fal-ai/nano-banana-pro/edit. Optional
// fields (resolution, safety_tolerance) are NB2-specific but both
// endpoints tolerate unknown JSON keys silently.
type falEditRequest struct {
	ImageURLs       []string `json:"image_urls"`
	Prompt          string   `json:"prompt"`
	NumImages       int      `json:"num_images,omitempty"`
	OutputFormat    string   `json:"output_format,omitempty"`    // jpeg | png
	Resolution      string   `json:"resolution,omitempty"`       // NB2 only: 1K | 2K
	SafetyTolerance string   `json:"safety_tolerance,omitempty"` // NB2 only: "0".."5", higher = looser
	SyncMode        bool     `json:"sync_mode,omitempty"`
}

type falEditImage struct {
	URL         string `json:"url"`
	ContentType string `json:"content_type"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
}

type falEditResponse struct {
	Images      []falEditImage `json:"images"`
	Description string         `json:"description"`
}

// callFalNanoBanana runs a virtual try-on by calling fal.ai's Gemini-image
// edit endpoint (Nano Banana 1 or 2 — selected by the caller passing
// either falNB1DefaultModel or falNB2DefaultModel as `modelPath`).
//
// Signature matches the other call* providers so tryon.go::TryOn can
// route to it transparently.
//
// Returns: (image bytes, file extension, model identifier, retry count, error).
// retryCount is 0 — fal has its own internal retries and our wrapper does
// no model-chaining for nano-banana (unlike the CometAPI chain).
func (s *TryOnService) callFalNanoBanana(
	ctx context.Context,
	modelPhotoURL string,
	garments []tryOnGarment,
	body bodyContext,
	aiLog *model.AiApiLog,
	modelPath string,
) ([]byte, string, string, int, error) {
	if s.cfg.FalAPIKey == "" {
		return nil, "", "", 0, fmt.Errorf("fal: FAL_API_KEY not configured")
	}
	if modelPhotoURL == "" {
		return nil, "", "", 0, fmt.Errorf("fal: customer photo URL is empty")
	}
	if len(garments) == 0 {
		return nil, "", "", 0, fmt.Errorf("fal: no garments provided")
	}
	if modelPath == "" {
		modelPath = falNB1DefaultModel
	}

	// Build image_urls = [customer, garment_1, garment_2, ...]. fal accepts
	// up to ~10 URLs per request (Google's nano-banana caps at that too).
	// Skip garments without a photo URL — they wouldn't be useful in the
	// edit anyway.
	urls := []string{modelPhotoURL}
	for _, g := range garments {
		if g.photoURL == "" {
			continue
		}
		urls = append(urls, g.photoURL)
	}
	if len(urls) < 2 {
		return nil, "", "", 0, fmt.Errorf("fal: need at least one garment photo URL")
	}

	// Reuse the same prompt builder the CometAPI path uses. Both gateways
	// call the same Gemini model under the hood, so identity-lock,
	// framing, and garment-replacement instructions need to be identical
	// or output quality diverges between providers for the same project.
	//
	// buildTryOnPrompt was originally written for the CometAPI path,
	// which loads garment bytes upfront and passes a []loadedGarment. The
	// only fields it actually reads from each garment are the metadata
	// (name, subcategory, material, color, garmentType) — never the raw
	// bytes. We adapt our []tryOnGarment into the same shape with empty
	// data/mime so we don't have to download anything for the prompt.
	loaded := make([]loadedGarment, 0, len(garments))
	for _, g := range garments {
		lg := loadedGarment{garmentType: g.category}
		if g.product != nil {
			lg.name = g.product.Name
			if g.product.Subcategory != nil {
				lg.subcategory = *g.product.Subcategory
			}
			if g.product.Material != nil {
				lg.material = *g.product.Material
			}
			if g.product.Color != nil {
				lg.color = *g.product.Color
			}
			if g.product.Description != nil {
				lg.description = *g.product.Description
			}
		}
		loaded = append(loaded, lg)
	}
	prompt := buildTryOnPrompt(loaded, body)

	aiLog.Model = modelPath
	aiLog.Provider = "fal-" + strings.Replace(modelPath, "/", "-", -1)

	reqBody := falEditRequest{
		ImageURLs:    urls,
		Prompt:       prompt,
		NumImages:    1,
		OutputFormat: "jpeg",
	}
	// NB2 supports a `resolution` field and a `safety_tolerance` knob.
	// Detect by model path so the dispatcher stays simple — no extra
	// config flag required to drive NB2-specific options.
	if strings.Contains(modelPath, "nano-banana-pro") {
		reqBody.Resolution = "1K"
		// safety_tolerance values: "0" (strictest) .. "5" (loosest).
		// "4" lets fitted/intimate fashion render without rejection
		// while still blocking truly unsafe content. Worth experimenting
		// with "5" if even "4" still trips IMAGE_SAFETY on lingerie.
		reqBody.SafetyTolerance = "4"
	}

	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return nil, "", modelPath, 0, fmt.Errorf("fal: marshal request: %w", err)
	}

	timeout := time.Duration(s.cfg.FalTimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 120 * time.Second
	}

	endpoint := fmt.Sprintf("%s/%s",
		strings.TrimRight(falDefaultEndpoint, "/"),
		modelPath)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, "", modelPath, 0, fmt.Errorf("fal: build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	// fal.ai auth: `Key <key_id>:<key_secret>` — the secret is passed via
	// FAL_API_KEY env as a single colon-joined string.
	httpReq.Header.Set("Authorization", "Key "+s.cfg.FalAPIKey)

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, "", modelPath, 0, fmt.Errorf("fal: http call: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", modelPath, 0, fmt.Errorf("fal: read response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		preview := string(respBytes)
		if len(preview) > 500 {
			preview = preview[:500]
		}
		return nil, "", modelPath, 0, fmt.Errorf("fal: HTTP %d: %s", resp.StatusCode, preview)
	}

	var parsed falEditResponse
	if err := json.Unmarshal(respBytes, &parsed); err != nil {
		return nil, "", modelPath, 0, fmt.Errorf("fal: parse response: %w", err)
	}
	if len(parsed.Images) == 0 || parsed.Images[0].URL == "" {
		return nil, "", modelPath, 0, fmt.Errorf("fal: no images in response")
	}

	// Download the generated image into local bytes. Callers always upload
	// to MinIO afterwards; we don't want to serve fal.media URLs directly
	// to customers (fal CDN has a short TTL — ~24h).
	//
	// Why the retry loop: fal serves results from a multi-region CDN
	// (v3b.fal.media etc.) and TLS handshakes occasionally time out from
	// our German server for ~5-10s windows. A single failure here would
	// throw away an otherwise-successful $0.10 NB2 generation. Three
	// attempts with progressive backoff (1s / 2s) cover virtually all
	// transient cases without burning more than ~3s on the happy path.
	resultURL := parsed.Images[0].URL
	resultContentType := parsed.Images[0].ContentType
	imgBytes, downloadErr := downloadWithRetry(ctx, resultURL, 3)
	if downloadErr != nil {
		return nil, "", modelPath, 0, downloadErr
	}

	ext := "jpg"
	switch {
	case strings.Contains(resultContentType, "png"):
		ext = "png"
	case strings.Contains(resultContentType, "webp"):
		ext = "webp"
	}

	logger.Info("tryon_fal", "ok",
		"model", modelPath,
		"images_in", len(urls),
		"output_size_kb", len(imgBytes)/1024,
		"description_len", len(parsed.Description),
	)
	return imgBytes, ext, modelPath, 0, nil
}

// downloadWithRetry pulls a URL into memory with progressive retries on
// transient transport failures. Used to fetch fal.media result images;
// we'd rather pay an extra second or two of retry than throw away a
// successful (and already-paid-for) generation when fal's CDN has a
// transient TLS handshake hiccup.
//
// Each attempt uses a FRESH http.Client so it doesn't reuse a poisoned
// keep-alive connection from the previous attempt. The per-attempt
// timeout is bounded at 30s to stop a hung TLS handshake from eating
// the whole try-on wall-clock budget.
//
// Returns the bytes on success, or the last error wrapped with attempt
// metadata on permanent failure.
func downloadWithRetry(ctx context.Context, url string, attempts int) ([]byte, error) {
	if attempts <= 0 {
		attempts = 1
	}
	var lastErr error
	for i := 0; i < attempts; i++ {
		if i > 0 {
			// 1s, 2s, 4s, … — bounded by ctx so we never block past
			// the outer try-on deadline.
			backoff := time.Duration(1<<uint(i-1)) * time.Second
			select {
			case <-ctx.Done():
				return nil, fmt.Errorf("fal: download cancelled after %d attempts: %w", i, ctx.Err())
			case <-time.After(backoff):
			}
		}
		client := falDownloadClient()
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return nil, fmt.Errorf("fal: build download request: %w", err)
		}
		resp, err := client.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("fal: download attempt %d/%d: %w", i+1, attempts, err)
			logger.Warn("tryon_fal", "download retry",
				"attempt", i+1, "of", attempts, "error", err)
			continue
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			// 4xx is permanent (bad URL, expired CDN token). Don't retry.
			if resp.StatusCode >= 400 && resp.StatusCode < 500 {
				return nil, fmt.Errorf("fal: download HTTP %d (permanent)", resp.StatusCode)
			}
			lastErr = fmt.Errorf("fal: download HTTP %d (attempt %d/%d)", resp.StatusCode, i+1, attempts)
			continue
		}
		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			lastErr = fmt.Errorf("fal: read body attempt %d/%d: %w", i+1, attempts, readErr)
			continue
		}
		if len(body) == 0 {
			lastErr = fmt.Errorf("fal: empty body (attempt %d/%d)", i+1, attempts)
			continue
		}
		return body, nil
	}
	return nil, lastErr
}

// falDownloadClient returns an HTTP client tuned for pulling generated
// images from fal.media. We force IPv4 because fal's CDN nodes
// (v3b.fal.media, etc.) publish only A records, and Go's default
// dual-stack dialer occasionally selects a wedged IPv6 attempt from
// our German server's resolver, hanging for the full client timeout
// (verified 2026-05-21: curl IPv4 = 0.5s, curl default = 30s timeout).
//
// The explicit TLSHandshakeTimeout + per-stage timeouts also keep a
// flaky CDN node from eating the whole try-on budget when only the
// TLS handshake stalls.
func falDownloadClient() *http.Client {
	dialer := &net.Dialer{
		Timeout:   10 * time.Second,
		KeepAlive: 30 * time.Second,
	}
	transport := &http.Transport{
		// Force IPv4 — see comment above.
		DialContext: func(ctx context.Context, _ string, addr string) (net.Conn, error) {
			return dialer.DialContext(ctx, "tcp4", addr)
		},
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          5,
		IdleConnTimeout:       60 * time.Second,
		TLSHandshakeTimeout:   15 * time.Second,
		ResponseHeaderTimeout: 30 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
	return &http.Client{
		Transport: transport,
		Timeout:   60 * time.Second,
	}
}
