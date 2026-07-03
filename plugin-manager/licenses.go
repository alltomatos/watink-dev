package main

import (
	"encoding/json"
	"net/http"
	"os"
)

// knownPluginSlugs é a lista estática de plugins "pro" conhecidos por esta
// instância (docs/agents/plugins.md: "Plugins reais que restam: helpdesk e
// webchat"). Quando o catálogo real do Hub existir, esta lista deixa de ser
// hardcoded e passa a vir do catálogo sincronizado — fora de escopo aqui.
var knownPluginSlugs = []string{"helpdesk", "webchat"}

// LicenseInfo é o status de licença resolvido para um único plugin, no
// formato exposto por GET /internal/licenses (contrato com o business,
// docs/agents/plugins.md linha 58).
type LicenseInfo struct {
	Status    string `json:"status"`
	TenantCap int    `json:"tenantCap"`
	Exp       int64  `json:"exp"`
}

// LicensesResponse é o corpo de resposta de GET /internal/licenses.
type LicensesResponse struct {
	Licenses map[string]LicenseInfo `json:"licenses"`
}

// Valores possíveis de LicenseInfo.Status.
const (
	LicenseStatusActive     = "active"
	LicenseStatusReadOnly   = "readonly"
	LicenseStatusBlocked    = "blocked"
	LicenseStatusUnlicensed = "unlicensed"
)

// resolveLicenses monta o mapa slug -> LicenseInfo para todos os plugins
// conhecidos desta instância, decidindo entre o modo stub de dev (sem
// HUB_URL) e a resolução real via Hub (quando implementada).
func resolveLicenses() map[string]LicenseInfo {
	licenses := make(map[string]LicenseInfo, len(knownPluginSlugs))

	if hubURLConfigured() {
		for _, slug := range knownPluginSlugs {
			licenses[slug] = resolveLicenseFromHub(slug)
		}
		return licenses
	}

	for _, slug := range knownPluginSlugs {
		licenses[slug] = stubLicense()
	}
	return licenses
}

// hubURLConfigured indica se HUB_URL foi setado no ambiente. Quando vazio,
// a instância está em modo stub de desenvolvimento — mesmo padrão já usado
// pelo hubclient do watink-saas ("sempre válido" quando HUB_URL vazio em dev).
func hubURLConfigured() bool {
	return os.Getenv("HUB_URL") != ""
}

// stubLicense é o status retornado em modo stub de dev: todo plugin "pro" é
// tratado como licenciado e válido, com teto ilimitado (tenantCap=0) e sem
// expiração (exp=0), destravando o desenvolvimento do resto do sistema sem
// depender do Hub existir.
func stubLicense() LicenseInfo {
	return LicenseInfo{
		Status:    LicenseStatusActive,
		TenantCap: 0,
		Exp:       0,
	}
}

// resolveLicenseFromHub é o ponto de entrada para a resolução REAL de
// licença via Hub, usando business/pkg/licensetoken.Verify() para validar o
// token Ed25519 cacheado localmente (heartbeat). Ainda NÃO é chamada em
// produção porque hubURLConfigured() só retorna true quando HUB_URL está
// configurado, e o heartbeat real com o Hub está fora do escopo desta tarefa.
//
// TODO(hub-heartbeat): quando o heartbeat real existir, esta função deve:
//  1. Ler o token de licença cacheado para `slug` (ex.: de LicenseStatusFile
//     ou de um cache em memória atualizado pelo heartbeat).
//  2. Chamar licensetoken.Verify(token, publicKeys) para validar assinatura
//     Ed25519 + exp.
//  3. Mapear o resultado para LicenseInfo{status, tenantCap, exp}, aplicando
//     o degradeMode (claims.Degrade) quando o token estiver expirado.
//  4. Em caso de erro/token ausente, retornar status "unlicensed" (fail-closed).
func resolveLicenseFromHub(slug string) LicenseInfo {
	// Fail-closed: sem implementação real ainda, nunca reportar "active"
	// para um caminho que não verificou assinatura de verdade.
	return LicenseInfo{
		Status:    LicenseStatusUnlicensed,
		TenantCap: 0,
		Exp:       0,
	}
}

// internalLicensesHandler implementa GET /internal/licenses — endpoint
// interno consumido só pelo business (nunca pelo frontend), que devolve o
// status de licença de todos os plugins conhecidos pela instância.
func internalLicensesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LicensesResponse{Licenses: resolveLicenses()})
}
