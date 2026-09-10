package content

import (
	"encoding/json"
	"net/http"
)

type Handler struct{ store *Store }

func NewHandler(store *Store) *Handler { return &Handler{store: store} }

// Get — GET /content (публично): контент главной для покупателя.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	home, err := h.store.Get(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить контент")
		return
	}
	writeJSON(w, home)
}

// AdminGet — GET /admin/content: то же + справочник зон для редактора.
func (h *Handler) AdminGet(w http.ResponseWriter, r *http.Request) {
	home, err := h.store.Get(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить контент")
		return
	}
	writeJSON(w, map[string]any{"home": home, "zones": Zones})
}

// Save — PUT /admin/content
func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	var home Home
	if json.NewDecoder(r.Body).Decode(&home) != nil {
		writeErr(w, http.StatusBadRequest, "не разобрал запрос")
		return
	}
	if err := h.store.Save(r.Context(), home); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

// Reset — POST /admin/content/reset
func (h *Handler) Reset(w http.ResponseWriter, r *http.Request) {
	if err := h.store.Reset(r.Context()); err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось сбросить")
		return
	}
	writeJSON(w, Defaults())
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
