package collections

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// ResolveUser — publicID вошедшего → внутренний id (инъекция из роутера).
type ResolveUser func(ctx context.Context, publicID string) (int64, error)

// CurrentUser — public_id вошедшего из контекста запроса ("" если гость).
type CurrentUser func(r *http.Request) string

type Handler struct {
	store   *Store
	resolve ResolveUser
	current CurrentUser
}

func NewHandler(store *Store, resolve ResolveUser, current CurrentUser) *Handler {
	return &Handler{store: store, resolve: resolve, current: current}
}

func (h *Handler) userID(r *http.Request) (int64, bool) {
	pub := h.current(r)
	if pub == "" {
		return 0, false
	}
	id, err := h.resolve(r.Context(), pub)
	if err != nil {
		return 0, false
	}
	return id, true
}

// List — GET /api/v1/collections
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	items, err := h.store.List(r.Context(), uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить коллекции")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

// Create — POST /api/v1/collections {name}
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil {
		writeErr(w, http.StatusBadRequest, "нужно название")
		return
	}
	id, err := h.store.Create(r.Context(), uid, body.Name)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]string{"id": id})
}

// Delete — DELETE /api/v1/collections/{id}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	if err := h.store.Delete(r.Context(), uid, chi.URLParam(r, "id")); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

// Items — GET /api/v1/collections/{id}/items → public_id товаров
func (h *Handler) Items(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	ids, err := h.store.ItemProductIDs(r.Context(), uid, chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить")
		return
	}
	writeJSON(w, map[string]any{"product_ids": ids})
}

// AddItem — POST /api/v1/collections/{id}/items {product_id}
func (h *Handler) AddItem(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	var body struct {
		ProductID string `json:"product_id"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.ProductID == "" {
		writeErr(w, http.StatusBadRequest, "нужен product_id")
		return
	}
	if err := h.store.AddItem(r.Context(), uid, chi.URLParam(r, "id"), body.ProductID); err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось добавить")
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

// RemoveItem — DELETE /api/v1/collections/{id}/items/{productID}
func (h *Handler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	if err := h.store.RemoveItem(r.Context(), uid, chi.URLParam(r, "id"), chi.URLParam(r, "productID")); err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось убрать")
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

// Favorites — GET /api/v1/favorites → public_id товаров из дефолтной коллекции.
func (h *Handler) Favorites(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	ids, err := h.store.DefaultProductIDs(r.Context(), uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить избранное")
		return
	}
	writeJSON(w, map[string]any{"product_ids": ids})
}

// ToggleFavorite — POST /api/v1/favorites/toggle {product_id} → {added:bool}
func (h *Handler) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	var body struct {
		ProductID string `json:"product_id"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.ProductID == "" {
		writeErr(w, http.StatusBadRequest, "нужен product_id")
		return
	}
	added, err := h.store.ToggleDefault(r.Context(), uid, body.ProductID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось сохранить")
		return
	}
	writeJSON(w, map[string]bool{"added": added})
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
