package validator

import (
	"unicode"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// Struct validates a struct using go-playground/validator tags.
func Struct(s any) error {
	return validate.Struct(s)
}

// Password checks that a password has at least 8 chars, 1 uppercase letter, and 1 digit.
func Password(password string) bool {
	if len(password) < 8 {
		return false
	}
	var hasUpper, hasDigit bool
	for _, c := range password {
		if unicode.IsUpper(c) {
			hasUpper = true
		}
		if unicode.IsDigit(c) {
			hasDigit = true
		}
	}
	return hasUpper && hasDigit
}
