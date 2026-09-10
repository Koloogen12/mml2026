package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

// WidgetCORS returns permissive CORS middleware for the public Widget API.
// Domain verification is handled at the service layer (returning 403 for unauthorized domains).
// CORS headers must be present on all responses (including 403) so the browser
// can read the response body in the loader.
func WidgetCORS() func(http.Handler) http.Handler {
	return cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "X-Session-ID"},
		AllowCredentials: false,
		MaxAge:           300,
	})
}
