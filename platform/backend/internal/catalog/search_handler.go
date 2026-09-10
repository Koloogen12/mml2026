package catalog

import (
	"context"
	"net/http"
	"strconv"
)

// Embedder — то, что умеет превратить запрос в вектор (reco-сайдкар).
type Embedder interface {
	Embed(ctx context.Context, texts []string, kind string) ([][]float32, error)
}

// VectorEncoder — сериализация вектора в pgvector-литерал.
type VectorEncoder func(v []float32) string

type SearchHandler struct {
	repo   *Repo
	embed  Embedder
	encode VectorEncoder
}

func NewSearchHandler(repo *Repo, embed Embedder, encode VectorEncoder) *SearchHandler {
	return &SearchHandler{repo: repo, embed: embed, encode: encode}
}

// Search — GET /api/v1/search?q=чёрное платье&gender=female&max_price=8000
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	text := q.Get("q")
	if text == "" {
		httpError(w, http.StatusBadRequest, "нужен параметр q")
		return
	}

	vecs, err := h.embed.Embed(r.Context(), []string{text}, "query")
	if err != nil {
		httpError(w, http.StatusBadGateway, "поиск временно недоступен")
		return
	}

	f := ListFilter{
		Zone:   q.Get("zone"),
		Gender: q.Get("gender"),
		Brand:  q.Get("brand"),
	}
	f.MinPrice, _ = strconv.ParseFloat(q.Get("min_price"), 64)
	f.MaxPrice, _ = strconv.ParseFloat(q.Get("max_price"), 64)
	f.Limit, _ = strconv.Atoi(q.Get("limit"))

	items, err := h.repo.SemanticSearch(r.Context(), h.encode(vecs[0]), f)
	if err != nil {
		httpError(w, http.StatusInternalServerError, "не получилось выполнить поиск")
		return
	}
	writeJSON(w, map[string]any{"items": items, "count": len(items)})
}
