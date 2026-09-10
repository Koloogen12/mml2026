// Package admin — внутренняя админка (фаза 1). Рабочий инструмент команды:
// плотно, быстро, честно. Ролей нет — все видят всё; гейт по одному токену.
package admin

import (
	"crypto/subtle"
	"net/http"
)

// Gate требует X-Admin-Token, равный настроенному. Пустой токен в конфиге →
// гейт открыт (локальный dev). В проде токен обязателен.
func Gate(token string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if token != "" {
				got := r.Header.Get("X-Admin-Token")
				if subtle.ConstantTimeCompare([]byte(got), []byte(token)) != 1 {
					writeErr(w, http.StatusUnauthorized, "нужен X-Admin-Token")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// actor — кто действует (для аудита). В фазе 1 берём из заголовка, без строгой
// аутентификации; по умолчанию «operator».
func actor(r *http.Request) string {
	if a := r.Header.Get("X-Admin-Actor"); a != "" {
		return a
	}
	return "operator"
}
