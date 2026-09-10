package waitlist

import (
	"encoding/json"
	"errors"
	"net"
	"net/http"
)

type Handler struct{ store *Store }

func NewHandler(store *Store) *Handler { return &Handler{store: store} }

// Join — POST /api/v1/waitlist {email} → {position}
// Публичная ручка без авторизации: её видит холодный трафик с главной.
func (h *Handler) Join(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&body) != nil {
		writeErr(w, http.StatusBadRequest, "нужна почта")
		return
	}
	pos, err := h.store.Join(r.Context(), body.Email, clientIP(r))
	if errors.Is(err, ErrBadEmail) {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось записать заявку")
		return
	}
	writeJSON(w, map[string]int64{"position": pos})
}

// Count — GET /api/v1/waitlist → {count}
func (h *Handler) Count(w http.ResponseWriter, r *http.Request) {
	n, err := h.store.Count(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "счётчик недоступен")
		return
	}
	// Счётчик меняется от заявки к заявке — кэш отдал бы вчерашнее число.
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, map[string]int64{"count": n})
}

// clientIP — за nginx RemoteAddr это всегда 127.0.0.1, реальный адрес во
// X-Forwarded-For (первый в цепочке — клиент, остальные прокси).
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := len(xff); i > 0 {
			for j := 0; j < len(xff); j++ {
				if xff[j] == ',' {
					return xff[:j]
				}
			}
			return xff
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
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
