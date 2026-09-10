package tryon

import (
	"context"
	"errors"
)

// Render — результат запуска примерки в виджете.
type Render struct {
	PhotoID   string // id загруженного фото (биометрия остаётся в виджете)
	TryonID   string // id примерки в виджете
	Status    string // pending|processing|done|failed
	ResultURL string
}

// WidgetClient — контракт к виджету. Платформа = проект внутри виджета;
// это единственная связь между продуктами (по HTTP, без общего кода).
type WidgetClient interface {
	// Start загружает фото и запускает рендер на товарах (widget product ids).
	Start(ctx context.Context, photo []byte, contentType string, widgetProductIDs []string) (Render, error)
	// Status опрашивает статус примерки.
	Status(ctx context.Context, tryonID string) (Render, error)
	// DeletePhoto удаляет биометрию в виджете (для 152-ФЗ one-tap delete).
	DeletePhoto(ctx context.Context, photoID string) error
}

var ErrWidgetUnavailable = errors.New("сервис примерки временно недоступен")
