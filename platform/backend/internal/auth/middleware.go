package auth

import (
	"context"
	"net/http"
	"strings"
)

type ctxKey int

const userKey ctxKey = 0

// Optional извлекает пользователя из Bearer-токена, если он есть и валиден.
// Не блокирует анонимов — гость пользуется чатом без входа.
func (s *Service) Optional(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c := s.claimsFromHeader(r); c != nil {
			r = r.WithContext(context.WithValue(r.Context(), userKey, c))
		}
		next.ServeHTTP(w, r)
	})
}

// Required возвращает 401 без валидного токена.
func (s *Service) Required(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c := s.claimsFromHeader(r)
		if c == nil {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"нужен вход"}`))
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userKey, c)))
	})
}

func (s *Service) claimsFromHeader(r *http.Request) *Claims {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return nil
	}
	c, err := s.ParseAccess(strings.TrimPrefix(h, "Bearer "))
	if err != nil {
		return nil
	}
	return c
}

// UserFrom достаёт claims из контекста запроса (nil для гостя).
func UserFrom(ctx context.Context) *Claims {
	c, _ := ctx.Value(userKey).(*Claims)
	return c
}
