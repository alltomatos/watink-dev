package pluginlicense

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// CatalogPlugin espelha um item do contrato de GET /api/v1/plugins/catalog
// exposto pelo plugin-manager (que por sua vez proxeia o Watink Hub). As tags
// json seguem exatamente o contrato — price é número (float).
type CatalogPlugin struct {
	ID          string  `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Version     string  `json:"version"`
	Type        string  `json:"type"`
	Category    string  `json:"category"`
	Price       float64 `json:"price"`
	IconURL     string  `json:"iconUrl"`
}

// CatalogResponse é o corpo de resposta de GET /api/v1/plugins/catalog:
// {"offline":bool,"plugins":[...]}. Offline sinaliza que o plugin-manager não
// conseguiu falar com o Hub (catálogo pode vir vazio/degradado).
type CatalogResponse struct {
	Offline bool            `json:"offline"`
	Plugins []CatalogPlugin `json:"plugins"`
}

// InstanceResponse é o corpo de resposta de GET /api/v1/plugins/instance:
// {"instanceId":"INST-<ts>-<hash>"}.
type InstanceResponse struct {
	InstanceID string `json:"instanceId"`
}

// GetCatalog consulta GET /api/v1/plugins/catalog no plugin-manager e devolve o
// shape {offline, plugins}. Diferente de GetLicense, NÃO usa cache — é uma
// leitura simples e o controller decide a política de fail-safe em erro.
// Retorna erro em falha de rede ou status != 200.
func (c *Client) GetCatalog() (CatalogResponse, error) {
	resp, err := c.httpClient.Get(c.baseURL + "/api/v1/plugins/catalog")
	if err != nil {
		return CatalogResponse{}, fmt.Errorf("pluginlicense: erro ao consultar catálogo do plugin-manager: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return CatalogResponse{}, fmt.Errorf("pluginlicense: catálogo retornou status %d", resp.StatusCode)
	}

	var body CatalogResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return CatalogResponse{}, fmt.Errorf("pluginlicense: erro ao decodificar catálogo do plugin-manager: %w", err)
	}
	return body, nil
}

// GetInstance consulta GET /api/v1/plugins/instance no plugin-manager e devolve
// o instanceId da instância. Sem cache; retorna erro em falha de rede ou
// status != 200 (o controller decide o fail-safe).
func (c *Client) GetInstance() (InstanceResponse, error) {
	resp, err := c.httpClient.Get(c.baseURL + "/api/v1/plugins/instance")
	if err != nil {
		return InstanceResponse{}, fmt.Errorf("pluginlicense: erro ao consultar instância no plugin-manager: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return InstanceResponse{}, fmt.Errorf("pluginlicense: instância retornou status %d", resp.StatusCode)
	}

	var body InstanceResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return InstanceResponse{}, fmt.Errorf("pluginlicense: erro ao decodificar instância do plugin-manager: %w", err)
	}
	return body, nil
}
