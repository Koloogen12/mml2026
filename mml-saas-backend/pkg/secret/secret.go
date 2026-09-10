// Package secret provides a string type whose value cannot leak through
// logging, formatting, or serialization.
//
// Merchant acquiring keys, fiscal tokens and delivery credentials pass through
// this codebase. A single `logger.Info("connecting", "config", cfg)` with a
// plain string field is enough to write a live payment key into a log file that
// is then shipped to disk, to an aggregator, and into a backup. secret.String
// makes that class of mistake impossible rather than forbidden: every path fmt,
// encoding/json and the standard library use to render a value is overridden to
// emit a mask. The value comes out only through an explicit Reveal() call,
// which is greppable in review.
package secret

import (
	"encoding/json"
	"fmt"
)

// mask is what every rendering path emits instead of the value.
const mask = "[REDACTED]"

// String holds a sensitive value. The zero value is a valid empty secret.
//
// It is deliberately a value type with an unexported field: it cannot be
// constructed from outside the package except through New or unmarshalling,
// and its contents cannot be read except through Reveal.
type String struct {
	v string
}

// New wraps a plain string.
func New(v string) String {
	return String{v: v}
}

// Reveal returns the underlying value.
//
// Every call site is a place where a secret enters plaintext memory and
// possibly an outbound request. Keep the returned value in the narrowest scope
// that works and never pass it to a logger.
func (s String) Reveal() string {
	return s.v
}

// IsEmpty reports whether the secret carries no value.
func (s String) IsEmpty() bool {
	return s.v == ""
}

// Len returns the length of the value, so callers can validate shape
// (for example "this key looks too short") without revealing it.
func (s String) Len() int {
	return len(s.v)
}

// Format implements fmt.Formatter. It takes precedence over String and
// GoString for every fmt verb, which is what makes %v, %s, %q, %#v and the
// implicit formatting inside log/slog attributes all safe.
func (s String) Format(f fmt.State, verb rune) {
	switch verb {
	case 'q':
		_, _ = fmt.Fprintf(f, "%q", mask)
	default:
		_, _ = f.Write([]byte(mask))
	}
}

// String implements fmt.Stringer for direct .String() calls.
func (s String) String() string {
	return mask
}

// GoString implements fmt.GoStringer for %#v.
func (s String) GoString() string {
	return mask
}

// MarshalJSON ensures a secret embedded in a response DTO serializes as the
// mask rather than the value. Encoding a secret outward is almost always a
// mistake; when a value genuinely must be sent (to a provider API), build the
// request body from Reveal() explicitly.
func (s String) MarshalJSON() ([]byte, error) {
	return json.Marshal(mask)
}

// UnmarshalJSON lets request DTOs accept a secret directly from a JSON body.
func (s *String) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	s.v = v
	return nil
}

// MarshalText covers encoders that prefer TextMarshaler over JSONMarshaler.
func (s String) MarshalText() ([]byte, error) {
	return []byte(mask), nil
}

// UnmarshalText covers decoders that prefer TextUnmarshaler.
func (s *String) UnmarshalText(data []byte) error {
	s.v = string(data)
	return nil
}

// LogValue implements slog.LogValuer, so a secret passed as a structured log
// attribute renders as the mask even if slog reaches it without going through
// fmt.
func (s String) LogValue() any {
	return mask
}

// Value implements driver.Valuer to stop a secret from being written to a
// database column as plaintext by accident. Secrets are persisted only as
// ciphertext produced by the crypto package; a direct column write is a bug,
// so this fails loudly instead of silently storing the mask.
func (s String) Value() (any, error) {
	return nil, ErrDirectPersist
}

// ErrDirectPersist is returned when a secret is passed to the database layer
// as a plain column value.
var ErrDirectPersist = fmt.Errorf("secret: refusing to persist a raw secret; encrypt it first")
