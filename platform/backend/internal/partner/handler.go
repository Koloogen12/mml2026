package partner

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"mml-platform-backend/internal/auth"
)

const refreshCookie = "mml_partner_refresh"

// Uploader кладёт файл в объектное хранилище и возвращает публичный URL
// (инъекция из роутера — партнёр-пакет не тянет storage напрямую). nil → загрузки
// выключены.
type Uploader interface {
	Put(ctx context.Context, key, contentType string, data []byte) (string, error)
}

type Handler struct {
	store  *Store
	secure bool
	up     Uploader
}

func NewHandler(store *Store, secure bool, up Uploader) *Handler {
	return &Handler{store: store, secure: secure, up: up}
}

// partnerID достаёт внутренний id партнёра из токена (public_id в claim).
// Токен подписан общим секретом; но резолв идёт по таблице partners —
// пользовательский токен сюда не пролезет (его public_id там не найдётся).
func (h *Handler) partnerID(r *http.Request) (int64, bool) {
	c := auth.UserFrom(r.Context())
	if c == nil {
		return 0, false
	}
	id, err := h.store.IDByPublicID(r.Context(), c.UserPublicID)
	if err != nil {
		return 0, false
	}
	return id, true
}

// RequestCode — POST /api/v1/partner/auth/request-code
func (h *Handler) RequestCode(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.Email == "" {
		writeErr(w, http.StatusBadRequest, "нужен email")
		return
	}
	if err := h.store.RequestCode(r.Context(), body.Email); err != nil {
		if errors.Is(err, auth.ErrCooldown) {
			writeErr(w, http.StatusTooManyRequests, err.Error())
			return
		}
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]bool{"sent": true})
}

// Verify — POST /api/v1/partner/auth/verify
func (h *Handler) Verify(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.Email == "" || body.Code == "" {
		writeErr(w, http.StatusBadRequest, "нужны email и код")
		return
	}
	res, err := h.store.Verify(r.Context(), body.Email, body.Code, r.UserAgent())
	if err != nil {
		if errors.Is(err, auth.ErrTooMany) {
			writeErr(w, http.StatusTooManyRequests, err.Error())
			return
		}
		writeErr(w, http.StatusUnauthorized, err.Error())
		return
	}
	h.setRefreshCookie(w, res.RefreshToken)
	writeJSON(w, map[string]any{
		"access_token": res.AccessToken,
		"partner":      map[string]any{"id": res.PublicID, "brand_name": res.BrandName},
		"is_new":       res.IsNew,
	})
}

// Refresh — POST /api/v1/partner/auth/refresh
func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(refreshCookie)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "нет сессии")
		return
	}
	access, err := h.store.Refresh(r.Context(), c.Value)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "сессия истекла")
		return
	}
	writeJSON(w, map[string]string{"access_token": access})
}

// Logout — POST /api/v1/partner/auth/logout: гасит сессию и чистит cookie.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(refreshCookie); err == nil {
		_ = h.store.Logout(r.Context(), c.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name: refreshCookie, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, map[string]bool{"ok": true})
}

// GetBrand — GET /api/v1/partner/brand
func (h *Handler) GetBrand(w http.ResponseWriter, r *http.Request) {
	id, ok := h.partnerID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	b, err := h.store.Brand(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось загрузить бренд")
		return
	}
	writeJSON(w, map[string]any{"brand": b})
}

// SaveBrand — PUT /api/v1/partner/brand
func (h *Handler) SaveBrand(w http.ResponseWriter, r *http.Request) {
	id, ok := h.partnerID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	var b Brand
	if json.NewDecoder(r.Body).Decode(&b) != nil {
		writeErr(w, http.StatusBadRequest, "некорректные данные")
		return
	}
	if err := h.store.SaveBrand(r.Context(), id, b); err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось сохранить")
		return
	}
	writeJSON(w, map[string]bool{"saved": true})
}

// allowed — разрешённые типы по виду загрузки и расширение файла в хранилище.
var uploadKinds = map[string]map[string]string{
	"logo": {
		"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/svg+xml": ".svg",
	},
	"size_chart": {
		"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp",
		"image/svg+xml": ".svg", "application/pdf": ".pdf",
	},
}

// Upload — POST /api/v1/partner/upload/{kind} (multipart, поле file).
// kind ∈ {logo, size_chart}. Кладёт файл в хранилище и проставляет URL партнёру.
func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	id, ok := h.partnerID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	if h.up == nil {
		writeErr(w, http.StatusNotImplemented, "загрузки недоступны: не настроено хранилище")
		return
	}
	kind := chi.URLParam(r, "kind")
	allowed, ok := uploadKinds[kind]
	if !ok {
		writeErr(w, http.StatusBadRequest, "неизвестный тип загрузки")
		return
	}

	const maxSize = 5 << 20 // 5 МБ
	r.Body = http.MaxBytesReader(w, r.Body, maxSize+1024)
	if err := r.ParseMultipartForm(maxSize + 1024); err != nil {
		writeErr(w, http.StatusBadRequest, "файл больше 5 МБ или битый запрос")
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "нужно поле file")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxSize+1))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "не удалось прочитать файл")
		return
	}
	if len(data) > maxSize {
		writeErr(w, http.StatusRequestEntityTooLarge, "файл больше 5 МБ")
		return
	}

	// Тип определяем по содержимому (не доверяем заголовку клиента), SVG — исключение.
	ct := http.DetectContentType(data)
	ext, allowedType := allowed[ct]
	if !allowedType {
		// http.DetectContentType не знает SVG → проверяем по имени/заявленному типу.
		declared := hdr.Header.Get("Content-Type")
		if e, ok := allowed[declared]; ok && (declared == "image/svg+xml") {
			ext, allowedType = e, true
			ct = declared
		}
	}
	if !allowedType {
		writeErr(w, http.StatusUnsupportedMediaType, "недопустимый тип файла для «"+kind+"»")
		return
	}

	key := fmt.Sprintf("%s/%d/%d%s", kind, id, time.Now().UnixNano(), ext)
	url, err := h.up.Put(r.Context(), key, ct, data)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить")
		return
	}

	switch kind {
	case "logo":
		err = h.store.SaveLogoURL(r.Context(), id, url)
	case "size_chart":
		err = h.store.SaveSizeChart(r.Context(), id, url, ext[1:])
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "загружено, но не сохранилось")
		return
	}
	writeJSON(w, map[string]string{"url": url})
}

// GetSettings — GET /api/v1/partner/settings
func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	id, ok := h.partnerID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	st, err := h.store.Settings(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось загрузить настройки")
		return
	}
	writeJSON(w, map[string]any{"settings": st})
}

// SaveSettings — PUT /api/v1/partner/settings
func (h *Handler) SaveSettings(w http.ResponseWriter, r *http.Request) {
	id, ok := h.partnerID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	var st Settings
	if json.NewDecoder(r.Body).Decode(&st) != nil {
		writeErr(w, http.StatusBadRequest, "некорректные данные")
		return
	}
	if err := h.store.SaveSettings(r.Context(), id, st); err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось сохранить")
		return
	}
	writeJSON(w, map[string]bool{"saved": true})
}

// Products — GET /api/v1/partner/products — реальные товары партнёра (пусто,
// пока не подключён и не синхронизирован источник каталога).
func (h *Handler) Products(w http.ResponseWriter, r *http.Request) {
	id, ok := h.partnerID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	items, err := h.store.Products(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось загрузить товары")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

// HideProducts — POST /api/v1/partner/products/hide {ids, hidden}
// Партнёр скрывает/возвращает свои товары в выдаче (гейт по владению в store).
func (h *Handler) HideProducts(w http.ResponseWriter, r *http.Request) {
	id, ok := h.partnerID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	var body struct {
		IDs    []string `json:"ids"`
		Hidden bool     `json:"hidden"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || len(body.IDs) == 0 {
		writeErr(w, http.StatusBadRequest, "нужен непустой ids")
		return
	}
	n, err := h.store.SetProductsHidden(r.Context(), id, body.IDs, body.Hidden)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось")
		return
	}
	writeJSON(w, map[string]any{"ok": true, "affected": n})
}

// PreviewProduct — POST /api/v1/partner/preview-product {url}
// Герой онбординга: ссылка на товар → карточка в подборе (og-теги).
func (h *Handler) PreviewProduct(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.partnerID(r); !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	var body struct {
		URL string `json:"url"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.URL == "" {
		writeErr(w, http.StatusBadRequest, "нужен url товара")
		return
	}
	p, err := PreviewProduct(r.Context(), body.URL)
	if err != nil {
		if errors.Is(err, ErrBadURL) {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, map[string]any{"product": p})
}

// CatalogSources — GET /api/v1/partner/catalog-sources
func (h *Handler) CatalogSources(w http.ResponseWriter, r *http.Request) {
	id, ok := h.partnerID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	items, err := h.store.CatalogSources(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	if items == nil {
		items = []CatalogSource{}
	}
	writeJSON(w, map[string]any{"items": items})
}

// AddCatalogSource — POST /api/v1/partner/catalog-sources {kind, url}
func (h *Handler) AddCatalogSource(w http.ResponseWriter, r *http.Request) {
	id, ok := h.partnerID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	var body struct {
		Kind     string `json:"kind"`
		URL      string `json:"url"`
		Schedule string `json:"schedule"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.Kind == "" {
		writeErr(w, http.StatusBadRequest, "нужен kind источника")
		return
	}
	sourceID, err := h.store.AddCatalogSource(r.Context(), id, body.Kind, body.URL, body.Schedule)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось добавить")
		return
	}
	// Фид с URL — сразу синхронизируем и отдаём реальные счётчики импорта.
	if body.Kind == "feed" && strings.TrimSpace(body.URL) != "" {
		res, serr := h.store.SyncSource(r.Context(), id, sourceID)
		if serr != nil || res == nil {
			writeJSON(w, map[string]any{"added": true, "sync": map[string]any{"status": "failed"}})
			return
		}
		writeJSON(w, map[string]any{"added": true, "sync": map[string]any{
			"status": res.Status, "added": res.Added, "updated": res.Updated,
			"removed": res.Removed, "rejected": res.Rejected, "error": res.Error,
		}})
		return
	}
	writeJSON(w, map[string]bool{"added": true})
}

func (h *Handler) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookie,
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(refreshTTL),
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
