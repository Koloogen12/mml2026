package cpa

import "testing"

func TestSignVerifyRoundTrip(t *testing.T) {
	h := &Handler{secret: []byte("test-secret")}
	id := "20593750-71be-4780-be63-e24bd3ead287"
	sig := h.Sign(id)
	if sig == "" {
		t.Fatal("пустая подпись")
	}
	if !h.Verify(id, sig) {
		t.Fatal("своя подпись не прошла проверку")
	}
}

func TestVerifyRejectsForged(t *testing.T) {
	h := &Handler{secret: []byte("test-secret")}
	if h.Verify("some-click", "deadbeefdeadbeef") {
		t.Fatal("поддельная подпись прошла")
	}
}

func TestVerifyRejectsWrongSecret(t *testing.T) {
	a := &Handler{secret: []byte("secret-a")}
	b := &Handler{secret: []byte("secret-b")}
	id := "click-xyz"
	if b.Verify(id, a.Sign(id)) {
		t.Fatal("подпись чужим секретом прошла")
	}
}

func TestSignDeterministic(t *testing.T) {
	h := &Handler{secret: []byte("s")}
	if h.Sign("x") != h.Sign("x") {
		t.Fatal("подпись недетерминирована")
	}
}
