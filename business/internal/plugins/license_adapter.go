package plugins

import "github.com/alltomatos/watinkdev/business/internal/pluginlicense"

// pluginLicenseClientAdapter adapts *pluginlicense.Client to the
// LicenseFetcher interface this package depends on, translating
// pluginlicense.LicenseInfo into the local LicenseInfo shape. Kept as a thin
// adapter (not a reverse dependency) so plugins/registry.go never imports
// pluginlicense types directly — only the LicenseFetcher interface, per the
// project's "mocks in local structs, no global mock" testing convention.
type pluginLicenseClientAdapter struct {
	client *pluginlicense.Client
}

// NewLicenseFetcher wraps a *pluginlicense.Client so it satisfies
// LicenseFetcher. Used from main.go to inject the real client into
// NewPluginRegistry (DI pura via construtor).
func NewLicenseFetcher(client *pluginlicense.Client) LicenseFetcher {
	return &pluginLicenseClientAdapter{client: client}
}

func (a *pluginLicenseClientAdapter) GetLicense(pluginSlug string) (LicenseInfo, error) {
	info, err := a.client.GetLicense(pluginSlug)
	if err != nil {
		return LicenseInfo{}, err
	}
	return LicenseInfo{
		Status:    info.Status,
		TenantCap: info.TenantCap,
		Exp:       info.Exp,
	}, nil
}
