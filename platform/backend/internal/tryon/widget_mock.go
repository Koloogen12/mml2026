package tryon

import (
	"context"
	"sync"
	"time"
)

// MockWidget — локальная имитация виджета для демо без прод-интеграции.
// Рендер «зреет»: первые ~2 секунды processing, потом done с плейсхолдером.
// Позволяет гонять петлю примерки насквозь, не трогая прод виджета.
type MockWidget struct {
	mu      sync.Mutex
	started map[string]time.Time
	now     func() time.Time
}

func NewMockWidget() *MockWidget {
	return &MockWidget{started: map[string]time.Time{}, now: time.Now}
}

func (m *MockWidget) Start(_ context.Context, _ []byte, _ string, productIDs []string) (Render, error) {
	id := "mock-" + randHex(8)
	m.mu.Lock()
	m.started[id] = m.now()
	m.mu.Unlock()
	return Render{
		PhotoID: "mock-photo-" + randHex(6),
		TryonID: id,
		Status:  "processing",
	}, nil
}

func (m *MockWidget) Status(_ context.Context, tryonID string) (Render, error) {
	m.mu.Lock()
	started, ok := m.started[tryonID]
	m.mu.Unlock()
	if !ok {
		return Render{TryonID: tryonID, Status: "failed"}, nil
	}
	if m.now().Sub(started) < 2*time.Second {
		return Render{TryonID: tryonID, Status: "processing"}, nil
	}
	return Render{
		TryonID:   tryonID,
		Status:    "done",
		ResultURL: "https://admin.makemelook.tech/s3/product-photos/placeholder-tryon.webp",
	}, nil
}

func (m *MockWidget) DeletePhoto(_ context.Context, _ string) error { return nil }
