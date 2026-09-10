package jwt

import (
	"errors"
	"fmt"
	"time"

	"mml-saas-backend/pkg/logger"

	jwtgo "github.com/golang-jwt/jwt/v5"
)

var ErrInvalidClaims = errors.New("invalid token claims")

type Claims struct {
	UserID int `json:"user_id"`
	jwtgo.RegisteredClaims
}

func GenerateAccessToken(userID int, secret string, expMinutes int) (string, time.Time, error) {
	expiresAt := time.Now().Add(time.Duration(expMinutes) * time.Minute)
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwtgo.RegisteredClaims{
			ExpiresAt: jwtgo.NewNumericDate(expiresAt),
			IssuedAt:  jwtgo.NewNumericDate(time.Now()),
		},
	}
	token := jwtgo.NewWithClaims(jwtgo.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", time.Time{}, logger.LogError(err)
	}
	return signed, expiresAt, nil
}

func ValidateAccessToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwtgo.ParseWithClaims(tokenStr, &Claims{}, func(t *jwtgo.Token) (any, error) {
		if _, ok := t.Method.(*jwtgo.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}
	return claims, nil
}
