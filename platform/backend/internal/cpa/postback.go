package cpa

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"

	"mml-platform-backend/internal/lead"
)

// Postback — GET/POST /cpa/postback?click_id=..&sig=..&order_id=..&amount=..&status=..
//
// Партнёр/сеть подтверждает заказ. Подпись обязательна — так «потерянные
// заказы» и выдуманные click_id невозможны: мы принимаем только то, что
// подписано нашим же секретом на этапе редиректа.
func (h *Handler) Postback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	clickID := q.Get("click_id")
	sig := q.Get("sig")
	if clickID == "" || sig == "" {
		http.Error(w, `{"error":"нужны click_id и sig"}`, http.StatusBadRequest)
		return
	}
	if !h.Verify(clickID, sig) {
		http.Error(w, `{"error":"подпись не сходится"}`, http.StatusForbidden)
		return
	}

	// Клик должен существовать (защита от подписи к несуществующему id).
	var exists bool
	if err := h.pool.QueryRow(r.Context(),
		`SELECT true FROM clicks WHERE click_id = $1`, clickID).Scan(&exists); errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, `{"error":"клик не найден"}`, http.StatusNotFound)
		return
	}

	orderID := q.Get("order_id")
	amount, _ := strconv.ParseFloat(q.Get("amount"), 64)
	status := q.Get("status")
	if status == "" {
		status = "pending"
	}
	currency := q.Get("currency")
	if currency == "" {
		currency = "RUB"
	}
	raw, _ := json.Marshal(map[string]string{
		"source": q.Get("source"), "raw_status": q.Get("status"),
	})

	// Идемпотентно: повтор того же (click_id, order_id) обновляет статус/сумму.
	_, err := h.pool.Exec(r.Context(), `
		INSERT INTO conversions (click_id, external_order_id, amount, currency, status, source, raw)
		VALUES ($1, NULLIF($2,''), NULLIF($3,0)::numeric, $4, $5, NULLIF($6,''), $7)
		ON CONFLICT (click_id, external_order_id) DO UPDATE SET
		  amount = EXCLUDED.amount, status = EXCLUDED.status, updated_at = now()`,
		clickID, orderID, amount, currency, status, q.Get("source"), raw)
	if err != nil {
		http.Error(w, `{"error":"не удалось записать конверсию"}`, http.StatusInternalServerError)
		return
	}

	// Подтверждённая продажа → статус лида «купил» (метрика концьерж-теста).
	// Отклонённый postback статус не двигает.
	if status != "rejected" {
		lead.ByClick(r.Context(), h.pool, clickID, lead.StatusPurchased)
		// Фидбек-петля: покупка усиливает паспорт. Асинхронно и с отдельным
		// контекстом — вебхук партнёра не должен ждать нашу LLM/БД-работу.
		if h.onConversion != nil {
			cid := clickID
			go h.onConversion(context.Background(), cid)
		}
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_, _ = w.Write([]byte(`{"ok":true}`))
}
