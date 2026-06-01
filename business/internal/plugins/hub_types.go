package plugins

type HubPlugin struct {
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

type CatalogResponse struct {
	Offline bool        `json:"offline"`
	Plugins []HubPlugin `json:"plugins"`
}

type InstalledResponse struct {
	Active       []string               `json:"active"`
	Statuses     map[string]string      `json:"statuses"`
	Entitlements map[string]interface{} `json:"entitlements,omitempty"`
}

type CreateCheckoutResponse struct {
	CheckoutURL string `json:"checkoutUrl"`
}

type tenantPluginsStore map[string][]string

type licenseStatusStore map[string]string
