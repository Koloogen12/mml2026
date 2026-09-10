package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

// BiometricDeleter удаляет биометрию пользователя (обнуление колориметрии +
// чистка фото в виджете). Инъекция из роутера — админка не тянет чужие пакеты.
type BiometricDeleter func(ctx context.Context, userPublicID, actor string) error

// SourceSyncer запускает синхронизацию источника каталога (инъекция из роутера).
type SourceSyncer func(sourceID int64)

// EnrichRunner пересобирает атрибуты выбранных товаров через LLM (инъекция из
// роутера — админка не тянет пакет enrich напрямую). nil, если ключ LLM не задан.
type EnrichRunner func(publicIDs []string)

type Handler struct {
	store   *Store
	delBio  BiometricDeleter
	syncSrc SourceSyncer
	enrich  EnrichRunner
}

func NewHandler(store *Store, delBio BiometricDeleter, syncSrc SourceSyncer, enrich EnrichRunner) *Handler {
	return &Handler{store: store, delBio: delBio, syncSrc: syncSrc, enrich: enrich}
}

// EnrichProducts — POST /api/v1/admin/products/enrich {ids:[public_id...]} (A4).
// Пересобирает атрибуты выбранных товаров ИИ. Асинхронно: HTTP не ждёт LLM.
func (h *Handler) EnrichProducts(w http.ResponseWriter, r *http.Request) {
	if h.enrich == nil {
		writeErr(w, http.StatusNotImplemented, "обогащение недоступно: не задан ключ LLM")
		return
	}
	var body struct {
		IDs []string `json:"ids"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || len(body.IDs) == 0 {
		writeErr(w, http.StatusBadRequest, "нужен непустой ids")
		return
	}
	h.enrich(body.IDs)
	_ = h.store.LogAudit(r.Context(), actor(r), "enrich_products", "", map[string]any{"count": len(body.IDs)})
	writeJSON(w, map[string]any{"ok": true, "queued": len(body.IDs)})
}

// CreatePartner — POST /api/v1/admin/partners {email, brand_name} (A3 ручной онбординг).
func (h *Handler) CreatePartner(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email     string `json:"email"`
		BrandName string `json:"brand_name"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || !strings.Contains(body.Email, "@") {
		writeErr(w, http.StatusBadRequest, "нужна корректная почта партнёра")
		return
	}
	id, err := h.store.CreatePartner(r.Context(), body.Email, body.BrandName)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось завести партнёра")
		return
	}
	_ = h.store.LogAudit(r.Context(), actor(r), "create_partner", id, map[string]any{"email": body.Email})
	writeJSON(w, map[string]string{"id": id})
}

// LabelQueue — GET /api/v1/admin/label-queue?unlabeled=1 (A1).
// Реальная лента пар «запрос → ответ ИИ с товарами» для gold-set.
func (h *Handler) LabelQueue(w http.ResponseWriter, r *http.Request) {
	onlyUnlabeled := r.URL.Query().Get("unlabeled") != "0"
	items, err := h.store.LabelQueue(r.Context(), onlyUnlabeled, 30)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось загрузить ленту разметки")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

// PausePartner — POST /api/v1/admin/partners/{publicID}/pause {paused:bool} (A3).
func (h *Handler) PausePartner(w http.ResponseWriter, r *http.Request) {
	pubID := chi.URLParam(r, "publicID")
	var body struct {
		Paused bool `json:"paused"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil {
		writeErr(w, http.StatusBadRequest, "нужно paused")
		return
	}
	if err := h.store.SetPartnerPaused(r.Context(), pubID, body.Paused); err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось")
		return
	}
	_ = h.store.LogAudit(r.Context(), actor(r), "pause_partner", pubID, map[string]any{"paused": body.Paused})
	writeJSON(w, map[string]bool{"ok": true})
}

// SyncPartner — POST /api/v1/admin/partners/{publicID}/sync (A3 «запустить синк»).
// Синкает все фид-источники партнёра (async), результат — в журнал синков.
func (h *Handler) SyncPartner(w http.ResponseWriter, r *http.Request) {
	pubID := chi.URLParam(r, "publicID")
	if h.syncSrc == nil {
		writeErr(w, http.StatusNotImplemented, "синк недоступен")
		return
	}
	ids, err := h.store.SourceIDsForPartner(r.Context(), pubID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	for _, id := range ids {
		h.syncSrc(id)
	}
	_ = h.store.LogAudit(r.Context(), actor(r), "sync_partner", pubID, map[string]any{"sources": len(ids)})
	w.WriteHeader(http.StatusAccepted)
	writeJSON(w, map[string]any{"started": true, "sources": len(ids)})
}

// SyncSource — POST /api/v1/admin/sources/{id}/sync (A3 «запустить синк»).
// Асинхронно: возвращаем 202, результат ляжет в журнал синков.
func (h *Handler) SyncSource(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || h.syncSrc == nil {
		writeErr(w, http.StatusBadRequest, "некорректный источник")
		return
	}
	_ = h.store.LogAudit(r.Context(), actor(r), "sync_source", chi.URLParam(r, "id"), nil)
	h.syncSrc(id)
	w.WriteHeader(http.StatusAccepted)
	writeJSON(w, map[string]bool{"started": true})
}

// ── A0 · Стол стилиста ──
func (h *Handler) Queue(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.Queue(r.Context(), r.URL.Query().Get("status"), atoiDefault(r.URL.Query().Get("limit"), 100))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось загрузить очередь")
		return
	}
	counts, _ := h.store.QueueCounts(r.Context())
	writeJSON(w, map[string]any{"items": items, "counts": counts})
}

// UserPassport — GET /api/v1/admin/users/{publicID}/passport (панель A0).
func (h *Handler) UserPassport(w http.ResponseWriter, r *http.Request) {
	p, err := h.store.UserPassport(r.Context(), chi.URLParam(r, "publicID"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось загрузить паспорт")
		return
	}
	writeJSON(w, map[string]any{"passport": p}) // p == nil → паспорта нет (честно)
}

func (h *Handler) Dialog(w http.ResponseWriter, r *http.Request) {
	msgs, err := h.store.Dialog(r.Context(), chi.URLParam(r, "publicID"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось загрузить диалог")
		return
	}
	writeJSON(w, map[string]any{"messages": msgs})
}

func (h *Handler) MarkLead(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Status        string `json:"status"`
		AmountKopecks *int64 `json:"amount_kopecks"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.Status == "" {
		writeErr(w, http.StatusBadRequest, "нужен status")
		return
	}
	pid := chi.URLParam(r, "publicID")
	if err := h.store.MarkLead(r.Context(), pid, body.Status, body.AmountKopecks); err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось обновить статус")
		return
	}
	_ = h.store.LogAudit(r.Context(), actor(r), "mark_lead", pid,
		map[string]any{"status": body.Status, "amount_kopecks": body.AmountKopecks})
	writeJSON(w, map[string]bool{"ok": true})
}

// ── A1 · Разметка ──
func (h *Handler) AddLabel(w http.ResponseWriter, r *http.Request) {
	var l Label
	if json.NewDecoder(r.Body).Decode(&l) != nil {
		writeErr(w, http.StatusBadRequest, "некорректные данные")
		return
	}
	if l.Rater == "" {
		l.Rater = actor(r)
	}
	if err := h.store.AddLabel(r.Context(), l); err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось сохранить оценку")
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

func (h *Handler) LabelStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.store.LabelStats(r.Context(), 300)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, stats)
}

// ExportLabels — JSONL (единственный экспорт админки).
func (h *Handler) ExportLabels(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.ExportLabels(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	w.Header().Set("Content-Type", "application/x-ndjson; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="gold-set.jsonl"`)
	enc := json.NewEncoder(w)
	for _, it := range items {
		_ = enc.Encode(it) // по строке на объект
	}
}

// ── A3 · Партнёры ──
func (h *Handler) Partners(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.Partners(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

func (h *Handler) Rejects(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.Rejects(r.Context(), chi.URLParam(r, "publicID"),
		atoiDefault(r.URL.Query().Get("limit"), 200))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

// HideProducts — POST /api/v1/admin/products/hide {ids:[], hidden:bool} (A4 модерация).
func (h *Handler) HideProducts(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IDs    []string `json:"ids"`
		Hidden bool     `json:"hidden"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || len(body.IDs) == 0 {
		writeErr(w, http.StatusBadRequest, "нужны ids")
		return
	}
	n, err := h.store.SetProductsHidden(r.Context(), body.IDs, body.Hidden)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось")
		return
	}
	_ = h.store.LogAudit(r.Context(), actor(r), "hide_products", "",
		map[string]any{"count": n, "hidden": body.Hidden})
	writeJSON(w, map[string]any{"affected": n})
}

// ── A4 · Товары ──
func (h *Handler) Products(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.Products(r.Context(), atoiDefault(r.URL.Query().Get("limit"), 100))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

// ── A5 · Примерки и себестоимость ──
func (h *Handler) Tryons(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.TryonQueue(r.Context(), atoiDefault(r.URL.Query().Get("limit"), 100))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	days := atoiDefault(r.URL.Query().Get("days"), 30)
	cost, err := h.store.CostSummary(r.Context(), time.Now().AddDate(0, 0, -days))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, map[string]any{"items": items, "cost": cost})
}

// ── A6 · Согласия ──
func (h *Handler) Consents(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.Consents(r.Context(), r.URL.Query().Get("user"),
		atoiDefault(r.URL.Query().Get("limit"), 200))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

// ExportUser — GET /api/v1/admin/users/{publicID}/export (152-ФЗ выгрузка).
func (h *Handler) ExportUser(w http.ResponseWriter, r *http.Request) {
	pid := chi.URLParam(r, "publicID")
	data, err := h.store.ExportUser(r.Context(), pid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка выгрузки")
		return
	}
	if data == nil {
		writeErr(w, http.StatusNotFound, "пользователь не найден")
		return
	}
	_ = h.store.LogAudit(r.Context(), actor(r), "export_user", pid, nil)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="user-`+pid+`.json"`)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(data)
}

func (h *Handler) DeleteBiometric(w http.ResponseWriter, r *http.Request) {
	pid := chi.URLParam(r, "publicID")
	if h.delBio == nil {
		writeErr(w, http.StatusNotImplemented, "удаление недоступно")
		return
	}
	if err := h.delBio(r.Context(), pid, actor(r)); err != nil {
		writeErr(w, http.StatusInternalServerError, "не получилось удалить биометрию")
		return
	}
	_ = h.store.LogAudit(r.Context(), actor(r), "delete_biometric", pid, nil)
	writeJSON(w, map[string]bool{"deleted": true})
}

// ── A7 · Воронка ──
func (h *Handler) Funnel(w http.ResponseWriter, r *http.Request) {
	f, err := h.store.Funnel(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, f)
}

// ── A8 · Флаги + аудит ──
func (h *Handler) Flags(w http.ResponseWriter, r *http.Request) {
	flags, err := h.store.Flags(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, map[string]any{"flags": flags})
}

func (h *Handler) SetFlag(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	var body struct {
		Value string `json:"value"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.Value == "" {
		writeErr(w, http.StatusBadRequest, "нужно value")
		return
	}
	if err := h.store.SetFlag(r.Context(), key, body.Value, actor(r)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeErr(w, http.StatusNotFound, "нет такого флага")
			return
		}
		writeErr(w, http.StatusInternalServerError, "не получилось сохранить флаг")
		return
	}
	_ = h.store.LogAudit(r.Context(), actor(r), "set_flag", key, map[string]any{"value": body.Value})
	writeJSON(w, map[string]bool{"ok": true})
}

func (h *Handler) Audit(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.Audit(r.Context(), atoiDefault(r.URL.Query().Get("limit"), 100))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ошибка")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

func atoiDefault(s string, def int) int {
	if n, err := strconv.Atoi(s); err == nil && n > 0 {
		return n
	}
	return def
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
