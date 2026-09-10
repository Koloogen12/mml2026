package secret

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"testing"
)

const sensitive = "live_sk_9f3a1c77b2e4"

// TestNoLeakThroughFmt covers every fmt verb a developer might reach for.
// This is the test that actually protects us: a regression here means a
// payment key can reach a log file.
func TestNoLeakThroughFmt(t *testing.T) {
	s := New(sensitive)

	cases := map[string]string{
		"%v":  fmt.Sprintf("%v", s),
		"%s":  fmt.Sprintf("%s", s),
		"%q":  fmt.Sprintf("%q", s),
		"%#v": fmt.Sprintf("%#v", s),
		"%+v": fmt.Sprintf("%+v", s),
		"%d":  fmt.Sprintf("%d", s),
		"%x":  fmt.Sprintf("%x", s),
		"print": func() string {
			var b bytes.Buffer
			_, _ = fmt.Fprint(&b, s)
			return b.String()
		}(),
		"stringer": s.String(),
		"gostring": s.GoString(),
	}

	for verb, got := range cases {
		if strings.Contains(got, sensitive) {
			t.Errorf("%s leaked the secret: %s", verb, got)
		}
		if !strings.Contains(got, mask) {
			t.Errorf("%s did not render the mask, got %q", verb, got)
		}
	}
}

// TestNoLeakInsideStruct covers the realistic case: the secret is a field of a
// config or model struct that someone logs wholesale.
func TestNoLeakInsideStruct(t *testing.T) {
	type providerConfig struct {
		ShopID    string
		SecretKey String
	}
	cfg := providerConfig{ShopID: "1122334", SecretKey: New(sensitive)}

	for _, got := range []string{
		fmt.Sprintf("%v", cfg),
		fmt.Sprintf("%+v", cfg),
		fmt.Sprintf("%#v", cfg),
	} {
		if strings.Contains(got, sensitive) {
			t.Errorf("struct formatting leaked the secret: %s", got)
		}
	}
}

// TestNoLeakThroughSlog covers structured logging, which is how this codebase
// actually logs.
func TestNoLeakThroughSlog(t *testing.T) {
	var buf bytes.Buffer
	log := slog.New(slog.NewJSONHandler(&buf, nil))
	log.Info("connecting to provider", "key", New(sensitive))

	if strings.Contains(buf.String(), sensitive) {
		t.Errorf("slog leaked the secret: %s", buf.String())
	}
}

// TestNoLeakThroughJSON covers a secret embedded in a response DTO.
func TestNoLeakThroughJSON(t *testing.T) {
	type response struct {
		Provider string `json:"provider"`
		Key      String `json:"key"`
	}
	out, err := json.Marshal(response{Provider: "yookassa", Key: New(sensitive)})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if strings.Contains(string(out), sensitive) {
		t.Errorf("json marshal leaked the secret: %s", out)
	}
}

// TestNoLeakThroughErrorWrapping covers %w and error strings, a path people
// forget about.
func TestNoLeakThroughErrorWrapping(t *testing.T) {
	s := New(sensitive)
	err := fmt.Errorf("auth failed for key %v: %w", s, errors.New("401"))
	if strings.Contains(err.Error(), sensitive) {
		t.Errorf("error wrapping leaked the secret: %s", err.Error())
	}
}

// TestUnmarshalThenReveal covers the inbound path: a request body carries the
// merchant's key, we must be able to read it back out.
func TestUnmarshalThenReveal(t *testing.T) {
	var req struct {
		Key String `json:"key"`
	}
	if err := json.Unmarshal([]byte(`{"key":"`+sensitive+`"}`), &req); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if req.Key.Reveal() != sensitive {
		t.Errorf("Reveal() = %q, want the original value", req.Key.Reveal())
	}
	if req.Key.Len() != len(sensitive) {
		t.Errorf("Len() = %d, want %d", req.Key.Len(), len(sensitive))
	}
}

func TestZeroValueIsEmpty(t *testing.T) {
	var s String
	if !s.IsEmpty() {
		t.Error("zero value should be empty")
	}
	if s.Reveal() != "" {
		t.Error("zero value should reveal an empty string")
	}
	if !strings.Contains(fmt.Sprintf("%v", s), mask) {
		t.Error("zero value should still render the mask")
	}
}

// TestRefusesDirectPersist covers the database path: a secret handed straight
// to a column write must fail loudly rather than silently storing the mask.
func TestRefusesDirectPersist(t *testing.T) {
	_, err := New(sensitive).Value()
	if !errors.Is(err, ErrDirectPersist) {
		t.Errorf("Value() error = %v, want ErrDirectPersist", err)
	}
}
