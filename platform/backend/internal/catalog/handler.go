package catalog

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type Handler struct {
	repo *Repo
}

func NewHandler(repo *Repo) *Handler { return &Handler{repo: repo} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := ListFilter{
		Query:  q.Get("q"),
		Zone:   q.Get("zone"),
		Gender: q.Get("gender"),
		Brand:  q.Get("brand"),
	}
	if ids := q.Get("ids"); ids != "" {
		f.IDs = strings.Split(ids, ",")
		f.Gender = "" // по явному списку id пол не сужаем
	}
	f.MinPrice, _ = strconv.ParseFloat(q.Get("min_price"), 64)
	f.MaxPrice, _ = strconv.ParseFloat(q.Get("max_price"), 64)
	f.Limit, _ = strconv.Atoi(q.Get("limit"))
	f.Offset, _ = strconv.Atoi(q.Get("offset"))

	items, err := h.repo.List(r.Context(), f)
	if err != nil {
		httpError(w, http.StatusInternalServerError, "не получилось загрузить товары")
		return
	}
	writeJSON(w, map[string]any{"items": items, "count": len(items)})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	p, err := h.repo.GetByPublicID(r.Context(), chi.URLParam(r, "publicID"))
	if errors.Is(err, pgx.ErrNoRows) {
		httpError(w, http.StatusNotFound, "товар не найден")
		return
	}
	if err != nil {
		httpError(w, http.StatusInternalServerError, "не получилось загрузить товар")
		return
	}
	writeJSON(w, p)
}

func (h *Handler) Brands(w http.ResponseWriter, r *http.Request) {
	brands, err := h.repo.Brands(r.Context(), r.URL.Query().Get("gender"))
	if err != nil {
		httpError(w, http.StatusInternalServerError, "не получилось загрузить бренды")
		return
	}
	writeJSON(w, map[string]any{"items": brands})
}

// TasteBrands — GET /taste-brands?gender=
func (h *Handler) TasteBrands(w http.ResponseWriter, r *http.Request) {
	items, err := h.repo.TasteBrands(r.Context(), r.URL.Query().Get("gender"))
	if err != nil {
		httpError(w, http.StatusInternalServerError, "не получилось загрузить бренды")
		return
	}
	writeJSON(w, map[string]any{"items": items})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}

func httpError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// Related — GET /api/v1/products/{publicID}/related
// Отдаёт похожее и «с этим носят» одним запросом: обе секции показываются
// вместе, отдельные ручки означали бы два круга по сети ради одной карточки.
func (h *Handler) Related(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "publicID")
	similar, err := h.repo.Similar(r.Context(), id, 4)
	if err != nil {
		http.Error(w, `{"error":"не удалось подобрать похожее"}`, http.StatusInternalServerError)
		return
	}
	look, err := h.repo.Complementary(r.Context(), id, 3)
	if err != nil {
		http.Error(w, `{"error":"не удалось собрать образ"}`, http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"similar": similar, "look": look})
}
