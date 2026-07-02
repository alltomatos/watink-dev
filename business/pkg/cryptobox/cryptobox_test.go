package cryptobox

import (
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	// Provide a deterministic key for the whole package test binary. loadKey()
	// caches via sync.Once, so the env must be set before the first Encrypt call.
	_ = os.Setenv(EnvKey, "unit-test-master-secret-aaaaaaaaaaaaaaaa")
	os.Exit(m.Run())
}

func TestEncryptDecrypt_RoundTrip(t *testing.T) {
	secret := "socks5password:with@special/chars"
	enc, err := Encrypt(secret)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if enc == secret {
		t.Fatal("ciphertext equals plaintext — not encrypted")
	}
	if enc == "" {
		t.Fatal("non-empty plaintext produced empty ciphertext")
	}

	dec, err := Decrypt(enc)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if dec != secret {
		t.Fatalf("round-trip mismatch: got %q want %q", dec, secret)
	}
}

func TestEncrypt_EmptyIsPassthrough(t *testing.T) {
	enc, err := Encrypt("")
	if err != nil {
		t.Fatalf("Encrypt empty: %v", err)
	}
	if enc != "" {
		t.Fatalf("empty plaintext should encrypt to empty, got %q", enc)
	}
	dec, err := Decrypt("")
	if err != nil {
		t.Fatalf("Decrypt empty: %v", err)
	}
	if dec != "" {
		t.Fatalf("empty ciphertext should decrypt to empty, got %q", dec)
	}
}

func TestEncrypt_NonceIsRandom(t *testing.T) {
	a, _ := Encrypt("same-input")
	b, _ := Encrypt("same-input")
	if a == b {
		t.Fatal("two encryptions of the same plaintext are identical — nonce not random")
	}
}

func TestDecrypt_TamperedFails(t *testing.T) {
	enc, _ := Encrypt("authentic")
	// Flip the first character in the base64 to corrupt the tag/ciphertext.
	// Must pick a replacement different from the original char, or the
	// "tampered" string is identical to enc and decrypts successfully,
	// flaking the test.
	replacement := byte('A')
	if enc[0] == replacement {
		replacement = 'B'
	}
	tampered := string(replacement) + enc[1:]
	if _, err := Decrypt(tampered); err == nil {
		t.Fatal("tampered ciphertext decrypted without error — GCM auth not enforced")
	}
}

func TestIsConfigured(t *testing.T) {
	if !IsConfigured() {
		t.Fatal("IsConfigured should be true when PROXY_ENC_KEY is set")
	}
}
