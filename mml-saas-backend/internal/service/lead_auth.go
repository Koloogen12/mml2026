package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/pkg/logger"
	"mml-saas-backend/pkg/mailer"

	"github.com/google/uuid"
)

var (
	ErrLeadInvalidCode   = errors.New("invalid or expired code")
	ErrCodeCooldown  = errors.New("code was sent recently, please wait")
	ErrInvalidContact = errors.New("invalid contact: must be email or phone")
)

const (
	authCodeLength  = 6
	authCodeTTL     = 10 * time.Minute
	authCodeCooldown = 60 * time.Second
)

// generateAuthCode creates a random N-digit numeric code.
func generateAuthCode(length int) string {
	code := ""
	for i := 0; i < length; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(10))
		code += fmt.Sprintf("%d", n.Int64())
	}
	return code
}

// isEmail checks if the contact looks like an email.
func isEmail(contact string) bool {
	return strings.Contains(contact, "@") && strings.Contains(contact, ".")
}

// SendAuthCode generates a 6-digit code and sends it to the contact (email or phone).
func (s *LeadService) SendAuthCode(ctx context.Context, token uuid.UUID, req *dto.WidgetSendCodeRequest, m *mailer.Mailer) (*dto.WidgetSendCodeResponse, error) {
	lead, err := s.GetLeadByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	contact := strings.TrimSpace(req.Contact)
	if contact == "" {
		return nil, ErrInvalidContact
	}

	// Cooldown check
	if lead.AuthCodeExpiresAt != nil {
		cooldownEnd := lead.AuthCodeExpiresAt.Add(-authCodeTTL + authCodeCooldown)
		if time.Now().Before(cooldownEnd) {
			return nil, ErrCodeCooldown
		}
	}

	// Generate code
	code := generateAuthCode(authCodeLength)
	expiresAt := time.Now().Add(authCodeTTL)

	// Update lead: store contact in the appropriate field
	lead.AuthCode = &code
	lead.AuthCodeExpiresAt = &expiresAt
	if isEmail(contact) {
		lead.Email = &contact
	} else {
		lead.Phone = &contact
	}

	if err := s.repos.Lead.Update(ctx, lead); err != nil {
		return nil, fmt.Errorf("save auth code: %w", err)
	}

	// Send code
	if isEmail(contact) {
		if err := m.SendVerificationCode(contact, code); err != nil {
			logger.Error("lead_auth", "failed to send verification email", "error", err, "contact", contact)
			// Don't fail — code is saved, user can retry
		}
	} else {
		// Phone — log for now, SMS integration TODO
		logger.Info("lead_auth", "SMS code (not implemented yet)", "phone", contact, "code", code)
	}

	return &dto.WidgetSendCodeResponse{
		Success: true,
		Message: "Code sent",
	}, nil
}

// VerifyAuthCode checks the code and marks the session as authenticated.
func (s *LeadService) VerifyAuthCode(ctx context.Context, token uuid.UUID, req *dto.WidgetVerifyCodeRequest) (*dto.WidgetVerifyCodeResponse, error) {
	lead, err := s.GetLeadByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	// Check code
	if lead.AuthCode == nil || lead.AuthCodeExpiresAt == nil {
		return nil, ErrLeadInvalidCode
	}

	if time.Now().After(*lead.AuthCodeExpiresAt) {
		return nil, ErrLeadInvalidCode
	}

	if *lead.AuthCode != strings.TrimSpace(req.Code) {
		return nil, ErrLeadInvalidCode
	}

	// Mark as authenticated
	lead.IsAuthenticated = true
	lead.AuthCode = nil
	lead.AuthCodeExpiresAt = nil
	provider := "code"
	lead.AuthProvider = &provider

	if err := s.repos.Lead.Update(ctx, lead); err != nil {
		return nil, fmt.Errorf("update auth status: %w", err)
	}

	email := ""
	if lead.Email != nil {
		email = *lead.Email
	}
	phone := ""
	if lead.Phone != nil {
		phone = *lead.Phone
	}

	return &dto.WidgetVerifyCodeResponse{
		Success:         true,
		IsAuthenticated: true,
		Email:           email,
		Phone:           phone,
	}, nil
}
