package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"mml-saas-backend/internal/model"
	"mml-saas-backend/pkg/logger"
)

// CometAPI is a paid aggregator that exposes Google's Gemini image-generation
// endpoint at api.cometapi.com using the same /v1beta/models/{model}:generateContent
// path as Google's own API. The wire format is identical — Bearer auth,
// JSON request with inline_data parts, response with candidates → content →
// parts → inline_data. We use it because api.cometapi.com is reachable from
// Russian networks while generativelanguage.googleapis.com is not, and
// CometAPI's passthrough preserves Gemini's image-edit semantics that
// Vertex AI's virtual-try-on endpoint did not (Vertex returned a stylised
// crop instead of a true edit).
//
// This file implements the cometapi-gemini provider — TryonProviderCometAPIGemini,
// labelled "MML V1" in the admin UI and the system default. It mirrors
// callGeminiAPI's behaviour (same prompt, same identity-lock parts, same
// orientation-aware fit applied by the caller) but talks to CometAPI instead
// of going through the AI proxy chain to AI Studio.

// ---------------------------------------------------------------------------
// Wire types — identical shape to Google's generateContent REST API
// ---------------------------------------------------------------------------

type cometGeminiRequest struct {
	Contents         []cometGeminiContentReq    `json:"contents"`
	GenerationConfig *cometGeminiGenConfig      `json:"generationConfig,omitempty"`
	SafetySettings   []cometGeminiSafetySetting `json:"safetySettings,omitempty"`
}

// cometGeminiSafetySetting mirrors Google's safetySettings request entry.
// Each entry sets the block threshold for one harm category.
//
// We send these with BLOCK_NONE for all categories on every image-gen
// request because:
//   - Our input is always a clothing-retail context (customer photo +
//     garment from the brand's catalog).
//   - Gemini's default thresholds aggressively block IMAGE_SAFETY on
//     fashion items that show skin or fitted silhouette (dresses, swim,
//     lingerie). MalinaBonita and similar fashion clients regularly hit
//     this even on a plain midi dress on a fully-clothed customer photo.
//   - Stepping through the safety-models fallback chain alone wasn't
//     enough — when all 3 models block, the customer just sees "примерка
//     не получилась" and walks.
//
// Risk we accept: a creative customer photo combined with a swimwear
// garment could theoretically produce racy output. For a virtual try-on
// commercial tool this is the right trade-off. If we ever need to be more
// conservative for a B2B segment (kidswear etc.) we can wire this to a
// per-project flag.
type cometGeminiSafetySetting struct {
	Category  string `json:"category"`
	Threshold string `json:"threshold"`
}

// defaultCometGeminiSafetySettings returns the BLOCK_NONE entries we
// attach to every CometAPI Gemini generation request.
func defaultCometGeminiSafetySettings() []cometGeminiSafetySetting {
	return []cometGeminiSafetySetting{
		{Category: "HARM_CATEGORY_HARASSMENT", Threshold: "BLOCK_NONE"},
		{Category: "HARM_CATEGORY_HATE_SPEECH", Threshold: "BLOCK_NONE"},
		{Category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", Threshold: "BLOCK_NONE"},
		{Category: "HARM_CATEGORY_DANGEROUS_CONTENT", Threshold: "BLOCK_NONE"},
		// CIVIC_INTEGRITY is newer; some models 400 on it. Keep it out.
	}
}

type cometGeminiContentReq struct {
	Role  string               `json:"role,omitempty"`
	Parts []cometGeminiPartReq `json:"parts"`
}

type cometGeminiPartReq struct {
	Text       string                    `json:"text,omitempty"`
	InlineData *cometGeminiInlineDataReq `json:"inline_data,omitempty"`
}

type cometGeminiInlineDataReq struct {
	MIMEType string `json:"mime_type"`
	Data     string `json:"data"` // base64
}

type cometGeminiGenConfig struct {
	// ResponseModalities tells image-generation models to actually return
	// pixels. Without this, gemini-*-flash-image often returns a JSON
	// description of the desired image instead of rendering it.
	ResponseModalities []string `json:"responseModalities,omitempty"`
}

type cometGeminiResponse struct {
	Candidates     []cometGeminiCandidate     `json:"candidates"`
	PromptFeedback *cometGeminiPromptFeedback `json:"promptFeedback,omitempty"`
}

type cometGeminiCandidate struct {
	Content       cometGeminiContentResp `json:"content"`
	FinishReason  string                 `json:"finishReason,omitempty"`
	SafetyRatings []cometGeminiRating    `json:"safetyRatings,omitempty"`
}

type cometGeminiContentResp struct {
	Role  string                `json:"role,omitempty"`
	Parts []cometGeminiPartResp `json:"parts"`
}

type cometGeminiPartResp struct {
	Text       string                     `json:"text,omitempty"`
	InlineData *cometGeminiInlineDataResp `json:"inlineData,omitempty"`
}

type cometGeminiInlineDataResp struct {
	MIMEType string `json:"mimeType"`
	Data     string `json:"data"` // base64
}

type cometGeminiPromptFeedback struct {
	BlockReason   string              `json:"blockReason,omitempty"`
	SafetyRatings []cometGeminiRating `json:"safetyRatings,omitempty"`
}

type cometGeminiRating struct {
	Category    string `json:"category"`
	Probability string `json:"probability"`
	Blocked     bool   `json:"blocked,omitempty"`
}

// ---------------------------------------------------------------------------
// Provider entry point
// ---------------------------------------------------------------------------

// callCometAPIGemini dispatches a try-on through CometAPI's Gemini image
// passthrough. Wire-compatible with Google's /v1beta/models/{model}:generateContent
// — same JSON shape, same auth header, same response decoding. Differences
// from the direct callGeminiAPI path:
//
//   - Hits api.cometapi.com (reachable from RU) instead of
//     generativelanguage.googleapis.com (RU-blocked).
//   - Authenticates with a CometAPI bearer token, billed against the CometAPI
//     balance instead of Google's free / Vertex tier.
//   - No HTTP proxy is used — CometAPI is reachable directly.
//   - Walks a safety-models fallback chain (CometAPIGeminiSafetyModels) when
//     the primary returns IMAGE_SAFETY / IMAGE_OTHER. Each step is more
//     permissive than the previous one (and usually pricier).
//
// Returns (image bytes, file extension, model used, retry count, error) —
// signature identical to callGeminiAPI so the dispatcher can call any
// provider uniformly. The orientation-aware fit (fitResultToModel) is
// applied by the dispatcher after this returns, not here.
func (s *TryOnService) callCometAPIGemini(
	ctx context.Context,
	modelPhotoURL string,
	garments []tryOnGarment,
	body bodyContext,
	aiLog *model.AiApiLog,
) ([]byte, string, string, int, error) {
	if s.cfg.CometAPIKey == "" {
		return nil, "", "", 0, errors.New("CometAPI key not configured (COMETAPI_KEY)")
	}

	primary := s.cfg.CometAPIGeminiModel
	if primary == "" {
		primary = "gemini-2.5-flash-image"
	}
	// Multi-garment routing: with 3+ garment references the single customer
	// photo loses its dominance on lighter models — they regenerate the person
	// (drifting toward the garment models' poses/faces) instead of editing
	// REFERENCE #1, so identity and pose break. Route heavy layered try-ons to
	// a higher-capacity model. Disabled when COMETAPI_GEMINI_MODEL_MULTI is empty.
	threshold := s.cfg.CometAPIGeminiMultiThreshold
	if threshold <= 0 {
		threshold = 3
	}
	if s.cfg.CometAPIGeminiModelMulti != "" && len(garments) >= threshold {
		logger.Info("tryon_cometapi_gemini", "multi-garment routing",
			"garments", len(garments), "threshold", threshold,
			"base_model", primary, "routed_model", s.cfg.CometAPIGeminiModelMulti)
		primary = s.cfg.CometAPIGeminiModelMulti
	}
	models := dedupeNonEmpty(
		[]string{primary},
		splitCommaList(s.cfg.CometAPIGeminiSafetyModels)...,
	)

	aiLog.Provider = "cometapi-gemini"
	aiLog.Model = primary

	// Load the customer's photo (REFERENCE #1).
	modelBytes, modelMime, err := s.loadImageBytes(ctx, modelPhotoURL)
	if err != nil {
		return nil, "", primary, 0, fmt.Errorf("load model photo: %w", err)
	}

	// Load each garment's photo + product metadata. Identical to callGeminiAPI's
	// loop so prompt enrichment (name / subcategory / material / colour /
	// description) carries through unchanged.
	var loaded []loadedGarment
	for _, g := range garments {
		if g.photoURL == "" {
			continue
		}
		data, mime, lerr := s.loadImageBytes(ctx, g.photoURL)
		if lerr != nil {
			return nil, "", primary, 0, fmt.Errorf("load garment photo: %w", lerr)
		}
		lg := loadedGarment{garmentType: g.category, data: data, mimeType: mime}
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
	aiLog.Prompt = &prompt

	reqParts := buildCometGeminiParts(modelBytes, modelMime, loaded, prompt)
	reqBody := cometGeminiRequest{
		Contents: []cometGeminiContentReq{
			{Role: "user", Parts: reqParts},
		},
		GenerationConfig: &cometGeminiGenConfig{
			ResponseModalities: []string{"IMAGE", "TEXT"},
		},
		// Relax Gemini's default safety thresholds — see comment on
		// cometGeminiSafetySetting for the why. Without this, the
		// fashion-try-on pipeline routinely loses entire requests to
		// IMAGE_SAFETY blocks on perfectly tame retail garments.
		SafetySettings: defaultCometGeminiSafetySettings(),
	}
	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return nil, "", primary, 0, fmt.Errorf("marshal request: %w", err)
	}

	// Walk the model fallback chain. Stop on the first success or on a
	// non-safety error (network / auth / malformed response — those won't
	// improve by switching the model). Safety blocks DO improve with a more
	// permissive model, so for those we step forward.
	var (
		lastErr   error
		modelUsed = primary
		retries   = 0
	)
	for i, modelName := range models {
		modelUsed = modelName
		aiLog.Model = modelName
		retries = i

		imgBytes, mime, finishReason, blockReason, callErr := s.cometGeminiOnce(
			ctx, modelName, bodyJSON,
		)
		if callErr == nil {
			ext := extFromMime(mime)
			if i > 0 {
				logger.Warn("tryon_cometapi_gemini",
					"served via safety-fallback model",
					"primary", primary, "model_used", modelName, "step", i,
				)
			}
			return imgBytes, ext, modelName, retries, nil
		}

		safety := finishReason == "IMAGE_SAFETY" ||
			finishReason == "IMAGE_OTHER" ||
			finishReason == "SAFETY" ||
			blockReason != ""
		retryable := safety || isCometRetryableErr(callErr)
		lastErr = callErr

		if !retryable {
			return nil, "", modelName, retries, callErr
		}
		if i+1 >= len(models) {
			break
		}
		if safety {
			logger.Warn("tryon_cometapi_gemini",
				"safety block, advancing to next model",
				"failed_model", modelName, "next_model", models[i+1],
				"finish_reason", finishReason, "block_reason", blockReason,
			)
		} else {
			// Transient upstream failure (timeout / 5xx / cold-start). Step
			// to the next model rather than failing the user — CometAPI's
			// cold-start on `gemini-2.5-flash-image` can occasionally exceed
			// our 60-90s client timeout, and a different model in the chain
			// is usually warmer.
			logger.Warn("tryon_cometapi_gemini",
				"transient error, advancing to next model",
				"failed_model", modelName, "next_model", models[i+1],
				"error", callErr,
			)
		}
	}
	return nil, "", modelUsed, retries, lastErr
}

// isCometRetryableErr reports whether the error returned by cometGeminiOnce
// is transient enough to justify falling through to the next model in the
// chain. We treat client timeouts (context.DeadlineExceeded), HTTP 429/5xx
// responses, and common network-reset errors as retryable — those typically
// indicate a CometAPI cold-start or a brief upstream hiccup rather than a
// permanent failure that would benefit from giving up.
func isCometRetryableErr(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	s := err.Error()
	// CometAPI itself returned a 429 or 5xx — see cometGeminiOnce, which
	// formats those as `cometapi <model>: HTTP <code>: <body>`.
	if strings.Contains(s, "HTTP 429") ||
		strings.Contains(s, "HTTP 500") ||
		strings.Contains(s, "HTTP 502") ||
		strings.Contains(s, "HTTP 503") ||
		strings.Contains(s, "HTTP 504") {
		return true
	}
	// Common transient transport errors. http.Client.Timeout produces
	// "Client.Timeout exceeded while awaiting headers"; connection-reset /
	// DNS / unexpected-EOF are similarly worth a single fallback attempt.
	if strings.Contains(s, "Client.Timeout") ||
		strings.Contains(s, "deadline exceeded") ||
		strings.Contains(s, "connection reset") ||
		strings.Contains(s, "unexpected EOF") ||
		strings.Contains(s, "no such host") {
		return true
	}
	return false
}

// buildCometGeminiParts assembles the user-content parts in the same order
// callGeminiOnce uses for the direct AI Studio path:
//
//	[REFERENCE #1 text] [customer image]
//	[REFERENCE #N text] [garment image] (repeated per garment)
//	[FINAL IDENTITY CHECK text]
//	[full prompt text]
//
// Order matters because Gemini re-anchors on the most recent text. Keeping
// this layout identical between providers means the prompt-engineering work
// (IDENTITY LOCK / REPLACE-IN-ZONE / final identity trailer) applies to both
// V1 and V2 with no copy-paste drift.
func buildCometGeminiParts(
	modelBytes []byte,
	modelMime string,
	loaded []loadedGarment,
	prompt string,
) []cometGeminiPartReq {
	parts := []cometGeminiPartReq{
		{Text: "REFERENCE #1 — SOURCE FOR THE PERSON. " +
			"This image provides the ONE person who appears in the output: " +
			"their face, hair, skin tone, body shape, pose, and background. " +
			"Memorize these features RIGHT NOW. Every pixel of the person and " +
			"their surroundings in the final image must come from THIS reference. " +
			"No other reference contributes any person to the output."},
		{InlineData: &cometGeminiInlineDataReq{
			MIMEType: modelMime,
			Data:     base64.StdEncoding.EncodeToString(modelBytes),
		}},
	}
	for i, g := range loaded {
		parts = append(parts, cometGeminiPartReq{Text: fmt.Sprintf(
			"REFERENCE #%d — SOURCE FOR A GARMENT ONLY (zone: %s). "+
				"This garment changes ONLY the customer's %s in the output. "+
				"All OTHER zones of the customer (everything except %s) MUST stay "+
				"identical to REFERENCE #1 — same fabric, colour, prints, hems, "+
				"buttons. Do NOT remove, fade, or modify the customer's clothing "+
				"in any zone except the one declared above. "+
				"Read ONLY the garment's shape, colour, pattern, fabric, "+
				"stitching, and construction details. "+
				"The person/mannequin/model who happens to be wearing this "+
				"garment in the photo is a STRANGER — do NOT include them in "+
				"the output, neither as a replacement for REFERENCE #1's person "+
				"nor as a second figure beside her. The garment is the only "+
				"thing this reference contributes; everything else (face, body, "+
				"hair, pose, background) is OUT OF SCOPE.",
			i+2, garmentZoneLabel(g.garmentType),
			garmentZoneLabel(g.garmentType), garmentZoneLabel(g.garmentType),
		)})
		parts = append(parts, cometGeminiPartReq{InlineData: &cometGeminiInlineDataReq{
			MIMEType: g.mimeType,
			Data:     base64.StdEncoding.EncodeToString(g.data),
		}})
	}
	parts = append(parts, cometGeminiPartReq{Text: fmt.Sprintf(
		"FINAL IDENTITY CHECK (read this last, override any earlier "+
			"interpretation): the person in the output is the EXACT same "+
			"person as in REFERENCE #1 — same face, same hair colour and "+
			"length, same skin tone, same body shape, same pose, same "+
			"background. There are %d garment references; therefore EXACTLY "+
			"%d body zones change between REFERENCE #1 and the output. "+
			"Every other pixel of clothing/skin/hair/face/background is "+
			"copied verbatim from REFERENCE #1. If a reference photo's "+
			"model has a different face or different hair, IGNORE that "+
			"face — the only person allowed in the output is REFERENCE #1's "+
			"customer.",
		len(loaded), len(loaded),
	)})
	parts = append(parts, cometGeminiPartReq{Text: prompt})
	return parts
}

// cometGeminiOnce performs a single POST against CometAPI's generateContent
// passthrough. Returns (image bytes, image mime, finishReason, blockReason, err).
// finishReason and blockReason are populated even on the error path so the
// caller can decide whether to advance the safety-models chain (safety
// blocks DO improve with a more permissive model) or fail fast (network /
// auth / malformed errors won't).
func (s *TryOnService) cometGeminiOnce(
	ctx context.Context,
	modelName string,
	bodyJSON []byte,
) ([]byte, string, string, string, error) {
	endpoint := fmt.Sprintf(
		"%s/v1beta/models/%s:generateContent",
		strings.TrimRight(s.cfg.CometAPIBaseURL, "/"),
		modelName,
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, "", "", "", fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Authorization", "Bearer "+s.cfg.CometAPIKey)

	timeout := time.Duration(s.cfg.GeminiTimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 5 * time.Minute
	}
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, "", "", "", fmt.Errorf("http call: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", "", "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		preview := string(respBytes)
		if len(preview) > 500 {
			preview = preview[:500]
		}
		return nil, "", "", "", fmt.Errorf("cometapi %s: HTTP %d: %s", modelName, resp.StatusCode, preview)
	}

	var parsed cometGeminiResponse
	if err := json.Unmarshal(respBytes, &parsed); err != nil {
		return nil, "", "", "", fmt.Errorf("parse response: %w", err)
	}

	var blockReason string
	if parsed.PromptFeedback != nil {
		blockReason = parsed.PromptFeedback.BlockReason
	}
	if blockReason != "" && len(parsed.Candidates) == 0 {
		return nil, "", "", blockReason, fmt.Errorf("cometapi %s: prompt blocked: %s", modelName, blockReason)
	}
	if len(parsed.Candidates) == 0 {
		return nil, "", "", blockReason, fmt.Errorf("cometapi %s: empty candidates", modelName)
	}

	cand := parsed.Candidates[0]
	finishReason := cand.FinishReason

	for _, p := range cand.Content.Parts {
		if p.InlineData == nil {
			continue
		}
		if !strings.HasPrefix(p.InlineData.MIMEType, "image/") {
			continue
		}
		imgBytes, derr := base64.StdEncoding.DecodeString(p.InlineData.Data)
		if derr != nil {
			return nil, "", finishReason, blockReason, fmt.Errorf("decode base64 image: %w", derr)
		}
		return imgBytes, p.InlineData.MIMEType, finishReason, blockReason, nil
	}

	if finishReason == "" {
		finishReason = "NO_IMAGE_IN_RESPONSE"
	}
	return nil, "", finishReason, blockReason, fmt.Errorf("cometapi %s: no image in response (finish=%s, block=%s)",
		modelName, finishReason, blockReason)
}
