package plugins

import (
	"errors"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/alltomatos/watinkdev/business/pkg/sdk"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

// fakeLicenseFetcher is a local test double for LicenseFetcher — per project
// convention (CLAUDE.md "Mocks em structs locais dentro de cada Test...
// sem variável global de mock"), it is NOT a package-level mock, just a
// small struct instantiated per test.
type fakeLicenseFetcher struct {
	info LicenseInfo
	err  error
}

func (f *fakeLicenseFetcher) GetLicense(pluginSlug string) (LicenseInfo, error) {
	return f.info, f.err
}

func createInstallation(t *testing.T, db *gorm.DB, tenantID uuid.UUID, slug string, active bool) {
	t.Helper()
	inst := models.PluginInstallation{
		TenantID: tenantID,
		PluginID: slug,
		Active:   true,
	}
	if err := db.Create(&inst).Error; err != nil {
		t.Fatalf("failed to seed PluginInstallation: %v", err)
	}
	if !active {
		// Active has `gorm:"default:true"` — GORM skips zero-value fields
		// with a default tag on Create, so `false` would silently become
		// `true`. Force it via an explicit UPDATE instead.
		if err := db.Model(&inst).Update("active", false).Error; err != nil {
			t.Fatalf("failed to force PluginInstallation.active=false: %v", err)
		}
	}
}

func TestPluginRegistry_GetStatus_AllocatedAndActive(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	createInstallation(t, db, tenantID, "helpdesk", true)

	fetcher := &fakeLicenseFetcher{info: LicenseInfo{Status: "active", TenantCap: 5}}
	reg := NewPluginRegistry(db, fetcher)

	status := reg.GetStatus(tenantID, "helpdesk")
	assert.Equal(t, sdk.StatusActive, status)
}

func TestPluginRegistry_GetStatus_AllocatedAndReadOnly(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	createInstallation(t, db, tenantID, "webchat", true)

	fetcher := &fakeLicenseFetcher{info: LicenseInfo{Status: "readonly"}}
	reg := NewPluginRegistry(db, fetcher)

	status := reg.GetStatus(tenantID, "webchat")
	assert.Equal(t, sdk.StatusReadOnly, status)
}

func TestPluginRegistry_GetStatus_AllocatedAndBlocked(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	createInstallation(t, db, tenantID, "webchat", true)

	fetcher := &fakeLicenseFetcher{info: LicenseInfo{Status: "blocked"}}
	reg := NewPluginRegistry(db, fetcher)

	status := reg.GetStatus(tenantID, "webchat")
	assert.Equal(t, sdk.StatusBlocked, status)
}

func TestPluginRegistry_GetStatus_AllocatedAndUnlicensed(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	createInstallation(t, db, tenantID, "webchat", true)

	fetcher := &fakeLicenseFetcher{info: LicenseInfo{Status: "unlicensed"}}
	reg := NewPluginRegistry(db, fetcher)

	status := reg.GetStatus(tenantID, "webchat")
	assert.Equal(t, sdk.StatusBlocked, status)
}

func TestPluginRegistry_GetStatus_NotAllocated_NoRow(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	// No PluginInstallation row at all for this tenant/slug.

	fetcher := &fakeLicenseFetcher{info: LicenseInfo{Status: "active"}}
	reg := NewPluginRegistry(db, fetcher)

	status := reg.GetStatus(tenantID, "helpdesk")
	assert.Equal(t, sdk.StatusBlocked, status, "not allocated must be blocked even if a license would otherwise be active")
}

func TestPluginRegistry_GetStatus_NotAllocated_InactiveRow(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	createInstallation(t, db, tenantID, "helpdesk", false)

	fetcher := &fakeLicenseFetcher{info: LicenseInfo{Status: "active"}}
	reg := NewPluginRegistry(db, fetcher)

	status := reg.GetStatus(tenantID, "helpdesk")
	assert.Equal(t, sdk.StatusBlocked, status)
}

func TestPluginRegistry_GetStatus_LicenseFetchError_FailsClosed(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	createInstallation(t, db, tenantID, "webchat", true)

	fetcher := &fakeLicenseFetcher{err: errors.New("plugin-manager indisponível e sem cache")}
	reg := NewPluginRegistry(db, fetcher)

	status := reg.GetStatus(tenantID, "webchat")
	assert.Equal(t, sdk.StatusBlocked, status, "license query failure must fail-closed, never Active")
}

func TestPluginRegistry_GetStatus_OtherTenantAllocation_DoesNotLeak(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()
	createInstallation(t, db, tenantA, "helpdesk", true)

	fetcher := &fakeLicenseFetcher{info: LicenseInfo{Status: "active"}}
	reg := NewPluginRegistry(db, fetcher)

	status := reg.GetStatus(tenantB, "helpdesk")
	assert.Equal(t, sdk.StatusBlocked, status, "tenant B has no allocation of its own")
}
