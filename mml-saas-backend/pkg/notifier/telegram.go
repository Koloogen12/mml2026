// Package notifier sends operational events (validation rejections, try-on
// completions, failures) to a Telegram chat. Sends are best-effort and run
// in their own goroutine — they NEVER block or fail the calling request.
package notifier

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"strings"
	"time"

	"mml-saas-backend/pkg/logger"
)

// defaultTelegramAPIBase is the canonical Telegram Bot API root. Override via
// NewTelegram's apiBaseURL when fronting the API behind a proxy — typically
// a Cloudflare Worker that mirrors api.telegram.org so RU networks (where
// api.telegram.org is geo-blocked) can reach the bot without a SOCKS/HTTP
// tunnel.
const defaultTelegramAPIBase = "https://api.telegram.org"

// Telegram is a thin client that posts plain-text or HTML messages to one
// of several pre-configured chats. Construct with NewTelegram; if the token
// or default chat ID is empty, the resulting *Telegram is nil-safe — every
// Send is a no-op.
//
// Routing: every public Send/SendPhoto method takes a project name. If that
// name has an override mapping (case-insensitive), the message lands in
// that override chat; otherwise it goes to the default chat. This keeps a
// shared customer group ("Репорты с виджета") clean of unrelated projects'
// events — those still reach the admin's DM but never leak into the group.
type Telegram struct {
	token       string
	defaultChat string
	apiBase     string            // e.g. https://api.telegram.org or a CF-Worker mirror
	overrides   map[string]string // lowercased project name → chat_id
	client      *http.Client
}

// NewTelegram builds a notifier. Returns nil if token or defaultChat is
// empty (callers should still call methods unconditionally — every method
// is nil-safe and no-ops).
//
// overridesSpec is a comma-separated list of `name:chatID` pairs (e.g.
// "MalinaBonita:-5294106081,Bruler:-1009999"). Names are matched
// case-insensitively against the project's display name; pairs that fail
// to parse are logged at WARN and skipped.
//
// apiBaseURL overrides the Telegram API root. Use this to route through a
// Cloudflare Worker mirror (free, no subscription) — pass the worker URL
// (without trailing /bot or /token) and we'll build the bot endpoint from
// it. Empty defaults to the canonical https://api.telegram.org. The mirror
// must forward {METHOD} {PATH+QUERY} {HEADERS} {BODY} unchanged to
// api.telegram.org.
//
// proxyURL is optional: if non-empty, all outbound HTTPS calls go through
// that HTTP/SOCKS5 proxy. Use this for upstream HTTP-proxy options (Vozis,
// self-hosted sslocal, etc.). Mutually compatible with apiBaseURL — if both
// are set, the proxy carries the request to the override URL. Empty string
// means direct connection from the host.
func NewTelegram(token, defaultChat, overridesSpec, apiBaseURL, proxyURL string) *Telegram {
	if strings.TrimSpace(token) == "" || strings.TrimSpace(defaultChat) == "" {
		return nil
	}
	transport := &http.Transport{}
	if p := strings.TrimSpace(proxyURL); p != "" {
		if u, err := url.Parse(p); err == nil {
			transport.Proxy = http.ProxyURL(u)
		} else {
			logger.Warn("notifier", "invalid proxy URL, using direct", "error", err)
		}
	}
	apiBase := strings.TrimRight(strings.TrimSpace(apiBaseURL), "/")
	if apiBase == "" {
		apiBase = defaultTelegramAPIBase
	}
	overrides := parseOverrides(overridesSpec)
	if len(overrides) > 0 {
		// Log the routing table once at startup so on-call can verify
		// MalinaBonita actually goes to the group and nothing else does.
		logger.Info("notifier", "routing overrides loaded",
			"count", len(overrides), "default_chat", defaultChat,
			"api_base", apiBase)
	}
	return &Telegram{
		token:       token,
		defaultChat: defaultChat,
		apiBase:     apiBase,
		overrides:   overrides,
		client: &http.Client{
			Timeout:   30 * time.Second,
			Transport: transport,
		},
	}
}

// botEndpoint returns the full Telegram Bot API URL for `method`, e.g.
//   https://api.telegram.org/bot<TOKEN>/sendMessage
// or, when fronted by a CF Worker mirror,
//   https://tg.<account>.workers.dev/bot<TOKEN>/sendMessage
func (t *Telegram) botEndpoint(method string) string {
	return t.apiBase + "/bot" + t.token + "/" + method
}

// parseOverrides splits "Name1:chatA,Name2:chatB" into a normalised map.
// Whitespace around names and IDs is trimmed; names are lowercased so the
// caller can match case-insensitively. Malformed entries are logged at
// WARN and dropped — we don't want a single typo to take down the whole
// override config.
func parseOverrides(spec string) map[string]string {
	out := map[string]string{}
	for _, raw := range strings.Split(spec, ",") {
		entry := strings.TrimSpace(raw)
		if entry == "" {
			continue
		}
		// Use last-colon split because chat IDs are negative ("-100..."),
		// not because names can contain colons (they shouldn't), but to
		// stay forgiving if someone writes "Project: Name:-12345".
		idx := strings.LastIndex(entry, ":")
		if idx <= 0 || idx == len(entry)-1 {
			logger.Warn("notifier", "telegram override: malformed entry", "entry", entry)
			continue
		}
		name := strings.TrimSpace(strings.ToLower(entry[:idx]))
		chatID := strings.TrimSpace(entry[idx+1:])
		if name == "" || chatID == "" {
			logger.Warn("notifier", "telegram override: empty side", "entry", entry)
			continue
		}
		out[name] = chatID
	}
	return out
}

// chatFor resolves the chat_id to use for a given project name. Falls back
// to defaultChat when no override matches (or when projectName is empty).
func (t *Telegram) chatFor(projectName string) string {
	if t == nil {
		return ""
	}
	if projectName == "" || len(t.overrides) == 0 {
		return t.defaultChat
	}
	if id, ok := t.overrides[strings.ToLower(strings.TrimSpace(projectName))]; ok {
		return id
	}
	return t.defaultChat
}

// Send fires a message to the DEFAULT chat in a goroutine. Prefer
// SendForProject when you know which project the event belongs to —
// Send exists only for events that aren't tied to a project.
func (t *Telegram) Send(text string) {
	if t == nil {
		return
	}
	go t.sendNow(t.defaultChat, text)
}

// SendForProject routes the message based on the project name. Project-
// specific overrides win; otherwise the default chat is used. Never blocks,
// never returns an error.
func (t *Telegram) SendForProject(projectName, text string) {
	if t == nil {
		return
	}
	go t.sendNow(t.chatFor(projectName), text)
}

func (t *Telegram) sendNow(chatID, text string) {
	if chatID == "" {
		return
	}
	// Telegram caps single message at 4096 chars; truncate defensively.
	if len(text) > 4000 {
		text = text[:4000] + "\n…(truncated)"
	}
	body, _ := json.Marshal(map[string]any{
		"chat_id":                  chatID,
		"text":                     text,
		"parse_mode":               "HTML",
		"disable_web_page_preview": true,
	})
	endpoint := t.botEndpoint("sendMessage")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		logger.Warn("notifier", "build request failed", "error", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := t.client.Do(req)
	if err != nil {
		logger.Warn("notifier", "telegram send failed", "error", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		logger.Warn("notifier", "telegram non-2xx",
			"status", resp.StatusCode, "chat_id", chatID)
	}
}

// SendPhoto fires a photo to Telegram in a goroutine, uploading the raw
// bytes via multipart/form-data. We can't use Telegram's URL-based mode
// because RU networks block outbound traffic from Telegram's CDN to our
// host (`failed to get HTTP URL content`). Multipart goes through the
// same proxy chain as text messages, so it inherits proven connectivity.
//
// Caption supports HTML and is capped at Telegram's 1024-char limit. On
// any failure we fall back to a plain sendMessage with the caption text,
// so admins always get *some* notification even if photo delivery fails.
//
// imageBytes is sent as-is (no re-encode). Telegram accepts JPEG / PNG /
// WebP up to 10 MB for sendPhoto; larger should use sendDocument — we
// degrade to text fallback for those.
func (t *Telegram) SendPhoto(imageBytes []byte, filename, captionHTML string) {
	if t == nil {
		return
	}
	go t.sendPhotoNow(t.defaultChat, imageBytes, filename, captionHTML)
}

// SendPhotoForProject routes the photo to the project's override chat (or
// the default if no override matches).
func (t *Telegram) SendPhotoForProject(projectName string, imageBytes []byte, filename, captionHTML string) {
	if t == nil {
		return
	}
	go t.sendPhotoNow(t.chatFor(projectName), imageBytes, filename, captionHTML)
}

func (t *Telegram) sendPhotoNow(chatID string, imageBytes []byte, filename, captionHTML string) {
	if chatID == "" {
		return
	}
	const tgPhotoMaxBytes = 10 * 1024 * 1024
	if len(imageBytes) == 0 {
		logger.Warn("notifier", "sendPhoto: empty image bytes — falling back to text")
		t.fallbackText(chatID, captionHTML)
		return
	}
	if len(imageBytes) > tgPhotoMaxBytes {
		logger.Warn("notifier", "sendPhoto: image > 10 MB — falling back to text",
			"size", len(imageBytes), "filename", filename)
		t.fallbackText(chatID, captionHTML)
		return
	}

	caption := captionHTML
	if len(caption) > 1000 {
		caption = caption[:1000] + "\n…(truncated)"
	}
	if filename == "" {
		filename = "photo.jpg"
	}

	// Build multipart body: chat_id, caption, parse_mode, photo (file).
	var bodyBuf bytes.Buffer
	mw := multipart.NewWriter(&bodyBuf)
	_ = mw.WriteField("chat_id", chatID)
	_ = mw.WriteField("caption", caption)
	_ = mw.WriteField("parse_mode", "HTML")

	contentType := http.DetectContentType(imageBytes)
	hdr := make(textproto.MIMEHeader)
	hdr.Set("Content-Disposition", fmt.Sprintf(`form-data; name="photo"; filename=%q`, filename))
	hdr.Set("Content-Type", contentType)
	part, err := mw.CreatePart(hdr)
	if err != nil {
		logger.Warn("notifier", "sendPhoto: build multipart part failed", "error", err)
		t.fallbackText(chatID, captionHTML)
		return
	}
	if _, err := part.Write(imageBytes); err != nil {
		logger.Warn("notifier", "sendPhoto: write multipart payload failed", "error", err)
		t.fallbackText(chatID, captionHTML)
		return
	}
	if err := mw.Close(); err != nil {
		logger.Warn("notifier", "sendPhoto: close multipart failed", "error", err)
		t.fallbackText(chatID, captionHTML)
		return
	}

	endpoint := t.botEndpoint("sendPhoto")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &bodyBuf)
	if err != nil {
		logger.Warn("notifier", "build photo request failed", "error", err)
		t.fallbackText(chatID, captionHTML)
		return
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	resp, err := t.client.Do(req)
	if err != nil {
		logger.Warn("notifier", "telegram sendPhoto failed", "error", err)
		t.fallbackText(chatID, captionHTML)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		buf := make([]byte, 512)
		n, _ := resp.Body.Read(buf)
		logger.Warn("notifier", "telegram sendPhoto non-2xx",
			"status", resp.StatusCode, "body", string(buf[:n]),
			"size", len(imageBytes), "filename", filename)
		t.fallbackText(chatID, captionHTML)
	}
}

// fallbackText is invoked when sendPhoto fails — admins still get the
// caption text so they aren't blind to the event. Uses the SAME chat_id
// the photo was meant for, so the routed-group recipient sees the text
// fallback in the same place.
func (t *Telegram) fallbackText(chatID, text string) {
	go t.sendNow(chatID, text)
}

// Helpers for HTML escaping in messages we build below.

// EscHTML escapes the four HTML chars Telegram cares about for parse_mode=HTML.
func EscHTML(s string) string {
	r := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", "\"", "&quot;")
	return r.Replace(s)
}

// MMLVersion maps an internal provider id to a customer-facing MML version
// label. Underlying vendors (Google Gemini / CometAPI / FASHN.AI / fal.ai)
// are NEVER exposed to the customer — they see "MML V1..V3" only.
//
//   - cometapi-gemini → MML V1 (default, recommended)
//   - gemini          → MML V2 (Beta — direct AI Studio backup)
//   - fal-tryon       → MML V3 (fashion-specialized via fal.ai FASHN.AI)
//
// If a new provider is added without a MMLVersion mapping, the fallback
// "MML" keeps the bot output free of vendor names instead of leaking the
// raw provider id.
func MMLVersion(provider string) string {
	switch provider {
	case "cometapi-gemini":
		return "MML V1"
	case "gemini":
		return "MML V2"
	case "fal-nb1":
		return "MML V3"
	case "fal-nb2":
		return "MML V4"
	// Legacy slugs from earlier experiments — keep mappings so old
	// log lines still scrub cleanly.
	case "fal-tryon", "fal-fashn-tryon":
		return "MML"
	default:
		return "MML"
	}
}

// scrubVendorNames removes vendor / model identifiers that leak through
// upstream error strings (e.g. "cometapi-gemini: HTTP 503",
// "gemini-2.5-flash-image:generateContent"). Replaces them with the MML
// alias so failure notifications stay vendor-neutral.
//
// Order matters: longer / more-specific tokens MUST come before shorter
// substrings ("cometapi-gemini" before "gemini", "gemini-2.5-flash-image"
// before "gemini") because strings.Replacer does a left-to-right pass over
// pairs and a shorter match earlier in the list would consume the prefix.
func scrubVendorNames(s string) string {
	r := strings.NewReplacer(
		"cometapi-gemini", "MML V1",
		"fal-fal-ai-nano-banana-pro-edit", "MML V4",
		"fal-fal-ai-nano-banana-edit", "MML V3",
		"fal-nano-banana-pro", "MML V4",
		"fal-nano-banana", "MML V3",
		"fal-nb2", "MML V4",
		"fal-nb1", "MML V3",
		"fal-fashn-tryon", "MML",
		"fal-tryon", "MML",
		"fashn/tryon", "MML",
		"nano-banana-pro", "MML V4",
		"nano-banana", "MML V3",
		"gemini-3-pro-image-preview", "MML",
		"gemini-3.1-flash-image-preview", "MML",
		"gemini-2.5-flash-image", "MML",
		"gemini-2.5-flash", "MML",
		"gemini-3", "MML",
		"gemini", "MML V2",
		"api.cometapi.com", "ai-engine",
		"fal.run", "ai-engine",
		"fal.media", "ai-engine",
		"generativelanguage.googleapis.com", "ai-engine",
	)
	return r.Replace(s)
}

// russianReasonLabel maps the machine reason_code from the validator
// (internal/service/tryon.go::validationPromptText) to a short Russian
// label for the Telegram alert. Mirror of validation.reject.* in the
// widget's i18n/locales/ru.ts but shorter for at-a-glance reading.
//
// Why bother: the canonical reason_code (e.g. "bulky_outerwear") is
// great for analytics and the API, but as an admin watching a noisy
// channel you want to read "Тёплая одежда мешает примерке" in one
// glance, not decode an English snake_case identifier each time.
func russianReasonLabel(reason string) string {
	switch reason {
	case "ok":
		return "фото подходит"
	case "no_person":
		return "на фото нет человека"
	case "not_a_real_photo":
		return "не реальное фото (рендер/арт/манекен)"
	case "multiple_people":
		return "несколько человек в кадре"
	case "selfie_closeup":
		return "селфи крупным планом"
	case "not_full_body":
		return "не вся фигура в кадре"
	case "too_far":
		return "слишком далеко от камеры"
	case "back_or_side_view":
		return "не лицом к камере (спина/профиль)"
	case "non_standing_pose":
		return "не стоит прямо (сидит/наклонился)"
	case "bulky_outerwear":
		return "верхняя одежда (пуховик/шуба) мешает примерке"
	case "partial_occlusion":
		return "тело частично закрыто предметом"
	case "low_quality":
		return "плохое качество (тёмное/размытое)"
	case "screenshot":
		return "скриншот"
	case "collage":
		return "коллаж из нескольких фото"
	case "other":
		return "другая причина"
	default:
		return reason
	}
}

// FormatTryOnDone builds a "✅ Примерка готова" message. Provider and model
// are folded into a single MML Vx label — the customer never sees the
// upstream vendor name.
func FormatTryOnDone(projectName, model, provider string, latencyMs int, leadID int64, tryOnID int64) string {
	_ = model // intentionally unused — we no longer leak the upstream model name
	return fmt.Sprintf(
		"✅ <b>Примерка готова</b>\nпроект: <code>%s</code>\nдвижок: <code>%s</code>\nвремя: %d мс\nлид: %d, примерка: %d",
		EscHTML(projectName), EscHTML(MMLVersion(provider)), latencyMs, leadID, tryOnID,
	)
}

// FormatTryOnCached builds a "♻️ Примерка из кэша" message — fired when
// the customer clicked "Примерить" on a (photo + garment) combo they had
// already rendered before. We didn't pay for a new AI call, the result
// was reused from the prior render.
func FormatTryOnCached(projectName string, productCount int, leadID int64, newTryOnID int64, reusedTryOnID int64) string {
	return fmt.Sprintf(
		"♻️ <b>Примерка из кэша</b>\nпроект: <code>%s</code>\nтоваров: %d\nлид: %d, примерка: %d\nповтор примерки: %d",
		EscHTML(projectName), productCount, leadID, newTryOnID, reusedTryOnID,
	)
}

// FormatTryOnFailed builds a "❌ Примерка упала" message.
func FormatTryOnFailed(projectName, provider string, latencyMs int, leadID int64, tryOnID int64, errMsg string) string {
	cleanErr := scrubVendorNames(errMsg)
	if len(cleanErr) > 600 {
		cleanErr = cleanErr[:600] + "…"
	}
	return fmt.Sprintf(
		"❌ <b>Примерка не получилась</b>\nпроект: <code>%s</code>\nдвижок: <code>%s</code>\nвремя: %d мс\nлид: %d, примерка: %d\n\nошибка:\n<pre>%s</pre>",
		EscHTML(projectName), EscHTML(MMLVersion(provider)), latencyMs, leadID, tryOnID, EscHTML(cleanErr),
	)
}

// FormatValidationRejected builds a "⚠️ Фото отклонено" message. We surface
// both the Russian human-readable label (for the admin reading the alert)
// AND the raw reason_code (kept on its own line for grepping / analytics).
func FormatValidationRejected(projectName, reason, message string, leadID int64) string {
	return fmt.Sprintf(
		"⚠️ <b>Фото отклонено валидатором</b>\nпроект: <code>%s</code>\nпричина: %s\nсообщение клиенту: %s\nкод: <code>%s</code>\nлид: %d",
		EscHTML(projectName), EscHTML(russianReasonLabel(reason)), EscHTML(message), EscHTML(reason), leadID,
	)
}

// FormatUploadError builds a "🔴 Ошибка загрузки" message for parseFile /
// MIME failures (these happen before the photo reaches the validator).
func FormatUploadError(projectName, kind, detail string, leadID int64) string {
	russianKind := kind
	switch kind {
	case "mime_not_recognized":
		russianKind = "не распознан формат файла"
	case "heic_convert_failed":
		russianKind = "не удалось конвертировать HEIC в JPEG"
	case "parse_file_failed":
		russianKind = "не удалось разобрать multipart-форму"
	}
	return fmt.Sprintf(
		"🔴 <b>Ошибка загрузки фото</b>\nпроект: <code>%s</code>\nпричина: %s\nдетали: %s\nлид: %d",
		EscHTML(projectName), EscHTML(russianKind), EscHTML(detail), leadID,
	)
}

// FormatTryOnStarted builds a "🟡 Примерка запущена" message — fired when a
// user clicks "Примерить" and we accept the request (HTTP 202).
func FormatTryOnStarted(projectName string, productCount int, provider string, leadID int64, tryOnID int64) string {
	return fmt.Sprintf(
		"🟡 <b>Примерка запущена</b>\nпроект: <code>%s</code>\nдвижок: <code>%s</code>\nтоваров: %d\nлид: %d, примерка: %d",
		EscHTML(projectName), EscHTML(MMLVersion(provider)), productCount, leadID, tryOnID,
	)
}

// FormatPhotoUploaded builds a "📸 Фото принято" message — fired when
// validation passes, fails-open, or the user force-overrides the gate.
// `validationStatus` is the same token the handler ships on the wire
// (internal/handler/widget_session.go::UploadPhoto) — we keep the token
// strings stable for grep/analytics and only translate at the edge.
func FormatPhotoUploaded(projectName string, validationStatus string, sizeBytes int, mime string, leadID int64) string {
	russianStatus := validationStatus
	switch validationStatus {
	case "ok":
		russianStatus = "валидация пройдена"
	case "fail-open (validator unavailable)":
		russianStatus = "валидатор недоступен, пропустили (fail-open)"
	case "force-override (validator bypassed)":
		russianStatus = "клиент нажал «Всё равно попробовать» (валидатор обойдён)"
	}
	return fmt.Sprintf(
		"📸 <b>Фото принято</b>\nпроект: <code>%s</code>\nстатус: %s\nразмер: %d КБ, тип: %s\nлид: %d",
		EscHTML(projectName), EscHTML(russianStatus), sizeBytes/1024, EscHTML(mime), leadID,
	)
}
