package middleware

import (
	"net/http"
	"time"

	"mml-saas-backend/pkg/logger"

	chimw "github.com/go-chi/chi/v5/middleware"
)

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)

		defer func() {
			logger.Debug("http", "request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", ww.Status(),
				"duration", time.Since(start).String(),
				"remote", r.RemoteAddr,
			)
		}()

		next.ServeHTTP(ww, r)
	})
}
