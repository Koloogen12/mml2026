package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"mml-saas-backend/internal/model"
	"mml-saas-backend/pkg/logger"
)

// GPT Image 2.5 (OpenAI) through CometAPI — the cometapi-gptimage provider,
// labelled "MML V5" and the system default since 2026-09.
//
// Why this exists alongside the Gemini passthrough in the same aggregator:
// CometAPI resells two families that need completely different wire formats.
// Gemini speaks /v1beta/models/{model}:generateContent with base64 inline_data
// parts; GPT Image speaks OpenAI's multipart /v1/images/edits with a repeated
// image[] file field. Same key, same base URL, different protocol — hence a
// separate file rather than a branch inside the Gemini client.
//
// Why it became the default (measured on identical inputs and the identical
// buildTryOnPrompt output, 2026-09-09):
//   - Latency: a 4-garment layered look took 18s here vs 273s on
//     gemini-3-pro-image-preview. That is the difference between a customer
//     waiting and a customer leaving.
//   - Cost: ~$0.043/image (9.5k input + 196 output tokens at CometAPI's
//     $4/$24 per 1M) vs ~$0.054 for a single-garment Gemini flash render.
//   - Fidelity: identity, pose, background and garment silhouette held as
//     well as Gemini on both a single dress and a 4-layer outfit.
//
// Known behavioural difference worth remembering: GPT Image is more willing
// to extend the frame and fill in body parts the customer photo cropped out
// (it rendered plausible footwear below a mid-calf crop). Gemini obeys the
// framing lock more literally. The dispatcher's fitResultToModel re-fits the
// output to the customer photo afterwards, which contains most of this.
//
// ---------------------------------------------------------------------------
// Wire types — OpenAI images/edits
// ---------------------------------------------------------------------------

type gptImageResponse struct {
	Created int64                  `json:"created"`
	Data    []gptImageResponseItem `json:"data"`
	Usage   *gptImageUsage         `json:"usage,omitempty"`
	Error   *gptImageError         `json:"error,omitempty"`
}

type gptImageResponseItem struct {
	B64JSON string `json:"b64_json,omitempty"`
	URL     string `json:"url,omitempty"`
}

type gptImageUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

type gptImageError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code"`
}

// ---------------------------------------------------------------------------
// Provider entry point
// ---------------------------------------------------------------------------

// callCometAPIGPTImage dispatches a try-on through CometAPI's GPT Image 2.5
// image-edit endpoint. Signature is identical to callCometAPIGemini and
// callGeminiAPI so the dispatcher can treat every provider uniformly:
// (image bytes, file extension, model used, retry count, error).
//
// The customer photo is always image[] index 0 — the prompt refers to it as
// REFERENCE #1 — followed by one entry per garment in the caller's order.
func (s *TryOnService) callCometAPIGPTImage(
	ctx context.Context,
	modelPhotoURL string,
	garments []tryOnGarment,
	body bodyContext,
	aiLog *model.AiApiLog,
) ([]byte, string, string, int, error) {
	if s.cfg.CometAPIKey == "" {
		return nil, "", "", 0, errors.New("CometAPI key not configured (COMETAPI_KEY)")
	}

	primary := s.cfg.CometAPIGPTImageModel
	if primary == "" {
		primary = "gpt-image-2.5-sunburst"
	}
	models := dedupeNonEmpty(
		[]string{primary},
		splitCommaList(s.cfg.CometAPIGPTImageFallbackModels)...,
	)

	aiLog.Provider = "cometapi-gptimage"
	aiLog.Model = primary

	// Load the customer's photo (REFERENCE #1).
	modelBytes, modelMime, err := s.loadImageBytes(ctx, modelPhotoURL)
	if err != nil {
		return nil, "", primary, 0, fmt.Errorf("load model photo: %w", err)
	}

	// Load each garment photo + product metadata. Same loop as the Gemini
	// provider so prompt enrichment (name / subcategory / material / colour /
	// description) is byte-for-byte identical across providers — otherwise a
	// provider comparison measures prompt differences instead of model quality.
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

	// Walk the model chain. Moderation blocks are the reason this chain exists:
	// OpenAI's classifier is probabilistic on borderline fashion (lace, sheer,
	// deep necklines) and returns moderation_blocked on a coin flip for some
	// garments, so the same request can succeed on retry or on a sibling model.
	var (
		lastErr   error
		modelUsed = primary
		retries   = 0
	)
	for i, modelName := range models {
		modelUsed = modelName
		aiLog.Model = modelName
		retries = i

		imgBytes, mime, blocked, callErr := s.gptImageOnce(
			ctx, modelName, modelBytes, modelMime, loaded, prompt,
		)
		if callErr == nil {
			if i > 0 {
				logger.Warn("tryon_cometapi_gptimage",
					"served via fallback model",
					"primary", primary, "model_used", modelName, "step", i,
				)
			}
			return imgBytes, extFromMime(mime), modelName, retries, nil
		}

		retryable := blocked || isCometRetryableErr(callErr)
		lastErr = callErr
		if !retryable {
			return nil, "", modelName, retries, callErr
		}
		if i+1 >= len(models) {
			break
		}
		if blocked {
			logger.Warn("tryon_cometapi_gptimage",
				"moderation block, advancing to next model",
				"failed_model", modelName, "next_model", models[i+1],
				"error", callErr,
			)
		} else {
			logger.Warn("tryon_cometapi_gptimage",
				"transient error, advancing to next model",
				"failed_model", modelName, "next_model", models[i+1],
				"error", callErr,
			)
		}
	}
	return nil, "", modelUsed, retries, lastErr
}

// gptImageOnce performs a single POST /v1/images/edits.
//
// Returns (image bytes, mime, moderationBlocked, error). moderationBlocked is
// reported separately from the error so the caller can distinguish "this model
// refused, try another" from "the request is broken, give up" — a 400 with
// code=moderation_blocked is worth retrying, a 400 with a malformed body is not.
func (s *TryOnService) gptImageOnce(
	ctx context.Context,
	modelName string,
	modelBytes []byte,
	modelMime string,
	garments []loadedGarment,
	prompt string,
) ([]byte, string, bool, error) {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)

	if err := mw.WriteField("model", modelName); err != nil {
		return nil, "", false, fmt.Errorf("multipart model: %w", err)
	}
	if err := mw.WriteField("prompt", prompt); err != nil {
		return nil, "", false, fmt.Errorf("multipart prompt: %w", err)
	}
	if size := s.cfg.CometAPIGPTImageSize; size != "" {
		if err := mw.WriteField("size", size); err != nil {
			return nil, "", false, fmt.Errorf("multipart size: %w", err)
		}
	}

	// image[] order is load-bearing: index 0 is the customer (REFERENCE #1),
	// the rest are garments in the same order the prompt enumerates them as
	// Image 2, Image 3, … Reordering here silently breaks the prompt's
	// label→garment mapping.
	if err := writeGPTImagePart(mw, "image[]", "customer", modelBytes, modelMime); err != nil {
		return nil, "", false, err
	}
	for i, g := range garments {
		name := fmt.Sprintf("garment%d", i+1)
		if err := writeGPTImagePart(mw, "image[]", name, g.data, g.mimeType); err != nil {
			return nil, "", false, err
		}
	}
	if err := mw.Close(); err != nil {
		return nil, "", false, fmt.Errorf("multipart close: %w", err)
	}

	endpoint := fmt.Sprintf("%s/v1/images/edits", strings.TrimRight(s.cfg.CometAPIBaseURL, "/"))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &buf)
	if err != nil {
		return nil, "", false, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+s.cfg.CometAPIKey)

	timeout := time.Duration(s.cfg.GeminiTimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 120 * time.Second
	}
	client := &http.Client{Timeout: timeout}

	resp, err := client.Do(req)
	if err != nil {
		return nil, "", false, fmt.Errorf("cometapi %s: %w", modelName, err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", false, fmt.Errorf("cometapi %s: read response: %w", modelName, err)
	}

	var parsed gptImageResponse
	// Decode before checking the status code: OpenAI returns the machine-readable
	// error code (moderation_blocked) in the body of a 400, and that code is
	// exactly what decides whether we retry.
	if jerr := json.Unmarshal(respBytes, &parsed); jerr != nil {
		preview := truncateRunes(string(respBytes), 300)
		return nil, "", false, fmt.Errorf("cometapi %s: HTTP %d: unparseable response: %s",
			modelName, resp.StatusCode, preview)
	}

	if parsed.Error != nil {
		blocked := parsed.Error.Code == "moderation_blocked"
		return nil, "", blocked, fmt.Errorf("cometapi %s: HTTP %d: %s (%s)",
			modelName, resp.StatusCode, parsed.Error.Message, parsed.Error.Code)
	}
	if resp.StatusCode != http.StatusOK {
		preview := truncateRunes(string(respBytes), 300)
		return nil, "", false, fmt.Errorf("cometapi %s: HTTP %d: %s",
			modelName, resp.StatusCode, preview)
	}
	if len(parsed.Data) == 0 || parsed.Data[0].B64JSON == "" {
		return nil, "", false, fmt.Errorf("cometapi %s: response contained no image", modelName)
	}

	imgBytes, derr := base64.StdEncoding.DecodeString(parsed.Data[0].B64JSON)
	if derr != nil {
		return nil, "", false, fmt.Errorf("cometapi %s: decode image: %w", modelName, derr)
	}

	if parsed.Usage != nil {
		logger.Info("tryon_cometapi_gptimage", "generation ok",
			"model", modelName,
			"input_tokens", parsed.Usage.InputTokens,
			"output_tokens", parsed.Usage.OutputTokens,
			"bytes", len(imgBytes),
		)
	}

	// The endpoint returns PNG by default and does not label it in the body,
	// so we report PNG rather than guessing from the payload.
	return imgBytes, "image/png", false, nil
}

// writeGPTImagePart appends one file part to the multipart body. OpenAI accepts
// png / jpeg / webp; the filename extension is what it uses to sniff the type,
// so an honest extension matters more than the declared content type.
func writeGPTImagePart(mw *multipart.Writer, field, name string, data []byte, mime string) error {
	ext := "png"
	switch {
	case strings.Contains(mime, "jpeg"), strings.Contains(mime, "jpg"):
		ext = "jpg"
	case strings.Contains(mime, "webp"):
		ext = "webp"
	case strings.Contains(mime, "png"):
		ext = "png"
	default:
		// Unknown/odd source type (some feeds serve octet-stream). Send it as
		// PNG and let the API reject it — the dispatcher falls back to Gemini,
		// which accepts a wider range, rather than failing the customer here.
		logger.Warn("tryon_cometapi_gptimage", "unexpected image mime, sending as png",
			"mime", mime, "part", name)
	}

	w, err := mw.CreateFormFile(field, fmt.Sprintf("%s.%s", name, ext))
	if err != nil {
		return fmt.Errorf("multipart %s: %w", name, err)
	}
	if _, err := w.Write(data); err != nil {
		return fmt.Errorf("multipart %s write: %w", name, err)
	}
	return nil
}
