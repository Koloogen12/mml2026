// Package cpa — переходы в магазины партнёров и атрибуция.
//
// Каждый переход получает click_id + HMAC-подпись. Подпись делает click_id
// непередделываемым: партнёрский postback с чужим/выдуманным click_id
// отсеивается проверкой подписи, а не доверием.
package cpa

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"net/url"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"mml-platform-backend/internal/lead"
)

type Handler struct {
	pool   *pgxpool.Pool
	secret []byte
	// onConversion — необязательный хук после подтверждённой продажи (фидбек-
	// петля паспорта). Инъектируется роутером, чтобы cpa не зависел от passport.
	onConversion func(ctx context.Context, clickID string)
}

func NewHandler(pool *pgxpool.Pool, signingSecret string) *Handler {
	return &Handler{pool: pool, secret: []byte(signingSecret)}
}

// OnConversion регистрирует хук, вызываемый после непустой (не rejected)
// конверсии. Вызов асинхронный — вебхук партнёра не ждёт нашу обработку.
func (h *Handler) OnConversion(fn func(ctx context.Context, clickID string)) {
	h.onConversion = fn
}

// Redirect — GET /r/{productPublicID}?offer={retailer_slug}&sid={chat session public id}
//
// Пишет клик в журнал и уводит покупателя на витрину партнёра,
// добавив mml_click={click_id}.{signature} к deeplink.
func (h *Handler) Redirect(w http.ResponseWriter, r *http.Request) {
	productPublicID := chi.URLParam(r, "productPublicID")
	offerSlug := r.URL.Query().Get("offer")
	sessionPublicID := r.URL.Query().Get("sid")

	var productID, offerID int64
	var productURL string
	query := `
		SELECT p.id, o.id, o.product_url
		FROM products p
		JOIN offers o ON o.product_id = p.id
		WHERE p.public_id = $1 AND o.in_stock AND o.product_url <> ''`
	args := []any{productPublicID}
	if offerSlug != "" {
		query += ` AND o.retailer_slug = $2`
		args = append(args, offerSlug)
	}
	query += ` ORDER BY o.price LIMIT 1`

	err := h.pool.QueryRow(r.Context(), query, args...).Scan(&productID, &offerID, &productURL)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "магазин для этого товара сейчас недоступен", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "не получилось выполнить переход", http.StatusInternalServerError)
		return
	}

	var sessionID *int64
	if sessionPublicID != "" {
		var sid int64
		if err := h.pool.QueryRow(r.Context(),
			`SELECT id FROM chat_sessions WHERE public_id = $1`, sessionPublicID).Scan(&sid); err == nil {
			sessionID = &sid
		}
	}

	var clickID string
	if err := h.pool.QueryRow(r.Context(), `
		INSERT INTO clicks (product_id, offer_id, session_id, user_agent, referer)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING click_id`,
		productID, offerID, sessionID,
		truncate(r.UserAgent(), 512), truncate(r.Referer(), 512)).Scan(&clickID); err != nil {
		http.Error(w, "не получилось выполнить переход", http.StatusInternalServerError)
		return
	}

	// Клик в магазин из сессии вошедшего → статус лида «перешёл в магазин».
	if sessionID != nil {
		lead.BySession(r.Context(), h.pool, *sessionID, lead.StatusClicked)
	}

	dest, err := url.Parse(productURL)
	if err != nil {
		http.Error(w, "у магазина некорректная ссылка", http.StatusBadGateway)
		return
	}
	q := dest.Query()
	q.Set("mml_click", clickID+"."+h.Sign(clickID))
	q.Set("utm_source", "makemelook")
	dest.RawQuery = q.Encode()

	http.Redirect(w, r, dest.String(), http.StatusFound)
}

// Sign — HMAC-SHA256 от click_id, укороченный до 16 байт hex.
func (h *Handler) Sign(clickID string) string {
	mac := hmac.New(sha256.New, h.secret)
	mac.Write([]byte(clickID))
	return hex.EncodeToString(mac.Sum(nil)[:16])
}

// Verify проверяет подпись postback'а (Ф5: сверка заказов от сети/партнёра).
func (h *Handler) Verify(clickID, signature string) bool {
	return hmac.Equal([]byte(h.Sign(clickID)), []byte(signature))
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}
