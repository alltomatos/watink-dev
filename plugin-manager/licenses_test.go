package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

// TestResolveLicenses_StubMode_NoHubURL confirma que, sem HUB_URL configurado
// (modo stub de dev), todo plugin conhecido volta "active" com teto
// ilimitado (tenantCap=0) e sem expiração (exp=0).
func TestResolveLicenses_StubMode_NoHubURL(t *testing.T) {
	t.Setenv("HUB_URL", "")

	licenses := resolveLicenses()

	if len(licenses) != len(knownPluginSlugs) {
		t.Fatalf("expected %d licenses, got %d", len(knownPluginSlugs), len(licenses))
	}

	for _, slug := range knownPluginSlugs {
		info, ok := licenses[slug]
		if !ok {
			t.Fatalf("missing license info for plugin %q", slug)
		}
		if info.Status != LicenseStatusActive {
			t.Errorf("plugin %q: expected status %q, got %q", slug, LicenseStatusActive, info.Status)
		}
		if info.TenantCap != 0 {
			t.Errorf("plugin %q: expected tenantCap 0 (unlimited), got %d", slug, info.TenantCap)
		}
		if info.Exp != 0 {
			t.Errorf("plugin %q: expected exp 0 (no expiration), got %d", slug, info.Exp)
		}
	}
}

// TestResolveLicenses_HubModeConfigured_FailsClosed confirma que, quando
// HUB_URL está configurado mas a resolução real via Hub ainda não está
// implementada, o resultado é fail-closed ("unlicensed") em vez de reportar
// falsamente "active".
func TestResolveLicenses_HubModeConfigured_FailsClosed(t *testing.T) {
	t.Setenv("HUB_URL", "https://hub.example.com/api/v1/hub")

	licenses := resolveLicenses()

	for _, slug := range knownPluginSlugs {
		info, ok := licenses[slug]
		if !ok {
			t.Fatalf("missing license info for plugin %q", slug)
		}
		if info.Status != LicenseStatusUnlicensed {
			t.Errorf("plugin %q: expected fail-closed status %q, got %q", slug, LicenseStatusUnlicensed, info.Status)
		}
	}
}

// TestInternalLicensesHandler_JSONShape confirma que o endpoint HTTP
// GET /internal/licenses devolve exatamente o formato de contrato esperado
// pelo business: {"licenses": {"<slug>": {"status", "tenantCap", "exp"}}}.
func TestInternalLicensesHandler_JSONShape(t *testing.T) {
	os.Setenv("HUB_URL", "")
	defer os.Unsetenv("HUB_URL")

	req := httptest.NewRequest(http.MethodGet, "/internal/licenses", nil)
	rec := httptest.NewRecorder()

	internalLicensesHandler(rec, req)

	res := rec.Result()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", res.StatusCode)
	}
	if ct := res.Header.Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}

	var body struct {
		Licenses map[string]struct {
			Status    string `json:"status"`
			TenantCap int    `json:"tenantCap"`
			Exp       int64  `json:"exp"`
		} `json:"licenses"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	helpdesk, ok := body.Licenses["helpdesk"]
	if !ok {
		t.Fatal("expected \"helpdesk\" key in licenses response")
	}
	if helpdesk.Status != "active" {
		t.Errorf("expected helpdesk status \"active\", got %q", helpdesk.Status)
	}
	if helpdesk.TenantCap != 0 {
		t.Errorf("expected helpdesk tenantCap 0, got %d", helpdesk.TenantCap)
	}
	if helpdesk.Exp != 0 {
		t.Errorf("expected helpdesk exp 0, got %d", helpdesk.Exp)
	}

	webchat, ok := body.Licenses["webchat"]
	if !ok {
		t.Fatal("expected \"webchat\" key in licenses response")
	}
	if webchat.Status != "active" {
		t.Errorf("expected webchat status \"active\", got %q", webchat.Status)
	}
}
