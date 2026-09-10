package middleware

import (
	"context"
	"net/http"
	"net/url"
	"strings"

	"mml-saas-backend/internal/handler"

	"github.com/go-chi/chi/v5"
)

// DomainVerifier resolves the list of allowed hostnames for a project given its public UUID string.
// Returns nil domains (no error) if the project is not found — the downstream handler handles 404.
type DomainVerifier func(ctx context.Context, projectPublicIDStr string) ([]string, error)

// WidgetDomainVerification verifies that the requesting origin is in the project's allowed domains.
// Must be applied to routes that have {projectId} in the URL (e.g. GET /api/widget/v1/config/{projectId}).
// Checks Origin header first, falls back to Referer.
// localhost and 127.0.0.* are always allowed.
// Returns 403 if the domain is not in the project's domain list.
func WidgetDomainVerification(verifier DomainVerifier, isDev bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin == "" {
				origin = r.Header.Get("Referer")
			}

			requestHost := extractDomainHost(origin)

			// localhost and loopback are always allowed
			if requestHost == "localhost" || strings.HasPrefix(requestHost, "127.0.0.") {
				next.ServeHTTP(w, r)
				return
			}

			// Empty origin (curl, server-side): allow in development only
			if requestHost == "" {
				if isDev {
					next.ServeHTTP(w, r)
					return
				}
				handler.WriteError(w, http.StatusForbidden, "domain_not_allowed", "This domain is not authorized to use this widget")
				return
			}

			projectIDStr := chi.URLParam(r, "projectId")
			if projectIDStr == "" {
				handler.WriteError(w, http.StatusBadRequest, "invalid_request", "Missing project ID")
				return
			}

			domains, err := verifier(r.Context(), projectIDStr)
			if err != nil {
				handler.WriteError(w, http.StatusInternalServerError, "internal_error", "Domain verification failed")
				return
			}
			if domains == nil {
				// Project not found — let downstream handler return proper 404
				next.ServeHTTP(w, r)
				return
			}

			// Check exact match or subdomain wildcard.
			// Registering "example.com" also allows "www.example.com".
			for _, d := range domains {
				if d == requestHost || strings.HasSuffix(requestHost, "."+d) {
					next.ServeHTTP(w, r)
					return
				}
			}

			handler.WriteError(w, http.StatusForbidden, "domain_not_allowed", "This domain is not authorized to use this widget")
		})
	}
}

// extractDomainHost extracts the bare hostname from an Origin or Referer header.
// "https://example.com" → "example.com", "http://localhost:3000" → "localhost".
func extractDomainHost(origin string) string {
	if origin == "" {
		return ""
	}
	parsed, err := url.Parse(origin)
	if err != nil {
		return origin
	}
	host := parsed.Hostname()
	if host == "" {
		return origin
	}
	return host
}
