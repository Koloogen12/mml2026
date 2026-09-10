package mailer

import (
	"fmt"
	"net/smtp"

	"mml-saas-backend/pkg/logger"
)

type Mailer struct {
	host     string
	port     int
	user     string
	password string
	from     string
}

func New(host string, port int, user, password, from string) *Mailer {
	return &Mailer{host: host, port: port, user: user, password: password, from: from}
}

func (m *Mailer) SendVerificationCode(to, code string) error {
	subject := "MakeMeLook — Email Verification"
	body := fmt.Sprintf("Your verification code: %s\n\nThis code expires in 15 minutes.", code)
	return m.send(to, subject, body)
}

func (m *Mailer) SendPasswordResetCode(to, code string) error {
	subject := "MakeMeLook — Password Reset"
	body := fmt.Sprintf("Your password reset code: %s\n\nThis code expires in 15 minutes.", code)
	return m.send(to, subject, body)
}

func (m *Mailer) send(to, subject, body string) error {
	// In dev mode without SMTP configured, log the email instead of sending
	if m.host == "" {
		logger.Info("mailer", "SMTP not configured — email logged instead of sent",
			"to", to, "subject", subject, "body", body,
		)
		return nil
	}

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		m.from, to, subject, body,
	)

	addr := fmt.Sprintf("%s:%d", m.host, m.port)
	auth := smtp.PlainAuth("", m.user, m.password, m.host)
	if err := smtp.SendMail(addr, auth, m.from, []string{to}, []byte(msg)); err != nil {
		logger.Error("mailer", "Failed to send email", "to", to, "subject", subject, "error", err)
		return err
	}
	return nil
}
