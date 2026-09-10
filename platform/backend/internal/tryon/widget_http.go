package tryon

import (
	"context"
	"crypto/rand"
	"encoding/hex"
)

// HTTPWidget — реальная интеграция с виджетом по HTTP.
//
// ⚠️ НЕ ГОТОВ К ПРОДУ: включение требует координируемого релиза виджета —
// серверного API-ключа вместо доменно-верифицируемой сессии (единственное
// касание кода виджета за весь план). Плюс маппинг товара платформы →
// товара в проекте-платформе внутри виджета. До этого используем MockWidget.
//
// Контракт виджета (сверено по mml-saas-backend/internal/server/routes.go):
//
//	POST /sessions                         {project_id, gender?} → {token, ...}
//	POST /sessions/{token}/photos          multipart file        → {photo_id}
//	POST /sessions/{token}/tryon           {model_photo_id, product_ids[1..5]} → {public_id, status}
//	GET  /sessions/{token}/tryon/{id}/status → {public_id, status, result_url}
type HTTPWidget struct {
	baseURL   string
	projectID string
	apiKey    string // серверный ключ — появится с релизом виджета
}

func NewHTTPWidget(baseURL, projectID, apiKey string) *HTTPWidget {
	return &HTTPWidget{baseURL: baseURL, projectID: projectID, apiKey: apiKey}
}

func (h *HTTPWidget) Start(_ context.Context, _ []byte, _ string, _ []string) (Render, error) {
	// TODO(Ф4-релиз-виджета): создать сессию с серверным ключом, загрузить фото,
	// запустить примерку на замапленных widget-product-id. См. контракт выше.
	return Render{}, ErrWidgetUnavailable
}

func (h *HTTPWidget) Status(_ context.Context, _ string) (Render, error) {
	return Render{}, ErrWidgetUnavailable
}

func (h *HTTPWidget) DeletePhoto(_ context.Context, _ string) error {
	return ErrWidgetUnavailable
}

func randHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
