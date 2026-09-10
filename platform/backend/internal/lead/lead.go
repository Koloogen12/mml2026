// Package lead — автопереходы статуса лида в концьерж-воронке.
// Статус двигается ТОЛЬКО вперёд по ранжиру: реальное событие (диалог, подборка,
// клик в магазин, покупка) не должно откатывать более поздний статус.
// 'churned' вне прогрессии — авто-переходы его не трогают и от него не двигают.
package lead

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	StatusNew           = "new"
	StatusInDialog      = "in_dialog"
	StatusSentSelection = "sent_selection"
	StatusClicked       = "clicked"
	StatusPurchased     = "purchased"
)

// ladder — порядок прогрессии для сравнения рангов в SQL.
const ladder = `ARRAY['new','in_dialog','sent_selection','clicked','purchased']`

// advance двигает пользователя к status, только если его текущий статус раньше по
// лестнице. Пользователь резолвится подзапросом userExpr (даёт один user_id).
func advance(ctx context.Context, pool *pgxpool.Pool, userExpr, status string, arg any) {
	// nolint: сравнение рангов; NULL-ранг (напр. 'churned') → нет апдейта.
	_, _ = pool.Exec(ctx, `
		UPDATE users SET lead_status = $1, last_action_at = now(), updated_at = now()
		WHERE id = (`+userExpr+`)
		  AND array_position(`+ladder+`, lead_status)
		      < array_position(`+ladder+`, $1)`, status, arg)
}

// BySession — статус пользователя владельца сессии (чат: диалог/подборка).
func BySession(ctx context.Context, pool *pgxpool.Pool, sessionID int64, status string) {
	advance(ctx, pool, `SELECT user_id FROM chat_sessions WHERE id = $2`, status, sessionID)
}

// ByClick — пользователь, чья сессия породила клик (postback покупки).
func ByClick(ctx context.Context, pool *pgxpool.Pool, clickID string, status string) {
	advance(ctx, pool,
		`SELECT cs.user_id FROM clicks c JOIN chat_sessions cs ON cs.id = c.session_id WHERE c.click_id = $2`,
		status, clickID)
}
