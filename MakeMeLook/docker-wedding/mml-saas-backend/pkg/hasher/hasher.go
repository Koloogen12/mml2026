package hasher

import (
	"mml-saas-backend/pkg/logger"

	"golang.org/x/crypto/bcrypt"
)

const cost = 12

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), cost)
	return string(bytes), logger.LogError(err)
}

func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
