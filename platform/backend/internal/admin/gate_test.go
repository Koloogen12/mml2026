package admin

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGateBlocksWithoutToken(t *testing.T) {
	h := Gate("secret")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	cases := []struct {
		name, token string
		want        int
	}{
		{"no header", "", http.StatusUnauthorized},
		{"wrong token", "nope", http.StatusUnauthorized},
		{"right token", "secret", http.StatusOK},
	}
	for _, c := range cases {
		req := httptest.NewRequest(http.MethodGet, "/admin/flags", nil)
		if c.token != "" {
			req.Header.Set("X-Admin-Token", c.token)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != c.want {
			t.Errorf("%s: код %d, ждали %d", c.name, rec.Code, c.want)
		}
	}
}

func TestGateOpenWhenTokenEmpty(t *testing.T) {
	// Пустой токен в конфиге (локальный dev) → гейт пропускает без заголовка.
	h := Gate("")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/admin/flags", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("пустой токен должен открывать гейт, код %d", rec.Code)
	}
}

func TestActorDefaults(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	if got := actor(req); got != "operator" {
		t.Fatalf("actor по умолчанию = %q", got)
	}
	req.Header.Set("X-Admin-Actor", "danil@mml")
	if got := actor(req); got != "danil@mml" {
		t.Fatalf("actor из заголовка = %q", got)
	}
}
