package auth

import "testing"

func newTestSvc() *Service {
	return &Service{jwtSecret: []byte("test-secret-at-least-32-bytes-long!!")}
}

func TestAccessTokenRoundTrip(t *testing.T) {
	s := newTestSvc()
	tok, err := s.signAccess(42, "pub-uuid")
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	claims, err := s.ParseAccess(tok)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if claims.UserID != 42 || claims.UserPublicID != "pub-uuid" {
		t.Fatalf("claims mismatch: %+v", claims)
	}
}

func TestParseRejectsWrongSecret(t *testing.T) {
	tok, _ := newTestSvc().signAccess(1, "x")
	other := &Service{jwtSecret: []byte("a-completely-different-secret-key-32b")}
	if _, err := other.ParseAccess(tok); err == nil {
		t.Fatal("ожидали ошибку на чужой подписи, получили nil")
	}
}

func TestParseRejectsGarbage(t *testing.T) {
	if _, err := newTestSvc().ParseAccess("not.a.jwt"); err == nil {
		t.Fatal("ожидали ошибку на мусоре")
	}
}

func TestHashTokenDeterministicAndUnique(t *testing.T) {
	if hashToken("abc") != hashToken("abc") {
		t.Fatal("хеш недетерминирован")
	}
	if hashToken("abc") == hashToken("abd") {
		t.Fatal("коллизия хеша на разных входах")
	}
}

func TestSixDigitsFormat(t *testing.T) {
	for i := 0; i < 50; i++ {
		c := sixDigits()
		if len(c) != 6 {
			t.Fatalf("код не 6 знаков: %q", c)
		}
		for _, r := range c {
			if r < '0' || r > '9' {
				t.Fatalf("код не цифровой: %q", c)
			}
		}
	}
}
