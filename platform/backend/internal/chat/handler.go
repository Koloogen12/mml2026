package chat

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"mml-platform-backend/internal/catalog"
)

// PassportProvider по контексту запроса отдаёт id пользователя, компактную
// сводку паспорта (для тона ответа) и структурный профиль (для ретривала).
// Возвращает (0, "", nil) для гостя. Реализуется в router-слое поверх
// auth+passport, чтобы chat не зависел от них напрямую.
type PassportProvider func(r *http.Request) (userID int64, summary string, pz *catalog.Personalization)

type Handler struct {
	orch     *Orchestrator
	passport PassportProvider
}

func NewHandler(orch *Orchestrator, passport PassportProvider) *Handler {
	if passport == nil {
		passport = func(*http.Request) (int64, string, *catalog.Personalization) { return 0, "", nil }
	}
	return &Handler{orch: orch, passport: passport}
}

type chatRequest struct {
	SessionID string `json:"session_id,omitempty"`
	Message   string `json:"message"`
}

// Send — POST /api/v1/chat  → SSE-поток:
//
//	event: meta      {"session_id": "..."}
//	event: delta     {"text": "..."}
//	event: products  {"items": [...]}
//	event: done      {}
//	event: error     {"message": "..."}
func (h *Handler) Send(w http.ResponseWriter, r *http.Request) {
	var req chatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Message == "" {
		http.Error(w, `{"error":"нужно поле message"}`, http.StatusBadRequest)
		return
	}
	if len(req.Message) > 4000 {
		http.Error(w, `{"error":"сообщение слишком длинное"}`, http.StatusBadRequest)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, `{"error":"стриминг не поддерживается"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // nginx: не буферизовать SSE

	emit := &sseEmitter{w: w, flush: flusher.Flush}

	userID, summary, pz := h.passport(r)
	turn := Turn{
		SessionPublicID: req.SessionID,
		UserText:        req.Message,
		UserID:          userID,
		PassportContext: summary,
		Personalization: pz,
	}
	if err := h.orch.Handle(r.Context(), turn, emit); err != nil {
		// Ошибку обязательно в лог: раньше она просто гасилась, и понять,
		// почему чат «сломался», было нельзя ни по логам, ни по ответу.
		slog.Default().Error("chat handle", "err", err, "user", userID)
		if errors.Is(err, ErrOverloaded) {
			// Это не поломка, а занятость — говорим как есть.
			emit.Error("Ассистент сейчас перегружен. Попробуйте через минуту.")
			return
		}
		emit.Error("Что-то пошло не так. Попробуйте ещё раз.")
		return
	}
	emit.event("done", struct{}{})
}

type sseEmitter struct {
	w     http.ResponseWriter
	flush func()
}

func (e *sseEmitter) event(name string, payload any) {
	data, _ := json.Marshal(payload)
	fmt.Fprintf(e.w, "event: %s\ndata: %s\n\n", name, data)
	e.flush()
}

func (e *sseEmitter) Delta(text string) {
	e.event("delta", map[string]string{"text": text})
}

func (e *sseEmitter) Products(items []catalog.SearchResult) {
	e.event("products", map[string]any{"items": items})
}

func (e *sseEmitter) Meta(sessionPublicID string) {
	e.event("meta", map[string]string{"session_id": sessionPublicID})
}

func (e *sseEmitter) Error(userMessage string) {
	e.event("error", map[string]string{"message": userMessage})
}
