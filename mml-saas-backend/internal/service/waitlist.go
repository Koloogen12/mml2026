package service

import (
	"errors"
	"regexp"
	"time"

	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
)

// ErrInvalidPhone is returned when the submitted phone fails validation.
var ErrInvalidPhone = errors.New("invalid phone")

var nonDigit = regexp.MustCompile(`\D`)

type WaitlistService struct {
	repos   *repository.Repositories
	basePos int64
}

func NewWaitlist(repos *repository.Repositories, basePos int64) *WaitlistService {
	return &WaitlistService{repos: repos, basePos: basePos}
}

// Signup validates and stores a phone, returning the displayed queue position
// (basePos + rank). Re-submitting an existing phone is idempotent.
func (s *WaitlistService) Signup(phone, ip, userAgent string) (int64, error) {
	digits := nonDigit.ReplaceAllString(phone, "")
	if len(digits) < 10 || len(digits) > 15 {
		return 0, ErrInvalidPhone
	}
	rec := &model.WaitlistSignup{
		Phone:     "+" + digits,
		Source:    "makemelook_ai",
		IP:        ip,
		UserAgent: truncateStr(userAgent, 512),
		CreatedAt: time.Now(),
	}
	if _, err := s.repos.WaitlistSignup.Upsert(rec); err != nil {
		return 0, err
	}
	rank, err := s.repos.WaitlistSignup.Position(rec.ID)
	if err != nil {
		return 0, err
	}
	return s.basePos + rank, nil
}

func truncateStr(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}
