package service

import (
	"net/http"
	"testing"
)

// Тревога намеренно относительная. Абсолютный порог ArcFace не годится:
// на закрытом лице метрика неустойчива, и любое одно число даст либо шум,
// либо слепоту. Значимо другое — стал ли композит ХУЖЕ генерации.
func TestCompositeAlarm(t *testing.T) {
	h := func(gen, comp string) http.Header {
		return http.Header{
			"X-Cos-Generated": []string{gen},
			"X-Cos-Composite": []string{comp},
		}
	}
	cases := []struct {
		name  string
		hdr   http.Header
		alarm bool
	}{
		{"композит лучше генерации — норма", h("0.8943", "0.9433"), false},
		{"композит хуже генерации — тревога", h("0.9433", "0.8943"), true},
		{"оба высокие и равные — норма", h("0.9900", "0.9900"), false},
		{"композит выше генерации, но ниже пола", h("0.7000", "0.8000"), true},
		{"замера не было — молчим", http.Header{}, false},
		{"мусор в заголовках — молчим", h("нет", "0.99"), false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, reason := compositeAlarm(c.hdr)
			if got != c.alarm {
				t.Fatalf("ожидалось alarm=%v, получено %v (%s)", c.alarm, got, reason)
			}
			if got && reason == "" {
				t.Fatal("тревога без причины бесполезна в логе")
			}
		})
	}
}
