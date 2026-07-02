package licensetoken

import (
	"crypto/ed25519"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// signTestToken builds and signs a JWT/JWS compact token with the given kid,
// claims, and Ed25519 private key — mimicking what the Hub would emit.
func signTestToken(t *testing.T, priv ed25519.PrivateKey, kid string, claims Claims) string {
	t.Helper()

	token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, jwt.MapClaims{
		"iss": claims.Issuer,
		"sub": claims.InstanceID,
		"plg": claims.PluginSlug,
		"cap": claims.TenantCap,
		"dgr": claims.Degrade,
		"iat": claims.IssuedAt,
		"exp": claims.ExpiresAt,
	})
	token.Header["kid"] = kid

	signed, err := token.SignedString(priv)
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}
	return signed
}

func validClaims() Claims {
	now := time.Now()
	return Claims{
		Issuer:     "watink-hub",
		InstanceID: "INST-12345-abcde",
		PluginSlug: "helpdesk",
		TenantCap:  10,
		Degrade:    "readonly",
		IssuedAt:   now.Unix(),
		ExpiresAt:  now.Add(48 * time.Hour).Unix(),
	}
}

func TestVerify_ValidTokenAccepted(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}

	claims := validClaims()
	tokenString := signTestToken(t, priv, "hub-key-1", claims)

	keys := []PublicKey{{Kid: "hub-key-1", Key: pub}}

	got, err := Verify(tokenString, keys)
	if err != nil {
		t.Fatalf("expected valid token to be accepted, got error: %v", err)
	}

	if got.InstanceID != claims.InstanceID {
		t.Errorf("InstanceID = %q, want %q", got.InstanceID, claims.InstanceID)
	}
	if got.PluginSlug != claims.PluginSlug {
		t.Errorf("PluginSlug = %q, want %q", got.PluginSlug, claims.PluginSlug)
	}
	if got.TenantCap != claims.TenantCap {
		t.Errorf("TenantCap = %d, want %d", got.TenantCap, claims.TenantCap)
	}
	if got.Degrade != claims.Degrade {
		t.Errorf("Degrade = %q, want %q", got.Degrade, claims.Degrade)
	}
}

func TestVerify_TamperedSignatureRejected(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}

	claims := validClaims()
	tokenString := signTestToken(t, priv, "hub-key-1", claims)

	// Tamper with the payload segment (flip a byte) while keeping structure.
	// JWT compact form is header.payload.signature — corrupt the payload.
	tampered := tokenString[:len(tokenString)-5] + "AAAAA"

	keys := []PublicKey{{Kid: "hub-key-1", Key: pub}}

	_, err = Verify(tampered, keys)
	if err == nil {
		t.Fatal("expected tampered token to be rejected, got nil error")
	}
	if !errors.Is(err, ErrInvalidSignature) {
		t.Errorf("expected ErrInvalidSignature, got: %v", err)
	}
}

func TestVerify_ExpiredTokenRejected(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}

	claims := validClaims()
	claims.IssuedAt = time.Now().Add(-72 * time.Hour).Unix()
	claims.ExpiresAt = time.Now().Add(-24 * time.Hour).Unix()

	tokenString := signTestToken(t, priv, "hub-key-1", claims)

	keys := []PublicKey{{Kid: "hub-key-1", Key: pub}}

	_, err = Verify(tokenString, keys)
	if err == nil {
		t.Fatal("expected expired token to be rejected, got nil error")
	}
	if !errors.Is(err, ErrTokenExpired) {
		t.Errorf("expected ErrTokenExpired, got: %v", err)
	}
}

func TestVerify_UnknownKidRejected(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	_ = pub

	claims := validClaims()
	tokenString := signTestToken(t, priv, "hub-key-unknown", claims)

	// Verifier only knows about a different kid.
	otherPub, _, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	keys := []PublicKey{{Kid: "hub-key-1", Key: otherPub}}

	_, err = Verify(tokenString, keys)
	if err == nil {
		t.Fatal("expected unknown kid to be rejected, got nil error")
	}
	if !errors.Is(err, ErrUnknownKid) {
		t.Errorf("expected ErrUnknownKid, got: %v", err)
	}
}

func TestVerify_MalformedTokenRejected(t *testing.T) {
	pub, _, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	keys := []PublicKey{{Kid: "hub-key-1", Key: pub}}

	cases := []struct {
		name  string
		token string
	}{
		{"empty string", ""},
		{"not a jwt", "this-is-not-a-jwt"},
		{"only two segments", "aaaa.bbbb"},
		{"garbage segments", "aaaa.bbbb.cccc"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := Verify(tc.token, keys)
			if err == nil {
				t.Fatal("expected malformed token to be rejected, got nil error")
			}
			if !errors.Is(err, ErrMalformedToken) {
				t.Errorf("expected ErrMalformedToken, got: %v", err)
			}
		})
	}
}

func TestVerify_EmptyKeysListRejectsAnyToken(t *testing.T) {
	_, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}

	tokenString := signTestToken(t, priv, "hub-key-1", validClaims())

	_, err = Verify(tokenString, nil)
	if err == nil {
		t.Fatal("expected verification against empty key list to fail")
	}
	if !errors.Is(err, ErrUnknownKid) {
		t.Errorf("expected ErrUnknownKid, got: %v", err)
	}
}
