package tryon

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"mml-platform-backend/internal/auth"
)

type UserResolver func(ctx context.Context, publicID string) (int64, error)

type Handler struct {
	svc     *Service
	resolve UserResolver
}

func NewHandler(svc *Service, resolve UserResolver) *Handler {
	return &Handler{svc: svc, resolve: resolve}
}

func (h *Handler) userID(r *http.Request) (int64, bool) {
	c := auth.UserFrom(r.Context())
	if c == nil {
		return 0, false
	}
	id, err := h.resolve(r.Context(), c.UserPublicID)
	if err != nil {
		return 0, false
	}
	return id, true
}

type startRequest struct {
	SessionID  string   `json:"session_id,omitempty"`
	ProductIDs []string `json:"product_ids"`
	// Фото data-URL (data:image/jpeg;base64,...) — байты уходят в виджет,
	// в платформе не оседают. Пусто в mock-демо допустимо.
	PhotoDataURL string `json:"photo,omitempty"`
}

// Start — POST /api/v1/tryon (auth) — примерка, гейт по согласию 152-ФЗ.
func (h *Handler) Start(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	var req startRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeErr(w, http.StatusBadRequest, "некорректный запрос")
		return
	}

	photo, ctype := decodeDataURL(req.PhotoDataURL)
	res, err := h.svc.Start(r.Context(), StartInput{
		UserID:          uid,
		SessionPublicID: req.SessionID,
		ProductIDs:      req.ProductIDs,
		Photo:           photo,
		PhotoType:       ctype,
	})
	switch {
	case errors.Is(err, ErrConsentRequired):
		writeErr(w, http.StatusForbidden, "consent_required")
		return
	case errors.Is(err, ErrNoProducts), errors.Is(err, ErrTooManyProducts):
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	case errors.Is(err, ErrWidgetUnavailable):
		writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	case err != nil:
		writeErr(w, http.StatusInternalServerError, "не получилось запустить примерку")
		return
	}
	writeJSON(w, res)
}

// Status — GET /api/v1/tryon/{publicID} (auth)
func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	res, err := h.svc.Status(r.Context(), uid, chi.URLParam(r, "publicID"))
	if errors.Is(err, ErrNotFound) {
		writeErr(w, http.StatusNotFound, "примерка не найдена")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, res)
}

func decodeDataURL(s string) ([]byte, string) {
	if s == "" {
		return nil, ""
	}
	ctype := "image/jpeg"
	if i := strings.Index(s, ";base64,"); strings.HasPrefix(s, "data:") && i > 0 {
		ctype = s[len("data:"):i]
		data, err := base64.StdEncoding.DecodeString(s[i+len(";base64,"):])
		if err == nil {
			return data, ctype
		}
	}
	return nil, ctype
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
