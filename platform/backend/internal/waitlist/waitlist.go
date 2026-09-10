// Package waitlist — лист ожидания с главной страницы: приём заявки по почте и
// счётчик для соцдоказательства.
//
// База счётчика (base) — продуктовое решение владельца, не техническое: реальных
// заявок пока единицы, показываемое число = base + фактические. Число живое —
// растёт после каждой заявки, — но точкой отсчёта служит base.
package waitlist

import (
	"context"
	"errors"
	"net/mail"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
	base int64
}

func NewStore(pool *pgxpool.Pool, base int64) *Store {
	return &Store{pool: pool, base: base}
}

var ErrBadEmail = errors.New("нужна корректная почта")

// Join регистрирует заявку и возвращает номер в очереди.
// Идемпотентна: та же почта → та же позиция, без новой строки.
func (s *Store) Join(ctx context.Context, email, ip string) (int64, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if _, err := mail.ParseAddress(email); err != nil {
		return 0, ErrBadEmail
	}

	var id int64
	// DO UPDATE вместо DO NOTHING: только он возвращает строку при конфликте,
	// иначе повторная заявка получила бы пустой результат вместо своей позиции.
	if err := s.pool.QueryRow(ctx, `
		INSERT INTO waitlist_signups (email, ip) VALUES ($1, $2)
		ON CONFLICT (lower(email)) DO UPDATE SET email = EXCLUDED.email
		RETURNING id`, email, ip).Scan(&id); err != nil {
		return 0, err
	}

	// Позиция — ранг среди всех заявок, а не id: id дырявится откатами вставок.
	var rank int64
	if err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM waitlist_signups WHERE id <= $1`, id).Scan(&rank); err != nil {
		return 0, err
	}
	return s.base + rank, nil
}

// Count — сколько показывать на главной.
func (s *Store) Count(ctx context.Context) (int64, error) {
	var n int64
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM waitlist_signups`).Scan(&n); err != nil {
		return 0, err
	}
	return s.base + n, nil
}
