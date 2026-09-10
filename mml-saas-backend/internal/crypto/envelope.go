// Package crypto implements envelope encryption for merchant credentials.
//
// Two levels:
//
//	master keyset (KEK, from config)  →  wraps a per-project DEK
//	per-project DEK                   →  encrypts that project's credentials
//
// Why two levels rather than encrypting credentials with the master key
// directly: rotating the master key then rewraps one small DEK per project
// instead of re-encrypting every credential row, and a compromised project DEK
// exposes one merchant rather than all of them.
//
// Every ciphertext is bound to its context with additional authenticated data
// (AAD). A wrapped DEK is bound to its project, a credential blob to its
// project and connection. An attacker with write access to the database
// therefore cannot move a payment key from one merchant to another: the tag
// check fails and decryption returns an error rather than the wrong plaintext.
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
)

// DEKSize is the length of a data encryption key in bytes (AES-256).
const DEKSize = 32

var (
	// ErrNoKeys is returned when the keyset specification is empty.
	ErrNoKeys = errors.New("crypto: no master keys configured")
	// ErrUnknownVersion is returned when a ciphertext references a key
	// version that is not in the current keyset — usually a key was removed
	// from configuration before every row referencing it was rotated.
	ErrUnknownVersion = errors.New("crypto: unknown master key version")
	// ErrDecrypt is returned for any failure to decrypt or authenticate.
	// It deliberately carries no detail: distinguishing "wrong key" from
	// "tampered ciphertext" to a caller only helps an attacker.
	ErrDecrypt = errors.New("crypto: decryption failed")
)

// Keyset holds the master keys, addressed by version.
type Keyset struct {
	keys    map[int][]byte
	current int
}

// NewKeyset parses a keyset specification of the form
//
//	1:<base64-32-bytes>,2:<base64-32-bytes>
//
// The highest version present becomes the current one, used for all new
// encryption. Older versions stay available so existing rows keep decrypting
// until they are rotated.
//
// Generate a key with:
//
//	head -c 32 /dev/urandom | base64
func NewKeyset(spec string) (*Keyset, error) {
	spec = strings.TrimSpace(spec)
	if spec == "" {
		return nil, ErrNoKeys
	}

	ks := &Keyset{keys: make(map[int][]byte)}
	for _, entry := range strings.Split(spec, ",") {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		version, raw, found := strings.Cut(entry, ":")
		if !found {
			return nil, fmt.Errorf("crypto: malformed keyset entry, want <version>:<base64key>")
		}
		v, err := strconv.Atoi(strings.TrimSpace(version))
		if err != nil || v <= 0 {
			return nil, fmt.Errorf("crypto: key version must be a positive integer")
		}
		key, err := base64.StdEncoding.DecodeString(strings.TrimSpace(raw))
		if err != nil {
			return nil, fmt.Errorf("crypto: key %d is not valid base64", v)
		}
		if len(key) != DEKSize {
			return nil, fmt.Errorf("crypto: key %d must be %d bytes, got %d", v, DEKSize, len(key))
		}
		if _, exists := ks.keys[v]; exists {
			return nil, fmt.Errorf("crypto: key version %d appears twice", v)
		}
		ks.keys[v] = key
	}

	if len(ks.keys) == 0 {
		return nil, ErrNoKeys
	}

	versions := make([]int, 0, len(ks.keys))
	for v := range ks.keys {
		versions = append(versions, v)
	}
	sort.Ints(versions)
	ks.current = versions[len(versions)-1]

	return ks, nil
}

// CurrentVersion returns the key version used for new encryption.
func (k *Keyset) CurrentVersion() int { return k.current }

// Versions returns all configured versions, ascending. Used by the rotation
// job to report what is still in use.
func (k *Keyset) Versions() []int {
	versions := make([]int, 0, len(k.keys))
	for v := range k.keys {
		versions = append(versions, v)
	}
	sort.Ints(versions)
	return versions
}

// GenerateDEK returns a fresh random data encryption key.
func GenerateDEK() ([]byte, error) {
	dek := make([]byte, DEKSize)
	if _, err := rand.Read(dek); err != nil {
		return nil, fmt.Errorf("crypto: generating key: %w", err)
	}
	return dek, nil
}

// WrapDEK encrypts a project's DEK with the current master key.
// The returned version must be stored alongside the ciphertext.
func (k *Keyset) WrapDEK(dek []byte, projectID int) ([]byte, int, error) {
	if len(dek) != DEKSize {
		return nil, 0, fmt.Errorf("crypto: DEK must be %d bytes", DEKSize)
	}
	wrapped, err := seal(k.keys[k.current], dek, dekAAD(projectID))
	if err != nil {
		return nil, 0, err
	}
	return wrapped, k.current, nil
}

// UnwrapDEK decrypts a project's DEK using the master key of the given version.
//
// The caller owns the returned key material and should Zeroize it once the
// operation that needed it is done.
func (k *Keyset) UnwrapDEK(wrapped []byte, version, projectID int) ([]byte, error) {
	master, ok := k.keys[version]
	if !ok {
		return nil, fmt.Errorf("%w: %d", ErrUnknownVersion, version)
	}
	return open(master, wrapped, dekAAD(projectID))
}

// Seal encrypts credential material with a project's DEK.
//
// The ciphertext is bound to the project and connection it belongs to, so it
// cannot be replayed against a different merchant or a different provider
// connection.
func Seal(dek, plaintext []byte, projectID, connectionID int) ([]byte, error) {
	return seal(dek, plaintext, credentialAAD(projectID, connectionID))
}

// Open decrypts credential material previously produced by Seal. The project
// and connection must match the ones used to seal it.
func Open(dek, ciphertext []byte, projectID, connectionID int) ([]byte, error) {
	return open(dek, ciphertext, credentialAAD(projectID, connectionID))
}

// Zeroize overwrites key material in place.
//
// Go's garbage collector may move or copy memory, so this is a reduction of the
// window in which a key sits readable in the heap, not a guarantee that no copy
// survives. It is still worth doing: it bounds the lifetime of the common case
// and makes intent explicit at review time.
func Zeroize(b []byte) {
	for i := range b {
		b[i] = 0
	}
}

// seal performs AES-256-GCM encryption, returning nonce || ciphertext || tag.
func seal(key, plaintext, aad []byte) ([]byte, error) {
	gcm, err := newGCM(key)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, fmt.Errorf("crypto: generating nonce: %w", err)
	}
	// Seal appends to its first argument, so passing the nonce prefixes it.
	return gcm.Seal(nonce, nonce, plaintext, aad), nil
}

// open reverses seal. Every failure collapses into ErrDecrypt.
func open(key, blob, aad []byte) ([]byte, error) {
	gcm, err := newGCM(key)
	if err != nil {
		return nil, err
	}
	if len(blob) < gcm.NonceSize() {
		return nil, ErrDecrypt
	}
	nonce, ciphertext := blob[:gcm.NonceSize()], blob[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, aad)
	if err != nil {
		return nil, ErrDecrypt
	}
	return plaintext, nil
}

func newGCM(key []byte) (cipher.AEAD, error) {
	if len(key) != DEKSize {
		return nil, fmt.Errorf("crypto: key must be %d bytes, got %d", DEKSize, len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("crypto: cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("crypto: gcm: %w", err)
	}
	return gcm, nil
}

// dekAAD binds a wrapped DEK to its project.
func dekAAD(projectID int) []byte {
	return []byte("mml/dek/v1/project=" + strconv.Itoa(projectID))
}

// credentialAAD binds a credential blob to its project and connection.
func credentialAAD(projectID, connectionID int) []byte {
	return []byte("mml/cred/v1/project=" + strconv.Itoa(projectID) +
		"/connection=" + strconv.Itoa(connectionID))
}
