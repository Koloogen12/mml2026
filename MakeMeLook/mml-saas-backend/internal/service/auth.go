package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"

	"mml-saas-backend/internal/config"
	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/hasher"
	jwtpkg "mml-saas-backend/pkg/jwt"
	"mml-saas-backend/pkg/logger"
	"mml-saas-backend/pkg/mailer"
	"mml-saas-backend/pkg/validator"
)

var (
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrAccountNotActive   = errors.New("account not verified")
	ErrInvalidCode        = errors.New("invalid or expired code")
	ErrRateLimited        = errors.New("too many attempts, try again later")
	ErrWeakPassword       = errors.New("password must be at least 8 characters with 1 uppercase letter and 1 digit")
	ErrSessionNotFound    = errors.New("session not found")
	ErrSessionExpired     = errors.New("session expired")
	ErrResendCooldown     = errors.New("please wait before requesting a new code")
	ErrUserNotFound       = errors.New("user not found")
)

// SessionResult holds the auth response and the raw refresh token for cookie setting.
type SessionResult struct {
	Response     *dto.AuthResponse
	RefreshToken string
}

type AuthService struct {
	repos   *repository.Repositories
	cfg     *config.Config
	mailer  *mailer.Mailer
	limiter *loginLimiter
}

func NewAuth(repos *repository.Repositories, cfg *config.Config, mlr *mailer.Mailer) *AuthService {
	return &AuthService{
		repos:   repos,
		cfg:     cfg,
		mailer:  mlr,
		limiter: newLoginLimiter(cfg.AuthMaxLoginAttempts, time.Duration(cfg.AuthLoginLimitWindowMin)*time.Minute),
	}
}

// Register creates a new user, sends a verification code, and creates a session (auto-login).
func (s *AuthService) Register(ctx context.Context, req dto.RegisterRequest, ip, userAgent string) (*SessionResult, error) {
	if !validator.Password(req.Password) {
		return nil, ErrWeakPassword
	}

	existing, err := s.repos.User.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("check email: %w", err)
	}
	if existing != nil {
		return nil, ErrEmailTaken
	}

	hash, err := hasher.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &model.User{
		Email:        req.Email,
		Name:         req.Name,
		PasswordHash: hash,
		Status:       model.UserStatusPendingVerification,
	}
	if err := s.repos.User.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	if err := s.sendVerificationCode(ctx, user.ID, req.Email); err != nil {
		return nil, err
	}

	return s.createSession(ctx, user, ip, userAgent)
}

// VerifyEmail checks the code, activates the account, and creates a session (auto-login).
func (s *AuthService) VerifyEmail(ctx context.Context, req dto.VerifyEmailRequest, ip, userAgent string) (*SessionResult, error) {
	user, err := s.repos.User.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return nil, ErrInvalidCode
	}

	ev, err := s.repos.EmailVerification.GetLatestByUserID(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("get verification: %w", err)
	}
	if ev == nil {
		return nil, ErrInvalidCode
	}

	if ev.Code != req.Code || ev.IsExpired() {
		return nil, ErrInvalidCode
	}

	var result *SessionResult
	err = s.repos.Transaction(func(tx *repository.Repositories) error {
		if err := tx.EmailVerification.MarkVerified(ctx, ev.ID); err != nil {
			return fmt.Errorf("mark verified: %w", err)
		}
		if err := tx.User.UpdateStatus(ctx, user.ID, model.UserStatusActive); err != nil {
			return fmt.Errorf("activate user: %w", err)
		}
		user.Status = model.UserStatusActive
		result, err = s.createSessionTx(ctx, tx, user, ip, userAgent)
		return err
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// Login authenticates a user and creates a session.
func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest, ip, userAgent string) (*SessionResult, error) {
	if s.limiter.isLimited(req.Email) {
		return nil, ErrRateLimited
	}

	user, err := s.repos.User.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return nil, ErrInvalidCredentials
	}

	if !hasher.CheckPassword(req.Password, user.PasswordHash) {
		s.limiter.record(req.Email)
		return nil, ErrInvalidCredentials
	}

	s.limiter.reset(req.Email)

	// For pending users: send a new verification code (respecting cooldown)
	if user.IsPendingVerification() {
		s.sendVerificationCodeWithCooldown(ctx, user.ID, req.Email)
	}

	return s.createSession(ctx, user, ip, userAgent)
}

// Logout invalidates the session identified by the refresh token.
func (s *AuthService) Logout(ctx context.Context, refreshToken string) {
	session, err := s.repos.AuthSession.GetByRefreshToken(ctx, refreshToken)
	if err != nil || session == nil {
		return
	}
	logger.LogError(s.repos.AuthSession.SoftDelete(ctx, session.ID))
}

// Refresh validates the refresh token and returns a new access token.
func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*dto.AuthResponse, error) {
	session, err := s.repos.AuthSession.GetByRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	if session == nil {
		return nil, ErrSessionNotFound
	}

	if session.IsExpired() {
		return nil, ErrSessionExpired
	}

	user, err := s.repos.User.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return nil, ErrSessionNotFound
	}

	accessToken, expiresAt, err := jwtpkg.GenerateAccessToken(user.ID, s.cfg.JWTSecret, s.cfg.JWTAccessExpMinutes)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	logger.LogError(s.repos.AuthSession.UpdateLastActivity(ctx, session.ID))

	return &dto.AuthResponse{
		AccessToken: accessToken,
		ExpiresAt:   expiresAt,
		User:        userToDTO(user),
	}, nil
}

// ResendVerification sends a new verification code with cooldown check.
func (s *AuthService) ResendVerification(ctx context.Context, req dto.ResendVerificationRequest) error {
	user, err := s.repos.User.GetByEmail(ctx, req.Email)
	if err != nil {
		return err
	}
	if user == nil || !user.IsPendingVerification() {
		return nil
	}

	return s.sendVerificationCodeWithCooldown(ctx, user.ID, req.Email)
}

// GetMe returns user info with verification cooldown for pending users.
func (s *AuthService) GetMe(ctx context.Context, userID int) (*dto.MeResponse, error) {
	user, err := s.repos.User.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	resp := &dto.MeResponse{
		ID:     user.ID,
		Email:  user.Email,
		Name:   user.Name,
		Status: string(user.Status),
	}

	if user.IsPendingVerification() {
		resp.VerificationCooldown = s.getVerificationCooldown(ctx, user.ID)
	}

	return resp, nil
}

// PasswordReset generates and sends a password reset code.
func (s *AuthService) PasswordReset(ctx context.Context, req dto.PasswordResetRequest) error {
	user, err := s.repos.User.GetByEmail(ctx, req.Email)
	if err != nil {
		return err
	}
	if user == nil {
		return nil
	}

	pr := &model.PasswordReset{
		UserID:    user.ID,
		Code:      generateCode(),
		ExpiresAt: time.Now().Add(15 * time.Minute),
	}
	if err := s.repos.PasswordReset.Create(ctx, pr); err != nil {
		return fmt.Errorf("create password reset: %w", err)
	}

	if err := s.mailer.SendPasswordResetCode(req.Email, pr.Code); err != nil {
		return fmt.Errorf("send reset email: %w", err)
	}
	return nil
}

// PasswordResetVerify checks that the code is valid (without consuming it).
func (s *AuthService) PasswordResetVerify(ctx context.Context, req dto.PasswordResetVerifyRequest) error {
	user, err := s.repos.User.GetByEmail(ctx, req.Email)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return ErrInvalidCode
	}

	pr, err := s.repos.PasswordReset.GetLatestByUserID(ctx, user.ID)
	if err != nil {
		return fmt.Errorf("get password reset: %w", err)
	}
	if pr == nil {
		return ErrInvalidCode
	}

	if pr.Code != req.Code || pr.IsExpired() {
		return ErrInvalidCode
	}
	return nil
}

// PasswordResetComplete sets the new password and creates a session (auto-login).
func (s *AuthService) PasswordResetComplete(ctx context.Context, req dto.PasswordResetCompleteRequest, ip, userAgent string) (*SessionResult, error) {
	if !validator.Password(req.Password) {
		return nil, ErrWeakPassword
	}

	user, err := s.repos.User.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	if user == nil {
		return nil, ErrInvalidCode
	}

	pr, err := s.repos.PasswordReset.GetLatestByUserID(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("get password reset: %w", err)
	}
	if pr == nil {
		return nil, ErrInvalidCode
	}

	if pr.Code != req.Code || pr.IsExpired() {
		return nil, ErrInvalidCode
	}

	hash, err := hasher.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	var result *SessionResult
	err = s.repos.Transaction(func(tx *repository.Repositories) error {
		if err := tx.PasswordReset.MarkUsed(ctx, pr.ID); err != nil {
			return fmt.Errorf("mark used: %w", err)
		}
		if err := tx.User.UpdatePassword(ctx, user.ID, hash); err != nil {
			return fmt.Errorf("update password: %w", err)
		}
		if user.IsPendingVerification() {
			if err := tx.User.UpdateStatus(ctx, user.ID, model.UserStatusActive); err != nil {
				return fmt.Errorf("activate user: %w", err)
			}
			user.Status = model.UserStatusActive
		}
		if err := tx.AuthSession.SoftDeleteByUserID(ctx, user.ID); err != nil {
			return fmt.Errorf("revoke sessions: %w", err)
		}
		result, err = s.createSessionTx(ctx, tx, user, ip, userAgent)
		return err
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// --- Internal helpers ---

func (s *AuthService) createSession(ctx context.Context, user *model.User, ip, userAgent string) (*SessionResult, error) {
	return s.createSessionTx(ctx, s.repos, user, ip, userAgent)
}

func (s *AuthService) createSessionTx(ctx context.Context, repos *repository.Repositories, user *model.User, ip, userAgent string) (*SessionResult, error) {
	accessToken, expiresAt, err := jwtpkg.GenerateAccessToken(user.ID, s.cfg.JWTSecret, s.cfg.JWTAccessExpMinutes)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	refreshToken, err := generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}

	session := &model.AuthSession{
		UserID:           user.ID,
		IP:               &ip,
		UserAgent:        &userAgent,
		RefreshToken:     refreshToken,
		RefreshExpiresAt: time.Now().Add(time.Duration(s.cfg.JWTRefreshExpDays) * 24 * time.Hour),
	}
	if err := repos.AuthSession.Create(ctx, session); err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}

	return &SessionResult{
		Response: &dto.AuthResponse{
			AccessToken: accessToken,
			ExpiresAt:   expiresAt,
			User:        userToDTO(user),
		},
		RefreshToken: refreshToken,
	}, nil
}

func (s *AuthService) sendVerificationCodeWithCooldown(ctx context.Context, userID int, email string) error {
	ev, err := s.repos.EmailVerification.GetLatestByUserID(ctx, userID)
	if err != nil {
		return fmt.Errorf("get verification: %w", err)
	}
	if ev != nil && time.Since(ev.CreatedAt) < time.Duration(s.cfg.AuthResendCooldownSec)*time.Second {
		return ErrResendCooldown
	}
	return s.sendVerificationCode(ctx, userID, email)
}

func (s *AuthService) getVerificationCooldown(ctx context.Context, userID int) int {
	ev, err := s.repos.EmailVerification.GetLatestByUserID(ctx, userID)
	if err != nil || ev == nil {
		return 0
	}
	remaining := time.Duration(s.cfg.AuthResendCooldownSec)*time.Second - time.Since(ev.CreatedAt)
	if remaining <= 0 {
		return 0
	}
	return int(remaining.Seconds())
}

func (s *AuthService) sendVerificationCode(ctx context.Context, userID int, email string) error {
	code := generateCode()
	ev := &model.EmailVerification{
		UserID:    userID,
		Code:      code,
		ExpiresAt: time.Now().Add(15 * time.Minute),
	}
	if err := s.repos.EmailVerification.Create(ctx, ev); err != nil {
		return fmt.Errorf("create verification: %w", err)
	}
	if err := s.mailer.SendVerificationCode(email, code); err != nil {
		return fmt.Errorf("send verification email: %w", err)
	}
	return nil
}

func userToDTO(user *model.User) dto.UserResponse {
	return dto.UserResponse{
		ID:     user.ID,
		Email:  user.Email,
		Name:   user.Name,
		Status: string(user.Status),
	}
}

func generateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", logger.LogError(err)
	}
	return hex.EncodeToString(b), nil
}

func generateCode() string {
	b := make([]byte, 3)
	_, err := rand.Read(b)
	logger.LogError(err)
	n := int(b[0])<<16 | int(b[1])<<8 | int(b[2])
	return fmt.Sprintf("%06d", n%1000000)
}

// --- Login rate limiter (in-memory) ---

type loginLimiter struct {
	mu          sync.Mutex
	attempts    map[string][]time.Time
	maxAttempts int
	window      time.Duration
}

func newLoginLimiter(maxAttempts int, window time.Duration) *loginLimiter {
	l := &loginLimiter{
		attempts:    make(map[string][]time.Time),
		maxAttempts: maxAttempts,
		window:      window,
	}
	go l.cleanup()
	return l
}

func (l *loginLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		l.mu.Lock()
		cutoff := time.Now().Add(-l.window)
		for email, times := range l.attempts {
			valid := times[:0]
			for _, t := range times {
				if t.After(cutoff) {
					valid = append(valid, t)
				}
			}
			if len(valid) == 0 {
				delete(l.attempts, email)
			} else {
				l.attempts[email] = valid
			}
		}
		l.mu.Unlock()
	}
}

func (l *loginLimiter) isLimited(email string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	cutoff := time.Now().Add(-l.window)
	valid := l.attempts[email][:0]
	for _, t := range l.attempts[email] {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	l.attempts[email] = valid

	return len(valid) >= l.maxAttempts
}

func (l *loginLimiter) record(email string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.attempts[email] = append(l.attempts[email], time.Now())
}

func (l *loginLimiter) reset(email string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, email)
}
