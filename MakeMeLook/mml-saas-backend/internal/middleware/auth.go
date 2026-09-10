package middleware

import (
	"context"
	"net/http"
	"strings"

	"mml-saas-backend/internal/handler"
	jwtpkg "mml-saas-backend/pkg/jwt"
)

// Auth validates the JWT access token from the Authorization header.
func Auth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				handler.WriteError(w, http.StatusUnauthorized, "unauthorized", "Missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				handler.WriteError(w, http.StatusUnauthorized, "unauthorized", "Invalid authorization format")
				return
			}

			claims, err := jwtpkg.ValidateAccessToken(parts[1], jwtSecret)
			if err != nil {
				handler.WriteError(w, http.StatusUnauthorized, "unauthorized", "Invalid or expired token")
				return
			}

			ctx := context.WithValue(r.Context(), handler.UserIDKey, claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
