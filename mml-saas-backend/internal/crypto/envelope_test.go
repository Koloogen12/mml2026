package crypto

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"
	"testing"
)

func testKey(t *testing.T) string {
	t.Helper()
	k := make([]byte, DEKSize)
	if _, err := rand.Read(k); err != nil {
		t.Fatalf("rand: %v", err)
	}
	return base64.StdEncoding.EncodeToString(k)
}

func testKeyset(t *testing.T) *Keyset {
	t.Helper()
	ks, err := NewKeyset("1:" + testKey(t))
	if err != nil {
		t.Fatalf("NewKeyset: %v", err)
	}
	return ks
}

func TestKeysetParsing(t *testing.T) {
	k1, k2 := testKey(t), testKey(t)

	ks, err := NewKeyset("1:" + k1 + ",2:" + k2)
	if err != nil {
		t.Fatalf("NewKeyset: %v", err)
	}
	if ks.CurrentVersion() != 2 {
		t.Errorf("CurrentVersion() = %d, want the highest version 2", ks.CurrentVersion())
	}
	if got := ks.Versions(); len(got) != 2 || got[0] != 1 || got[1] != 2 {
		t.Errorf("Versions() = %v, want [1 2]", got)
	}
}

func TestKeysetRejectsBadInput(t *testing.T) {
	short := base64.StdEncoding.EncodeToString([]byte("too-short"))

	cases := map[string]string{
		"empty":            "",
		"no version":       testKey(t),
		"zero version":     "0:" + testKey(t),
		"negative version": "-1:" + testKey(t),
		"not base64":       "1:!!!not-base64!!!",
		"wrong length":     "1:" + short,
		"duplicate":        "1:" + testKey(t) + ",1:" + testKey(t),
	}

	for name, spec := range cases {
		if _, err := NewKeyset(spec); err == nil {
			t.Errorf("%s: expected an error, got nil", name)
		}
	}
}

func TestDEKRoundTrip(t *testing.T) {
	ks := testKeyset(t)

	dek, err := GenerateDEK()
	if err != nil {
		t.Fatalf("GenerateDEK: %v", err)
	}

	wrapped, version, err := ks.WrapDEK(dek, 42)
	if err != nil {
		t.Fatalf("WrapDEK: %v", err)
	}
	if bytes.Contains(wrapped, dek) {
		t.Fatal("wrapped DEK contains the raw key material")
	}

	got, err := ks.UnwrapDEK(wrapped, version, 42)
	if err != nil {
		t.Fatalf("UnwrapDEK: %v", err)
	}
	if !bytes.Equal(got, dek) {
		t.Error("unwrapped DEK does not match the original")
	}
}

// TestDEKBoundToProject is the check that stops a wrapped DEK from being moved
// between merchants by anyone with write access to the database.
func TestDEKBoundToProject(t *testing.T) {
	ks := testKeyset(t)
	dek, _ := GenerateDEK()

	wrapped, version, err := ks.WrapDEK(dek, 42)
	if err != nil {
		t.Fatalf("WrapDEK: %v", err)
	}

	if _, err := ks.UnwrapDEK(wrapped, version, 43); !errors.Is(err, ErrDecrypt) {
		t.Errorf("unwrapping under a different project should fail with ErrDecrypt, got %v", err)
	}
}

func TestCredentialRoundTrip(t *testing.T) {
	dek, _ := GenerateDEK()
	plaintext := []byte(`{"shop_id":"1122334","secret_key":"live_sk_9f3a1c77b2e4"}`)

	blob, err := Seal(dek, plaintext, 42, 7)
	if err != nil {
		t.Fatalf("Seal: %v", err)
	}
	if bytes.Contains(blob, plaintext) {
		t.Fatal("ciphertext contains the plaintext")
	}
	if strings.Contains(string(blob), "live_sk") {
		t.Fatal("ciphertext contains recognizable key material")
	}

	got, err := Open(dek, blob, 42, 7)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if !bytes.Equal(got, plaintext) {
		t.Error("decrypted credential does not match the original")
	}
}

// TestCredentialBoundToContext covers the attack this design exists to stop:
// copying a payment credential row from one merchant or connection to another.
func TestCredentialBoundToContext(t *testing.T) {
	dek, _ := GenerateDEK()
	blob, err := Seal(dek, []byte("secret"), 42, 7)
	if err != nil {
		t.Fatalf("Seal: %v", err)
	}

	cases := map[string]struct{ project, connection int }{
		"different project":    {43, 7},
		"different connection": {42, 8},
		"both different":       {43, 8},
	}

	for name, c := range cases {
		if _, err := Open(dek, blob, c.project, c.connection); !errors.Is(err, ErrDecrypt) {
			t.Errorf("%s: expected ErrDecrypt, got %v", name, err)
		}
	}
}

func TestTamperedCiphertextFails(t *testing.T) {
	dek, _ := GenerateDEK()
	blob, err := Seal(dek, []byte("secret"), 42, 7)
	if err != nil {
		t.Fatalf("Seal: %v", err)
	}

	tampered := bytes.Clone(blob)
	tampered[len(tampered)-1] ^= 0xFF

	if _, err := Open(dek, tampered, 42, 7); !errors.Is(err, ErrDecrypt) {
		t.Errorf("tampered ciphertext should fail authentication, got %v", err)
	}
}

func TestWrongDEKFails(t *testing.T) {
	dek, _ := GenerateDEK()
	other, _ := GenerateDEK()

	blob, err := Seal(dek, []byte("secret"), 42, 7)
	if err != nil {
		t.Fatalf("Seal: %v", err)
	}
	if _, err := Open(other, blob, 42, 7); !errors.Is(err, ErrDecrypt) {
		t.Errorf("wrong DEK should fail, got %v", err)
	}
}

func TestTruncatedBlobFails(t *testing.T) {
	dek, _ := GenerateDEK()
	if _, err := Open(dek, []byte{1, 2, 3}, 42, 7); !errors.Is(err, ErrDecrypt) {
		t.Errorf("truncated blob should fail cleanly, got %v", err)
	}
}

// TestNonceUniqueness guards against the catastrophic GCM failure mode of
// reusing a nonce under the same key.
func TestNonceUniqueness(t *testing.T) {
	dek, _ := GenerateDEK()
	seen := make(map[string]bool, 500)

	for i := 0; i < 500; i++ {
		blob, err := Seal(dek, []byte("same plaintext every time"), 42, 7)
		if err != nil {
			t.Fatalf("Seal: %v", err)
		}
		nonce := string(blob[:12])
		if seen[nonce] {
			t.Fatal("nonce reused under the same key")
		}
		seen[nonce] = true
	}
}

// TestRotation covers the reason for the two-level design: a new master key is
// introduced, the DEK is rewrapped, and credentials never need re-encrypting.
func TestRotation(t *testing.T) {
	k1, k2 := testKey(t), testKey(t)

	oldKS, err := NewKeyset("1:" + k1)
	if err != nil {
		t.Fatalf("NewKeyset: %v", err)
	}
	dek, _ := GenerateDEK()
	wrapped, version, err := oldKS.WrapDEK(dek, 42)
	if err != nil {
		t.Fatalf("WrapDEK: %v", err)
	}

	credential, err := Seal(dek, []byte("live_sk_9f3a1c77b2e4"), 42, 7)
	if err != nil {
		t.Fatalf("Seal: %v", err)
	}

	// A second master key is added.
	newKS, err := NewKeyset("1:" + k1 + ",2:" + k2)
	if err != nil {
		t.Fatalf("NewKeyset: %v", err)
	}
	if newKS.CurrentVersion() != 2 {
		t.Fatalf("current version = %d, want 2", newKS.CurrentVersion())
	}

	// Old rows still decrypt under the old version.
	unwrapped, err := newKS.UnwrapDEK(wrapped, version, 42)
	if err != nil {
		t.Fatalf("UnwrapDEK under the old version: %v", err)
	}

	// Rewrap under the new master key.
	rewrapped, newVersion, err := newKS.WrapDEK(unwrapped, 42)
	if err != nil {
		t.Fatalf("rewrap: %v", err)
	}
	if newVersion != 2 {
		t.Errorf("rewrapped version = %d, want 2", newVersion)
	}

	// The credential was never re-encrypted and still opens.
	finalDEK, err := newKS.UnwrapDEK(rewrapped, newVersion, 42)
	if err != nil {
		t.Fatalf("UnwrapDEK after rotation: %v", err)
	}
	got, err := Open(finalDEK, credential, 42, 7)
	if err != nil {
		t.Fatalf("Open after rotation: %v", err)
	}
	if string(got) != "live_sk_9f3a1c77b2e4" {
		t.Error("credential did not survive master key rotation")
	}
}

func TestUnknownVersionIsReported(t *testing.T) {
	ks := testKeyset(t)
	dek, _ := GenerateDEK()
	wrapped, _, _ := ks.WrapDEK(dek, 42)

	// Version 9 was never configured — a key removed too early.
	if _, err := ks.UnwrapDEK(wrapped, 9, 42); !errors.Is(err, ErrUnknownVersion) {
		t.Errorf("expected ErrUnknownVersion, got %v", err)
	}
}

func TestZeroize(t *testing.T) {
	dek, _ := GenerateDEK()
	Zeroize(dek)
	for i, b := range dek {
		if b != 0 {
			t.Fatalf("byte %d was not cleared", i)
		}
	}
}
