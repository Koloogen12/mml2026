package proxy

import (
	"testing"
	"time"
)

func TestNewHTTPClientEmpty(t *testing.T) {
	c, err := NewHTTPClient("", 10*time.Second)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c == nil {
		t.Fatal("expected non-nil client")
	}
}

func TestNewHTTPClientHTTP(t *testing.T) {
	c, err := NewHTTPClient("http://user:pass@proxy.example.com:3128", 10*time.Second)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c == nil {
		t.Fatal("expected non-nil client")
	}
}

func TestNewHTTPClientInvalidURL(t *testing.T) {
	_, err := NewHTTPClient("://bad url", 10*time.Second)
	if err == nil {
		t.Fatal("expected error for invalid URL")
	}
}
