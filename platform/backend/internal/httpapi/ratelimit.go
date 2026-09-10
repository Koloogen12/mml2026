package httpapi

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// rateLimiter — лёгкий per-key лимитер (фиксированное окно). Без внешних
// зависимостей и без Redis: для одного инстанса in-memory достаточно; при
// масштабировании на несколько инстансов вынести в общий стор.
type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string]*window
	limit  int
	window time.Duration
}

type window struct {
	count int
	reset time.Time
}

func newRateLimiter(limit int, per time.Duration) *rateLimiter {
	rl := &rateLimiter{hits: make(map[string]*window), limit: limit, window: per}
	// Периодическая уборка протухших окон, чтобы карта не росла.
	go rl.gc()
	return rl
}

func (rl *rateLimiter) gc() {
	t := time.NewTicker(10 * time.Minute)
	for range t.C {
		rl.mu.Lock()
		for k, w := range rl.hits {
			if time.Now().After(w.reset) {
				delete(rl.hits, k)
			}
		}
		rl.mu.Unlock()
	}
}

// allow регистрирует обращение ключа и говорит, не превышен ли лимит.
func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	w, ok := rl.hits[key]
	if !ok || now.After(w.reset) {
		rl.hits[key] = &window{count: 1, reset: now.Add(rl.window)}
		return true
	}
	if w.count >= rl.limit {
		return false
	}
	w.count++
	return true
}

// limitMiddleware ограничивает по IP клиента. RealIP уже проставлен chi выше.
func limitMiddleware(rl *rateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !rl.allow(clientIP(r)) {
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				w.Header().Set("Retry-After", "60")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"error":"слишком много запросов, попробуйте позже"}`))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request) string {
	// chi RealIP кладёт настоящий IP в RemoteAddr (за nginx — из X-Forwarded-For).
	if h := r.Header.Get("X-Real-IP"); h != "" {
		return h
	}
	// RemoteAddr = "ip:port" — порт эфемерный, режем, иначе ключ уникален и
	// лимит не срабатывает.
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}
