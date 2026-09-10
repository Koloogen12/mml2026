package passport

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"mml-platform-backend/internal/auth"
)

// UserResolver превращает публичный UUID пользователя во внутренний id.
type UserResolver func(ctx context.Context, publicID string) (int64, error)

type Handler struct {
	store    *Store
	resolve  UserResolver
	llmKey   string
	llmModel string
}

func NewHandler(store *Store, resolve UserResolver, llmKey, llmModel string) *Handler {
	return &Handler{store: store, resolve: resolve, llmKey: llmKey, llmModel: llmModel}
}

// StyleCode — GET /passport/style-code.
// Пусто (200 + null) — паспорт ещё не заполнен: показывать нечего.
func (h *Handler) StyleCode(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	if h.llmKey == "" {
		writeErr(w, http.StatusServiceUnavailable, "генерация недоступна")
		return
	}
	code, err := h.store.StyleCodeFor(r.Context(), uid, h.llmKey, h.llmModel)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось собрать стиль-код")
		return
	}
	writeJSON(w, code)
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

// Get — GET /api/v1/passport
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	p, err := h.store.Current(r.Context(), uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось загрузить паспорт")
		return
	}
	writeJSON(w, map[string]any{"preferences": p})
}

// Save — PUT /api/v1/passport (сохранение онбординга + правки во вкладке P1)
func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	/*
	 * Читаем тело ДВАЖДЫ: в структуру и в набор ключей.
	 *
	 * Паспорт правится по кусочкам — карточки «в паспорт», размеры, подписка на
	 * бренд шлют по одному полю. Раньше Save вставлял новую версию ровно из
	 * присланного, и любое такое сохранение стирало всё остальное: у людей
	 * пропадал пол (for_whom), а с ним ломались размеры, бюджет и вся выдача.
	 *
	 * Отличить «поле не прислали» от «прислали пустым» по структуре нельзя:
	 * и то и другое даёт нулевое значение. Поэтому смотрим, какие ключи реально
	 * были в JSON, — только их и меняем. Иначе нельзя было бы очистить список
	 * (отписаться от последнего бренда).
	 */
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "некорректные данные")
		return
	}
	var p Preferences
	if json.Unmarshal(raw, &p) != nil {
		writeErr(w, http.StatusBadRequest, "некорректные данные")
		return
	}
	var present map[string]json.RawMessage
	if json.Unmarshal(raw, &present) != nil {
		writeErr(w, http.StatusBadRequest, "некорректные данные")
		return
	}
	fields := make([]string, 0, len(present))
	for k := range present {
		fields = append(fields, k)
	}
	if err := h.store.SavePatch(r.Context(), uid, p, fields); err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось сохранить")
		return
	}
	writeJSON(w, map[string]bool{"saved": true})
}

// Refine — POST /api/v1/passport/refine (фидбек-петля).
// Усиливает бренд-аффинити паспорта по реальному поведению (примерки+клики).
func (h *Handler) Refine(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	added, err := h.store.RefineFromBehavior(r.Context(), uid, 3)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось обновить паспорт")
		return
	}
	writeJSON(w, map[string]any{"added_brands": added})
}

// Consents — GET /api/v1/consents
func (h *Handler) Consents(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	items, err := h.store.Consents(r.Context(), uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

// LogConsent — POST /api/v1/consents {kind, version, granted}
func (h *Handler) LogConsent(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	var body struct {
		Kind    string `json:"kind"`
		Version string `json:"version"`
		Granted bool   `json:"granted"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.Kind == "" {
		writeErr(w, http.StatusBadRequest, "нужен kind")
		return
	}
	if err := h.store.LogConsent(r.Context(), uid, body.Kind, body.Version, body.Granted, r.RemoteAddr); err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, map[string]bool{"logged": true})
}

// DeleteBiometric — DELETE /api/v1/biometric (152-ФЗ, один тап)
func (h *Handler) DeleteBiometric(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	if err := h.store.DeleteBiometric(r.Context(), uid, r.RemoteAddr); err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось удалить")
		return
	}
	writeJSON(w, map[string]bool{"deleted": true})
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
