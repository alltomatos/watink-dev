package controllers

import (
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
)

func TestParseProxyLine_Webshare(t *testing.T) {
	host, port, user, pass, err := parseProxyLine("38.154.193.44:5317:kpofqjyb:bvnf3gpk9utd")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if host != "38.154.193.44" || port != 5317 || user != "kpofqjyb" || pass != "bvnf3gpk9utd" {
		t.Fatalf("parsed wrong: host=%q port=%d user=%q pass=%q", host, port, user, pass)
	}
}

func TestParseProxyLine_HostPortOnly(t *testing.T) {
	host, port, user, pass, err := parseProxyLine("1.2.3.4:8080")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if host != "1.2.3.4" || port != 8080 || user != "" || pass != "" {
		t.Fatalf("parsed wrong: host=%q port=%d user=%q pass=%q", host, port, user, pass)
	}
}

func TestParseProxyLine_Malformed(t *testing.T) {
	cases := []string{
		"justhost",                // 1 part
		"host:notaport:user:pass", // bad port
		"host:99999:user:pass",    // port out of range
		":5317:user:pass",         // empty host
		"a:b:c",                   // 3 parts
	}
	for _, line := range cases {
		if _, _, _, _, err := parseProxyLine(line); err == nil {
			t.Fatalf("expected error for line %q, got nil", line)
		}
	}
}

func TestToProxyResponse_NeverLeaksPassword(t *testing.T) {
	p := models.Proxy{
		ID: 7, Label: "res-1", Scheme: "socks5", Host: "h", Port: 1080,
		Username: "u", PasswordEnc: "ENCRYPTED_SECRET", Status: "active",
	}
	resp := toProxyResponse(p)

	if _, exists := resp["password"]; exists {
		t.Fatal("response must not contain 'password'")
	}
	if _, exists := resp["passwordEnc"]; exists {
		t.Fatal("response must not contain 'passwordEnc'")
	}
	for _, v := range resp {
		if s, ok := v.(string); ok && s == "ENCRYPTED_SECRET" {
			t.Fatal("ciphertext leaked into response")
		}
	}
	if resp["hasPassword"] != true {
		t.Fatalf("hasPassword should be true, got %v", resp["hasPassword"])
	}
}

func TestNormalizeScheme(t *testing.T) {
	cases := map[string]string{
		"":          "http",
		"HTTP":      "http",
		"socks5":    "socks5",
		"socks5://": "socks5",
		"  http  ":  "http",
	}
	for in, want := range cases {
		if got := normalizeScheme(in); got != want {
			t.Fatalf("normalizeScheme(%q)=%q want %q", in, got, want)
		}
	}
}
