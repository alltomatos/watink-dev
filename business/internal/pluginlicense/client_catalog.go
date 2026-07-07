package pluginlicense

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

// CatalogPlugin espelha um item do contrato de GET /api/v1/plugins/catalog
// exposto pelo plugin-manager (que por sua vez proxeia o Watink Hub). As tags
// json seguem exatamente o contrato — price é número (float).
type CatalogPlugin struct {
	ID              string   `json:"id"`
	Slug            string   `json:"slug"`
	Name            string   `json:"name"`
	Description     string   `json:"description"`
	LongDescription string   `json:"longDescription"`
	Version         string   `json:"version"`
	Type            string   `json:"type"`
	Category        string   `json:"category"`
	Price           float64  `json:"price"`
	IconURL         string   `json:"iconUrl"`
	Screenshots     []string `json:"screenshots"`
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

// checkoutRequestBody é o corpo enviado a POST /api/v1/plugins/checkout no
// plugin-manager -- {"slug": "..."}. O plugin-manager é quem traduz esse
// campo para {instanceId, pluginSlug} antes de chamar o Hub (essa tradução
// não é responsabilidade do business).
type checkoutRequestBody struct {
	Slug string `json:"slug"`
}

// Checkout solicita ao plugin-manager a criação/reativação da licença do
// plugin `slug` junto ao Hub (POST /api/v1/plugins/checkout). Sem cache --
// é uma ação, não uma leitura, e o controller decide a política de
// resposta ao cliente em qualquer caso.
//
// IMPORTANTE: sucesso aqui (200/201) significa apenas que o Hub CRIOU ou
// REATIVOU a licença -- o token assinado só chega ao plugin-manager no
// próximo heartbeat (até heartbeatIntervalMin minutos depois, default
// 15min, ou o fallback do plugin-manager). Ou seja, um Checkout
// bem-sucedido NÃO torna o plugin ativo imediatamente; o chamador
// (PluginController.Activate) ainda responde 402 e cabe ao cliente tentar
// ativar de novo mais tarde (poll).
func (c *Client) Checkout(slug string) error {
	payload, err := json.Marshal(checkoutRequestBody{Slug: slug})
	if err != nil {
		return fmt.Errorf("pluginlicense: erro ao montar payload de checkout: %w", err)
	}

	resp, err := c.httpClient.Post(c.baseURL+"/api/v1/plugins/checkout", "application/json", bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("pluginlicense: erro ao solicitar checkout no plugin-manager: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("pluginlicense: checkout retornou status %d", resp.StatusCode)
	}
	return nil
}
