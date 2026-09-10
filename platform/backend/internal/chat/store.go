package chat

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"mml-platform-backend/internal/lead"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

type StoredMessage struct {
	Role       string
	Content    string
	ProductIDs []string
}

// EnsureSession возвращает внутренний id сессии по публичному UUID,
// создавая новую, если UUID пуст или не найден. userID (>0) привязывает
// сессию к вошедшему пользователю — в т.ч. дозаполняет анонимную при входе.
func (s *Store) EnsureSession(ctx context.Context, publicID string, userID int64) (int64, string, error) {
	if publicID != "" {
		var id int64
		err := s.pool.QueryRow(ctx,
			`SELECT id FROM chat_sessions WHERE public_id = $1`, publicID).Scan(&id)
		if err == nil {
			if userID > 0 {
				_, _ = s.pool.Exec(ctx,
					`UPDATE chat_sessions SET user_id = $1 WHERE id = $2 AND user_id IS NULL`, userID, id)
			}
			return id, publicID, nil
		}
	}
	var id int64
	var pub string
	err := s.pool.QueryRow(ctx,
		`INSERT INTO chat_sessions (user_id) VALUES (NULLIF($1,0)) RETURNING id, public_id`,
		userID).Scan(&id, &pub)
	return id, pub, err
}

func (s *Store) History(ctx context.Context, sessionID int64, limit int) ([]StoredMessage, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT role, content, product_ids::text[] FROM (
			SELECT id, role, content, product_ids FROM chat_messages
			WHERE session_id = $1 ORDER BY id DESC LIMIT $2
		) t ORDER BY id`, sessionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []StoredMessage
	for rows.Next() {
		var m StoredMessage
		if err := rows.Scan(&m.Role, &m.Content, &m.ProductIDs); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) Append(ctx context.Context, sessionID int64, role, content string, productIDs []string) error {
	if productIDs == nil {
		productIDs = []string{}
	}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO chat_messages (session_id, role, content, product_ids)
		VALUES ($1, $2, $3, $4::uuid[])`, sessionID, role, content, productIDs)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE chat_sessions SET updated_at = now() WHERE id = $1`, sessionID)
	if err != nil {
		return err
	}

	// Автопереход статуса лида: пользователь пишет → «в диалоге»; ИИ прислал
	// подборку → «отправили подборку». Двигает только вперёд.
	switch {
	case role == "assistant" && len(productIDs) > 0:
		lead.BySession(ctx, s.pool, sessionID, lead.StatusSentSelection)
	case role == "user":
		lead.BySession(ctx, s.pool, sessionID, lead.StatusInDialog)
	}
	return nil
}
