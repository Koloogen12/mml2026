package middleware

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"mml-saas-backend/pkg/logger"

	"github.com/go-chi/chi/v5"
)

// rateBucket tracks request count within a time window.
type rateBucket struct {
	count    int
	windowAt time.Time
}

// RateLimiter provides in-memory rate limiting with automatic cleanup.
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*rateBucket
	limit   int
	window  time.Duration
}

// NewRateLimiter creates a rate limiter with the given limit per window.
// Starts a background goroutine to clean up expired entries every minute.
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*rateBucket),
		limit:   limit,
		window:  window,
	}
	go rl.cleanup()
	return rl
}

// Allow checks if the key is within the rate limit. Returns true if allowed.
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, ok := rl.buckets[key]
	if !ok || now.Sub(b.windowAt) >= rl.window {
		rl.buckets[key] = &rateBucket{count: 1, windowAt: now}
		return true
	}
	b.count++
	return b.count <= rl.limit
}

// Remaining returns how many requests are left for the key.
func (rl *RateLimiter) Remaining(key string) int {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, ok := rl.buckets[key]
	if !ok || now.Sub(b.windowAt) >= rl.window {
		return rl.limit
	}
	rem := rl.limit - b.count
	if rem < 0 {
		return 0
	}
	return rem
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, b := range rl.buckets {
			if now.Sub(b.windowAt) >= rl.window {
				delete(rl.buckets, key)
			}
		}
		rl.mu.Unlock()
	}
}

func writeRateLimitError(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusTooManyRequests)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": map[string]string{
			"code":    "rate_limit_exceeded",
			"message": message,
		},
	})
}

// WidgetRateLimit applies IP-based rate limiting to all Widget API requests.
// Limit: 100 requests per minute per IP.
func WidgetRateLimit(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr

			if !limiter.Allow(ip) {
				logger.Warn("ratelimit", "IP rate limit exceeded",
					"ip", ip,
					"limit", limiter.limit,
					"window", limiter.window,
				)
				writeRateLimitError(w, "Too many requests. Please try again later.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// WidgetTryOnRateLimit applies rate limiting specifically for try-on requests.
// - IP limit: 20 try-on requests per hour per IP
// - Session limit: 50 try-on requests per session (lifetime)
func WidgetTryOnRateLimit(ipLimiter *RateLimiter, sessionLimiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr

			if !ipLimiter.Allow(ip) {
				logger.Warn("ratelimit", "try-on IP rate limit exceeded",
					"ip", ip,
					"limit", ipLimiter.limit,
					"window", ipLimiter.window,
				)
				writeRateLimitError(w, "Too many try-on requests. Please try again later.")
				return
			}

			token := chi.URLParam(r, "token")
			if token != "" {
				if !sessionLimiter.Allow(token) {
					logger.Warn("ratelimit", "try-on session rate limit exceeded",
						"session", token,
						"limit", sessionLimiter.limit,
						"window", sessionLimiter.window,
					)
					writeRateLimitError(w, "Try-on limit reached for this session.")
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
