package blog

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

// Uploader — минимум, который нужен блогу от хранилища (у нас MinIO).
type Uploader interface {
	Put(ctx context.Context, key, contentType string, data []byte) (string, error)
}

// ResolveUser — public_id вошедшего → внутренний id (для blog_media.uploaded_by).
type ResolveUser func(ctx context.Context, publicID string) (int64, error)

// CurrentUser — public_id вошедшего из контекста запроса ("" если гость).
type CurrentUser func(r *http.Request) string

type Handler struct {
	store   *Store
	up      Uploader
	resolve ResolveUser
	current CurrentUser
}

func NewHandler(store *Store, up Uploader, resolve ResolveUser, current CurrentUser) *Handler {
	return &Handler{store: store, up: up, resolve: resolve, current: current}
}

// maxUpload — потолок на файл медиатеки.
const maxUpload = 12 << 20 // 12 MB

var allowedMime = map[string]bool{
	"image/jpeg": true, "image/png": true, "image/webp": true, "image/gif": true,
}

// ── Админка ─────────────────────────────────────────────────────────────────

// Posts — GET /admin/blog/posts?status=&q=
func (h *Handler) Posts(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.List(r.Context(), r.URL.Query().Get("status"), r.URL.Query().Get("q"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить статьи")
		return
	}
	writeJSON(w, map[string]any{"items": items, "tags": Tags})
}

// Post — GET /admin/blog/posts/{id}
func (h *Handler) Post(w http.ResponseWriter, r *http.Request) {
	p, err := h.store.Get(r.Context(), chi.URLParam(r, "id"))
	if errors.Is(err, pgx.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "статья не найдена")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить статью")
		return
	}
	writeJSON(w, p)
}

// CreatePost — POST /admin/blog/posts
func (h *Handler) CreatePost(w http.ResponseWriter, r *http.Request) {
	var in PostInput
	if json.NewDecoder(r.Body).Decode(&in) != nil {
		writeErr(w, http.StatusBadRequest, "не разобрал запрос")
		return
	}
	id, err := h.store.Create(r.Context(), in)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]string{"id": id})
}

// UpdatePost — PATCH /admin/blog/posts/{id}
func (h *Handler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	var in PostInput
	if json.NewDecoder(r.Body).Decode(&in) != nil {
		writeErr(w, http.StatusBadRequest, "не разобрал запрос")
		return
	}
	if err := h.store.Update(r.Context(), chi.URLParam(r, "id"), in); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

// PublishPost — PATCH /admin/blog/posts/{id}/publish {status, scheduled_at}
func (h *Handler) PublishPost(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Status      string     `json:"status"`
		ScheduledAt *time.Time `json:"scheduled_at"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil {
		writeErr(w, http.StatusBadRequest, "не разобрал запрос")
		return
	}
	if err := h.store.Publish(r.Context(), chi.URLParam(r, "id"), body.Status, body.ScheduledAt); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

// DuplicatePost — POST /admin/blog/posts/{id}/duplicate
func (h *Handler) DuplicatePost(w http.ResponseWriter, r *http.Request) {
	id, err := h.store.Duplicate(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]string{"id": id})
}

// DeletePost — DELETE /admin/blog/posts/{id}
func (h *Handler) DeletePost(w http.ResponseWriter, r *http.Request) {
	if err := h.store.Delete(r.Context(), chi.URLParam(r, "id")); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

// Authors — GET /admin/blog/authors
func (h *Handler) Authors(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.Authors(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить авторов")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

// CreateAuthor — POST /admin/blog/authors
func (h *Handler) CreateAuthor(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
		Bio       string `json:"bio"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil {
		writeErr(w, http.StatusBadRequest, "не разобрал запрос")
		return
	}
	id, err := h.store.CreateAuthor(r.Context(), body.Name, body.AvatarURL, body.Bio)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]string{"id": id})
}

// UploadMedia — POST /admin/blog/media/upload (multipart, поле "file").
// Файл уходит в MinIO; на диске ничего не остаётся.
func (h *Handler) UploadMedia(w http.ResponseWriter, r *http.Request) {
	if h.up == nil {
		writeErr(w, http.StatusServiceUnavailable, "хранилище не настроено")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload+(1<<20))
	if err := r.ParseMultipartForm(maxUpload); err != nil {
		writeErr(w, http.StatusBadRequest, "файл слишком большой или битый")
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "нужен файл в поле file")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxUpload+1))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "не удалось прочитать файл")
		return
	}
	if len(data) > maxUpload {
		writeErr(w, http.StatusRequestEntityTooLarge, "файл больше 12 МБ")
		return
	}
	// Тип определяем по содержимому, а не по заголовку из браузера:
	// Content-Type в multipart подделывается тривиально.
	mime := http.DetectContentType(data)
	if !allowedMime[mime] {
		writeErr(w, http.StatusBadRequest, "можно только картинки: JPEG, PNG, WebP, GIF")
		return
	}
	ext := strings.ToLower(filepath.Ext(hdr.Filename))
	if ext == "" {
		ext = mimeExt(mime)
	}
	key := fmt.Sprintf("blog/%d%s", time.Now().UnixNano(), ext)
	url, err := h.up.Put(r.Context(), key, mime, data)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить в хранилище")
		return
	}

	var by *int64
	if pub := h.current(r); pub != "" {
		if id, err := h.resolve(r.Context(), pub); err == nil {
			by = &id
		}
	}
	m := Media{
		Filename:  filepath.Base(hdr.Filename),
		URL:       url,
		MimeType:  mime,
		SizeBytes: int64(len(data)),
	}
	id, err := h.store.AddMedia(r.Context(), m, key, by)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось сохранить в медиатеку")
		return
	}
	m.ID = id
	writeJSON(w, m)
}

// MediaList — GET /admin/blog/media
func (h *Handler) MediaList(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.Media(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить медиатеку")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

// DeleteMedia — DELETE /admin/blog/media/{id}
func (h *Handler) DeleteMedia(w http.ResponseWriter, r *http.Request) {
	if err := h.store.DeleteMedia(r.Context(), chi.URLParam(r, "id")); err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось удалить")
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

// ── Публичное ───────────────────────────────────────────────────────────────

// PublicList — GET /blog/posts?tag=&limit=
func (h *Handler) PublicList(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := h.store.ListPublic(r.Context(), r.URL.Query().Get("tag"), limit)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить блог")
		return
	}
	writeJSON(w, map[string]any{"items": items, "tags": Tags})
}

// PublicPost — GET /blog/posts/{slug}
func (h *Handler) PublicPost(w http.ResponseWriter, r *http.Request) {
	p, err := h.store.GetPublic(r.Context(), chi.URLParam(r, "slug"))
	if errors.Is(err, pgx.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "статья не найдена")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить статью")
		return
	}
	writeJSON(w, p)
}

func mimeExt(mime string) string {
	switch mime {
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	default:
		return ".jpg"
	}
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
