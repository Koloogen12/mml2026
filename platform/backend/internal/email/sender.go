package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// Sender — доставка письма. Отдельно от шаблонов: шаблоны тестируются без сети,
// доставка меняется независимо от вёрстки.
type Sender interface {
	Send(ctx context.Context, to string, m Mail) error
}

// Resend — прод-доставка через resend.com.
type Resend struct {
	apiKey string
	from   string // «MakeMeLook <noreply@домен>»; домен обязан быть верифицирован
	http   *http.Client
	log    *slog.Logger
}

func NewResend(apiKey, from string, log *slog.Logger) *Resend {
	if from == "" {
		from = "MakeMeLook <onboarding@resend.dev>" // дефолт до верификации домена
	}
	return &Resend{apiKey: apiKey, from: from, http: &http.Client{Timeout: 10 * time.Second}, log: log}
}

func (r *Resend) Send(ctx context.Context, to string, m Mail) error {
	body, _ := json.Marshal(map[string]any{
		"from":    r.from,
		"to":      []string{to},
		"subject": m.Subject,
		"html":    m.HTML,
		"text":    m.Text, // без text/plain письмо чаще уходит в спам
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+r.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.http.Do(req)
	if err != nil {
		return fmt.Errorf("resend: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("resend: статус %d: %s", resp.StatusCode, string(msg))
	}
	return nil
}

// Log — dev-доставка: пишет письмо в лог и ничего не шлёт.
// Тема письма с кодом содержит сам код — этого хватает, чтобы войти локально.
type Log struct{ Logger *slog.Logger }

func (l Log) Send(_ context.Context, to string, m Mail) error {
	l.Logger.Info("письмо (dev, не отправлено)", "to", to, "subject", m.Subject)
	return nil
}

// Dev — dev-обёртка: всегда пишет письмо в лог (чтобы войти любым адресом, пока
// домен в Resend не верифицирован) и шлёт best-effort, не роняя запрос.
// В проде используется чистый Resend — там ошибка доставки должна быть видна.
type Dev struct {
	Resend *Resend
	Logger *slog.Logger
}

func (d Dev) Send(ctx context.Context, to string, m Mail) error {
	d.Logger.Info("письмо (dev)", "to", to, "subject", m.Subject)
	if d.Resend != nil {
		if err := d.Resend.Send(ctx, to, m); err != nil {
			d.Logger.Warn("resend dev best-effort", "err", err)
		}
	}
	return nil
}
