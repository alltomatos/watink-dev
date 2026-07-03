// Package licensetoken implementa a VERIFICAÇÃO (lado cliente) de tokens de
// licença assinados pelo Hub central (projeto separado, fora deste repo).
//
// O Hub emite tokens Ed25519 (JWT/JWS compacto, alg="EdDSA") que atestam a
// licença de um plugin para uma instância do core, com um teto de tenants
// (`cap`) e um modo de degradação (`dgr`) aplicado após a expiração.
//
// Este pacote NÃO emite tokens — apenas verifica assinatura + expiração e
// retorna as claims validadas. Emissão é responsabilidade exclusiva do Hub.
//
// Ver docs/adr/0024-plugin-marketplace-licensing-redesign.md e
// docs/agents/plugins.md para o contrato completo.
package licensetoken

import (
	"crypto/ed25519"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Erros sentinela retornados por Verify — testáveis via errors.Is.
var (
	// ErrUnknownKid indica que o "kid" do header não corresponde a
	// nenhuma chave pública fornecida.
	ErrUnknownKid = errors.New("licensetoken: unknown kid")

	// ErrInvalidSignature indica que a assinatura Ed25519 não confere
	// com as claims/header do token (adulteração ou chave errada).
	ErrInvalidSignature = errors.New("licensetoken: invalid signature")

	// ErrTokenExpired indica que o token é assinado corretamente mas
	// `exp` já passou.
	ErrTokenExpired = errors.New("licensetoken: token expired")

	// ErrMalformedToken indica que o token não é um JWT/JWS compacto
	// válido (header/claims ilegíveis, estrutura quebrada, etc).
	ErrMalformedToken = errors.New("licensetoken: malformed token")
)

// Claims são os campos do token de licença emitido pelo Hub.
type Claims struct {
	Issuer     string `json:"iss"`
	InstanceID string `json:"sub"`
	PluginSlug string `json:"plg"`
	TenantCap  int    `json:"cap"`
	Degrade    string `json:"dgr"`
	IssuedAt   int64  `json:"iat"`
	ExpiresAt  int64  `json:"exp"`
}

// GetExpirationTime, GetIssuedAt, GetNotBefore, GetIssuer, GetSubject e
// GetAudience implementam jwt.Claims para permitir o parsing nativo da lib
// golang-jwt. A validação de exp é feita manualmente em Verify (não
// delegada ao parser) para garantir a mensagem de erro ErrTokenExpired.
func (c Claims) GetExpirationTime() (*jwt.NumericDate, error) {
	if c.ExpiresAt == 0 {
		return nil, nil
	}
	return jwt.NewNumericDate(time.Unix(c.ExpiresAt, 0)), nil
}

func (c Claims) GetIssuedAt() (*jwt.NumericDate, error) {
	if c.IssuedAt == 0 {
		return nil, nil
	}
	return jwt.NewNumericDate(time.Unix(c.IssuedAt, 0)), nil
}

func (c Claims) GetNotBefore() (*jwt.NumericDate, error) { return nil, nil }
func (c Claims) GetIssuer() (string, error)              { return c.Issuer, nil }
func (c Claims) GetSubject() (string, error)             { return c.InstanceID, nil }
func (c Claims) GetAudience() (jwt.ClaimStrings, error)  { return nil, nil }

// PublicKey associa um "kid" (key id) do header JWT à chave pública Ed25519
// referente, para permitir rotação de chaves do Hub.
type PublicKey struct {
	Kid string
	Key ed25519.PublicKey
}

// Verify decodifica tokenString (JWT/JWS compacto, alg=EdDSA), localiza a
// chave pública pelo "kid" do header entre keys, valida a assinatura Ed25519
// e a expiração (exp), e retorna as claims validadas.
//
// Erros retornados (verificáveis com errors.Is): ErrMalformedToken,
// ErrUnknownKid, ErrInvalidSignature, ErrTokenExpired.
//
// A validação de exp usa jwt.WithoutClaimsValidation nativa desligada:
// verificamos exp manualmente após o parse ter sucesso de assinatura, para
// controlar a mensagem/erro exposto (o parser da lib rejeitaria o token
// expirado como erro genérico misturado com o de assinatura).
func Verify(tokenString string, keys []PublicKey) (*Claims, error) {
	if tokenString == "" {
		return nil, fmt.Errorf("%w: empty token", ErrMalformedToken)
	}

	claims := &Claims{}

	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"EdDSA"}),
		jwt.WithoutClaimsValidation(),
	)

	token, err := parser.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok {
			return nil, fmt.Errorf("%w: unexpected signing method %v", ErrMalformedToken, t.Header["alg"])
		}

		kid, ok := t.Header["kid"].(string)
		if !ok || kid == "" {
			return nil, fmt.Errorf("%w: missing kid in header", ErrUnknownKid)
		}

		for _, k := range keys {
			if k.Kid == kid {
				return k.Key, nil
			}
		}

		return nil, fmt.Errorf("%w: %q", ErrUnknownKid, kid)
	})

	if err != nil {
		switch {
		case errors.Is(err, ErrUnknownKid):
			return nil, err
		case errors.Is(err, ErrMalformedToken):
			return nil, err
		case errors.Is(err, jwt.ErrTokenMalformed):
			return nil, fmt.Errorf("%w: %v", ErrMalformedToken, err)
		default:
			// Qualquer outro erro de parsing/assinatura (estrutura OK mas
			// verificação falhou) é tratado como assinatura inválida.
			return nil, fmt.Errorf("%w: %v", ErrInvalidSignature, err)
		}
	}

	if !token.Valid {
		return nil, fmt.Errorf("%w: token marked invalid by parser", ErrInvalidSignature)
	}

	if claims.ExpiresAt == 0 {
		return nil, fmt.Errorf("%w: missing exp claim", ErrMalformedToken)
	}

	if time.Now().Unix() >= claims.ExpiresAt {
		return nil, ErrTokenExpired
	}

	return claims, nil
}
