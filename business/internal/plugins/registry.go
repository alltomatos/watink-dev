package plugins

import (
	"log"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/sdk"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LicenseFetcher is the small interface PluginRegistry needs from
// pluginlicense.Client — only GetLicense. Kept separate from the concrete
// client so tests can supply a local fake without a global mock
// (docs/agents/plugins.md, CLAUDE.md "Testes: Mocks em structs locais").
type LicenseFetcher interface {
	GetLicense(pluginSlug string) (LicenseInfo, error)
}

// LicenseInfo mirrors pluginlicense.LicenseInfo (status/tenantCap/exp) so
// this package does not need to import pluginlicense directly — it depends
// only on the LicenseFetcher interface, satisfied by *pluginlicense.Client
// via the adapter in main.go.
type LicenseInfo struct {
	Status    string
	TenantCap int
	Exp       int64
}

// PluginRegistry implements the real GetStatus(tenantId, pluginSlug) cross
// of LICENSE (via LicenseFetcher, backed by the plugin-manager) x ALLOCATION
// (PluginInstallations in the core DB). See docs/adr/0024 and
// docs/agents/plugins.md § "Gating em runtime".
type PluginRegistry struct {
	db      *gorm.DB
	license LicenseFetcher
}

// NewPluginRegistry builds the registry via constructor injection (DI pura)
// — db and license client are always passed in, never resolved through a
// global/service locator.
func NewPluginRegistry(db *gorm.DB, license LicenseFetcher) *PluginRegistry {
	return &PluginRegistry{db: db, license: license}
}

// GetStatus crosses allocation x license for (tenantId, pluginSlug):
//
//   - Not allocated (no active PluginInstallation row) -> StatusBlocked.
//     Allocation is never treated as license authority (ADR 0024) but the
//     absence of it is a hard gate regardless of license state.
//   - Allocated + license "active"    -> StatusActive.
//   - Allocated + license "readonly"  -> StatusReadOnly.
//   - Allocated + license "blocked"/"unlicensed" (or anything unrecognized)
//     -> StatusBlocked.
//   - Allocated but the license query itself failed (plugin-manager down,
//     no cache) -> StatusBlocked. This is a deliberate fail-closed choice:
//     an indeterminate license must never be treated as valid (ADR 0024,
//     "Edge cases": ações de crescimento e runtime ficam fail-closed quando
//     o status é indeterminado).
func (r *PluginRegistry) GetStatus(tenantID uuid.UUID, pluginSlug string) sdk.PluginStatus {
	allocated, err := r.isAllocated(tenantID, pluginSlug)
	if err != nil {
		log.Printf("[plugins] erro ao consultar alocação de %s para tenant %s: %v", pluginSlug, tenantID, err)
		return sdk.StatusBlocked
	}
	if !allocated {
		return sdk.StatusBlocked
	}

	info, err := r.license.GetLicense(pluginSlug)
	if err != nil {
		// Fail-closed: plugin-manager indisponível e sem cache. Nunca liberar
		// uma licença indeterminada.
		log.Printf("[plugins] licença indeterminada para %s (fail-closed): %v", pluginSlug, err)
		return sdk.StatusBlocked
	}

	switch info.Status {
	case "active":
		return sdk.StatusActive
	case "readonly":
		return sdk.StatusReadOnly
	default:
		// "blocked", "unlicensed" ou qualquer status desconhecido.
		return sdk.StatusBlocked
	}
}

// isAllocated checks PluginInstallations for an active row (tenantId,
// pluginId=slug). A missing row or active=false both mean "not allocated".
func (r *PluginRegistry) isAllocated(tenantID uuid.UUID, pluginSlug string) (bool, error) {
	if r.db == nil {
		return false, nil
	}
	var count int64
	err := r.db.Session(&gorm.Session{NewDB: true}).
		Model(&models.PluginInstallation{}).
		Where(`"tenantId" = ? AND "pluginId" = ? AND active = ?`, tenantID, pluginSlug, true).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
