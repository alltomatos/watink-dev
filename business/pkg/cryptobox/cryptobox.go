// Package cryptobox provides authenticated encryption-at-rest (AES-256-GCM) for
// small secrets persisted in the database — currently proxy passwords.
//
// The key is derived (SHA-256) from the PROXY_ENC_KEY environment variable, so
// the operator can supply any sufficiently-random string (e.g. `openssl rand
// -base64 32`). If PROXY_ENC_KEY is unset, Encrypt/Decrypt fail closed — the
// caller must treat that as "encryption unavailable" and refuse to persist or
// use secrets, never silently fall back to plaintext.
package cryptobox

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"os"
	"strings"
	"sync"
)

// EnvKey is the environment variable holding the master encryption secret.
const EnvKey = "PROXY_ENC_KEY"

// ErrNotConfigured is returned when PROXY_ENC_KEY is missing/empty.
var ErrNotConfigured = errors.New("cryptobox: PROXY_ENC_KEY não configurada — defina uma chave secreta (ex: openssl rand -base64 32) para criptografar segredos de proxy")

var (
	cachedKey []byte
	keyOnce   sync.Once
	keyErr    error
)

func loadKey() ([]byte, error) {
	keyOnce.Do(func() {
		raw := strings.TrimSpace(os.Getenv(EnvKey))
		if raw == "" {
			keyErr = ErrNotConfigured
			return
		}
		sum := sha256.Sum256([]byte(raw))
		cachedKey = sum[:]
	})
	return cachedKey, keyErr
}

// IsConfigured reports whether the master key is available. Use it to fail
// closed at controller boundaries before accepting a secret.
func IsConfigured() bool {
	_, err := loadKey()
	return err == nil
}

// Encrypt returns base64(nonce||ciphertext||tag) for the given plaintext.
// An empty plaintext encrypts to an empty string (no secret to protect).
func Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	key, err := loadKey()
	if err != nil {
		return "", err
	}
	gcm, err := newGCM(key)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// Decrypt reverses Encrypt. An empty input decrypts to an empty string.
func Decrypt(encoded string) (string, error) {
	if encoded == "" {
		return "", nil
	}
	key, err := loadKey()
	if err != nil {
		return "", err
	}
	gcm, err := newGCM(key)
	if err != nil {
		return "", err
	}
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", errors.New("cryptobox: ciphertext muito curto")
	}
	nonce, ciphertext := raw[:gcm.NonceSize()], raw[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func newGCM(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}
