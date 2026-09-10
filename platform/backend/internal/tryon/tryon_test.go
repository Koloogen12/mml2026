package tryon

import (
	"context"
	"testing"
	"time"
)

func TestMockWidgetMatures(t *testing.T) {
	m := NewMockWidget()
	base := time.Unix(1_700_000_000, 0)
	m.now = func() time.Time { return base }

	r, err := m.Start(context.Background(), nil, "", []string{"p1"})
	if err != nil || r.Status != "processing" || r.TryonID == "" {
		t.Fatalf("start: %+v err=%v", r, err)
	}

	// Сразу — ещё processing.
	if st, _ := m.Status(context.Background(), r.TryonID); st.Status != "processing" {
		t.Fatalf("ожидали processing, получили %s", st.Status)
	}
	// Через 3с — done с результатом.
	m.now = func() time.Time { return base.Add(3 * time.Second) }
	st, _ := m.Status(context.Background(), r.TryonID)
	if st.Status != "done" || st.ResultURL == "" {
		t.Fatalf("ожидали done+result, получили %+v", st)
	}
}

func TestMockWidgetUnknownID(t *testing.T) {
	m := NewMockWidget()
	st, _ := m.Status(context.Background(), "never-started")
	if st.Status != "failed" {
		t.Fatalf("неизвестный id → failed, получили %s", st.Status)
	}
}

func TestDecodeDataURL(t *testing.T) {
	// "AQID" = base64 of bytes {1,2,3}
	data, ctype := decodeDataURL("data:image/png;base64,AQID")
	if ctype != "image/png" || len(data) != 3 || data[0] != 1 {
		t.Fatalf("decode: type=%s len=%d", ctype, len(data))
	}
	if d, _ := decodeDataURL(""); d != nil {
		t.Fatal("пустая строка → nil")
	}
}

func TestHTTPWidgetIsStub(t *testing.T) {
	// Реальный клиент пока намеренно не готов (ждёт релиза виджета).
	h := NewHTTPWidget("https://x", "proj", "key")
	if _, err := h.Start(context.Background(), nil, "", nil); err != ErrWidgetUnavailable {
		t.Fatalf("HTTPWidget должен возвращать ErrWidgetUnavailable, получили %v", err)
	}
}
