// Package auth — вход по одноразовому email-коду + JWT-сессии.
// SMS сознательно не реализуем (решение Данила): email-вход надёжнее и уже
// проверен в виджете. Коды в проде уходят письмом; в dev — пишутся в лог.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"

	"math/big"
	mailer "mml-platform-backend/internal/email"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const (
	codeTTL       = 10 * time.Minute
	refreshTTL    = 30 * 24 * time.Hour
	maxCodeTries  = 5
	resendCooldwn = 45 * time.Second
)

var (
	ErrCooldown   = errors.New("код уже отправлен, подождите немного")
	ErrBadCode    = errors.New("неверный или просроченный код")
	ErrTooMany    = errors.New("слишком много попыток")
	ErrBadRefresh = errors.New("сессия недействительна")
)

// Emailer — доставка письма. Живёт в internal/email вместе с шаблонами; здесь
// только псевдоним, чтобы не тянуть пакет во все точки вызова.
type Emailer = mailer.Sender

type Service struct {
	pool      *pgxpool.Pool
	jwtSecret []byte
	mail      Emailer
	frontURL  string // куда вести человека из письма
	log       *slog.Logger
}

func NewService(pool *pgxpool.Pool, jwtSecret string, mail Emailer, frontURL string, log *slog.Logger) *Service {
	return &Service{pool: pool, jwtSecret: []byte(jwtSecret), mail: mail,
		frontURL: strings.TrimRight(frontURL, "/"), log: log}
}

// sendAsync шлёт письмо в фоне: приветствие не должно задерживать вход и не
// должно ронять его, если Resend лежит. Свой контекст — родительский умрёт
// вместе с HTTP-запросом.
func (s *Service) sendAsync(to string, m mailer.Mail) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := s.mail.Send(ctx, to, m); err != nil {
			s.log.Warn("письмо не ушло", "to", to, "subject", m.Subject, "err", err)
		}
	}()
}

// SendAsync — фоновая отправка письма для пакетов, у которых своей доставки нет
// (партнёр, паспорт). Транспорт один на всё приложение.
func (s *Service) SendAsync(to string, m mailer.Mail) { s.sendAsync(to, m) }

// FrontURL — origin, на который ведут ссылки из писем (без хвостового слэша).
func (s *Service) FrontURL() string { return s.frontURL }

// welcomeIfNew — приветствие ровно один раз: на первом входе, каким бы способом
// он ни случился (код или OAuth — оба пути ведут сюда через VerifyResult).
func (s *Service) welcomeIfNew(res *VerifyResult) {
	if res != nil && res.IsNew {
		s.sendAsync(res.Email, mailer.Welcome("", s.frontURL+"/app/"))
	}
}

// RequestCode генерит 6-значный код, хеширует, шлёт email.
// partner=true → письмо про кабинет партнёра (шаблон P1), иначе покупательский U1.
func (s *Service) RequestCode(ctx context.Context, email string, partner bool) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if !strings.Contains(email, "@") {
		return errors.New("некорректный email")
	}

	// Кулдаун на повторную отправку.
	var lastAt time.Time
	err := s.pool.QueryRow(ctx,
		`SELECT created_at FROM email_codes WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
		email).Scan(&lastAt)
	if err == nil && time.Since(lastAt) < resendCooldwn {
		return ErrCooldown
	}

	code := sixDigits()
	hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err := s.pool.Exec(ctx,
		`INSERT INTO email_codes (email, code_hash, expires_at) VALUES ($1, $2, $3)`,
		email, string(hash), time.Now().Add(codeTTL)); err != nil {
		return err
	}
	return s.mail.Send(ctx, email, mailer.LoginCode(code, partner))
}

// ConsumeCode проверяет и гасит одноразовый код (entity-agnostic: годится и
// для пользователя, и для партнёра — таблица email_codes общая).
func (s *Service) ConsumeCode(ctx context.Context, email, code string) error {
	var (
		id       int64
		hash     string
		expires  time.Time
		consumed *time.Time
		attempts int
	)
	err := s.pool.QueryRow(ctx, `
		SELECT id, code_hash, expires_at, consumed_at, attempts
		FROM email_codes WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
		email).Scan(&id, &hash, &expires, &consumed, &attempts)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrBadCode
	}
	if err != nil {
		return err
	}
	if consumed != nil || time.Now().After(expires) {
		return ErrBadCode
	}
	if attempts >= maxCodeTries {
		return ErrTooMany
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(code)) != nil {
		_, _ = s.pool.Exec(ctx, `UPDATE email_codes SET attempts = attempts + 1 WHERE id = $1`, id)
		return ErrBadCode
	}
	_, _ = s.pool.Exec(ctx, `UPDATE email_codes SET consumed_at = now() WHERE id = $1`, id)
	return nil
}

// VerifyResult — что возвращаем после успешного входа.
type VerifyResult struct {
	AccessToken  string
	RefreshToken string
	UserID       int64
	UserPublicID string
	Email        string
	IsNew        bool
}

// VerifyCode сверяет код, апсертит пользователя, выдаёт токены.
func (s *Service) VerifyCode(ctx context.Context, email, code, userAgent string) (*VerifyResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	if err := s.ConsumeCode(ctx, email, code); err != nil {
		return nil, err
	}

	// Апсерт пользователя.
	var userID int64
	var userPublicID string
	var createdAt, updatedAt time.Time
	if err := s.pool.QueryRow(ctx, `
		INSERT INTO users (email) VALUES ($1)
		ON CONFLICT (email) DO UPDATE SET updated_at = now()
		RETURNING id, public_id, created_at, updated_at`,
		email).Scan(&userID, &userPublicID, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	isNew := createdAt.Equal(updatedAt)

	refresh, err := s.issueRefresh(ctx, userID, userAgent)
	if err != nil {
		return nil, err
	}
	access, err := s.signAccess(userID, userPublicID)
	if err != nil {
		return nil, err
	}

	res := &VerifyResult{
		AccessToken:  access,
		RefreshToken: refresh,
		UserID:       userID,
		UserPublicID: userPublicID,
		Email:        email,
		IsNew:        isNew,
	}
	s.welcomeIfNew(res)
	return res, nil
}

// Refresh обменивает refresh-токен на свежий access (refresh остаётся).
func (s *Service) Refresh(ctx context.Context, refreshToken string) (string, error) {
	h := hashToken(refreshToken)
	var userID int64
	var userPublicID string
	err := s.pool.QueryRow(ctx, `
		SELECT s.user_id, u.public_id FROM auth_sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.refresh_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
		h).Scan(&userID, &userPublicID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrBadRefresh
	}
	if err != nil {
		return "", err
	}
	return s.signAccess(userID, userPublicID)
}

func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE auth_sessions SET revoked_at = now() WHERE refresh_hash = $1`,
		hashToken(refreshToken))
	return err
}

// SignInWithEmail — завести/найти пользователя по подтверждённой почте и выдать
// сессию. Почту к этому моменту уже подтвердил кто-то, кому мы доверяем:
// email-код (VerifyCode) или OAuth-провайдер. Один путь сессии для обоих.
func (s *Service) SignInWithEmail(ctx context.Context, email, userAgent string) (*VerifyResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, errors.New("пустая почта")
	}
	var userID int64
	var userPublicID string
	var createdAt, updatedAt time.Time
	if err := s.pool.QueryRow(ctx, `
		INSERT INTO users (email) VALUES ($1)
		ON CONFLICT (email) DO UPDATE SET updated_at = now()
		RETURNING id, public_id, created_at, updated_at`,
		email).Scan(&userID, &userPublicID, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	refresh, err := s.issueRefresh(ctx, userID, userAgent)
	if err != nil {
		return nil, err
	}
	access, err := s.signAccess(userID, userPublicID)
	if err != nil {
		return nil, err
	}
	res := &VerifyResult{
		AccessToken: access, RefreshToken: refresh, UserID: userID,
		UserPublicID: userPublicID, Email: email, IsNew: createdAt.Equal(updatedAt),
	}
	s.welcomeIfNew(res)
	return res, nil
}

// DisplayName — имя пользователя для приветствия ("" если не задано).
// Profile — то, что показываем в шапке и кабинете.
func (s *Service) Profile(ctx context.Context, userPublicID string) (name, avatar string) {
	var n *string
	var a string
	_ = s.pool.QueryRow(ctx,
		`SELECT display_name, COALESCE(avatar_url, '') FROM users WHERE public_id = $1`,
		userPublicID).Scan(&n, &a)
	if n != nil {
		name = *n
	}
	return name, a
}

// SetAvatar сохраняет ссылку на загруженный файл. Пустая строка — снять аватар.
func (s *Service) SetAvatar(ctx context.Context, userPublicID, url string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET avatar_url = $2, updated_at = now() WHERE public_id = $1`,
		userPublicID, url)
	return err
}

func (s *Service) DisplayName(ctx context.Context, userPublicID string) string {
	var name *string
	_ = s.pool.QueryRow(ctx,
		`SELECT display_name FROM users WHERE public_id = $1`, userPublicID).Scan(&name)
	if name == nil {
		return ""
	}
	return *name
}

func (s *Service) issueRefresh(ctx context.Context, userID int64, userAgent string) (string, error) {
	raw := randomToken()
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO auth_sessions (user_id, refresh_hash, user_agent, expires_at)
		VALUES ($1, $2, $3, $4)`,
		userID, hashToken(raw), truncate(userAgent, 512), time.Now().Add(refreshTTL)); err != nil {
		return "", err
	}
	return raw, nil
}

func sixDigits() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(1_000_000))
	return fmt.Sprintf("%06d", n.Int64())
}

func randomToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func hashToken(t string) string {
	sum := sha256.Sum256([]byte(t))
	return hex.EncodeToString(sum[:])
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}
