package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AddressLookupResult is the normalized outcome of a CEP lookup, independent
// of the underlying provider (default: ViaCEP).
type AddressLookupResult struct {
	Street       string `json:"street"`
	Neighborhood string `json:"neighborhood"`
	City         string `json:"city"`
	State        string `json:"state"`
	NotFound     bool   `json:"notFound"`
}

// viaCEPResponse mirrors the JSON shape returned by ViaCEP-compatible providers.
type viaCEPResponse struct {
	Logradouro string `json:"logradouro"`
	Bairro     string `json:"bairro"`
	Localidade string `json:"localidade"`
	UF         string `json:"uf"`
	Erro       bool   `json:"erro"`
}

var cepNonDigitRE = regexp.MustCompile(`\D`)

const (
	defaultAddressLookupBaseURL = "https://viacep.com.br/ws"
	addressLookupTimeout        = 5 * time.Second
)

// LookupAddressByCEP sanitizes and validates the given CEP, then resolves it
// against the tenant-configured address lookup provider (default: ViaCEP).
// Network/timeout/decoding failures return a real error; a CEP that the
// provider could not find returns AddressLookupResult{NotFound: true}, nil.
func LookupAddressByCEP(ctx context.Context, db *gorm.DB, tenantID uuid.UUID, cep string) (*AddressLookupResult, error) {
	sanitized := cepNonDigitRE.ReplaceAllString(cep, "")
	if len(sanitized) != 8 {
		return nil, errors.New("CEP inválido")
	}

	var settings []models.Setting
	db.Where(`"tenantId" = ? AND key IN ?`, tenantID,
		[]string{"addressLookupProvider", "addressLookupBaseUrl"},
	).Find(&settings)

	settingMap := make(map[string]string, len(settings))
	for _, s := range settings {
		settingMap[s.Key] = s.Value
	}

	baseURL := settingMap["addressLookupBaseUrl"]
	if baseURL == "" {
		baseURL = defaultAddressLookupBaseURL
	}

	url := fmt.Sprintf("%s/%s/json/", baseURL, sanitized)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: addressLookupTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	var parsed viaCEPResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}

	if parsed.Erro {
		return &AddressLookupResult{NotFound: true}, nil
	}

	return &AddressLookupResult{
		Street:       parsed.Logradouro,
		Neighborhood: parsed.Bairro,
		City:         parsed.Localidade,
		State:        parsed.UF,
		NotFound:     false,
	}, nil
}
