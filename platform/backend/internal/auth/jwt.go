package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const accessTTL = 15 * time.Minute

type Claims struct {
	UserID       int64  `json:"uid"`
	UserPublicID string `json:"upid"`
	jwt.RegisteredClaims
}

func (s *Service) signAccess(userID int64, userPublicID string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:       userID,
		UserPublicID: userPublicID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
}

// SignAccess — публичная обёртка над signAccess: партнёрский пакет выдаёт
// access-токен той же подписью (id/publicID трактуются как партнёрские).
func (s *Service) SignAccess(id int64, publicID string) (string, error) {
	return s.signAccess(id, publicID)
}

// ParseAccess проверяет подпись и срок; возвращает claims или ошибку.
func (s *Service) ParseAccess(token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("неверный метод подписи")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("невалидный токен")
	}
	return claims, nil
}
