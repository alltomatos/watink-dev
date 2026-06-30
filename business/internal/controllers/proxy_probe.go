package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"time"

	xproxy "golang.org/x/net/proxy"
)

// proxyProbeResult is the outcome of a connectivity test through a proxy.
type proxyProbeResult struct {
	OK          bool   `json:"ok"`
	IP          string `json:"ip,omitempty"`
	City        string `json:"city,omitempty"`
	Country     string `json:"country,omitempty"`
	CountryCode string `json:"countryCode,omitempty"`
	LatencyMs   int64  `json:"latencyMs"`
	Error       string `json:"error,omitempty"`
}

const proxyProbeTimeout = 12 * time.Second

// probeProxy dials a fixed IP-echo endpoint THROUGH the given proxy to verify it
// works and report the egress IP. Supports scheme "http" and "socks5" — the two
// schemes the engine (whatsmeow) accepts. The probe runs server-side, so it
// validates exactly the path a WhatsApp session would use. timeout bounds the
// whole attempt (use a shorter one for bulk test-all).
func probeProxy(scheme, host string, port int, username, password string, timeout time.Duration) proxyProbeResult {
	if timeout <= 0 {
		timeout = proxyProbeTimeout
	}
	start := time.Now()
	elapsed := func() int64 { return time.Since(start).Milliseconds() }
	hostport := net.JoinHostPort(host, strconv.Itoa(port))

	transport := &http.Transport{}
	switch scheme {
	case "socks5":
		var auth *xproxy.Auth
		if username != "" || password != "" {
			auth = &xproxy.Auth{User: username, Password: password}
		}
		dialer, err := xproxy.SOCKS5("tcp", hostport, auth, xproxy.Direct)
		if err != nil {
			return proxyProbeResult{OK: false, Error: fmt.Sprintf("socks5 dialer: %v", err), LatencyMs: elapsed()}
		}
		if cd, ok := dialer.(xproxy.ContextDialer); ok {
			transport.DialContext = cd.DialContext
		} else {
			transport.DialContext = func(_ context.Context, network, addr string) (net.Conn, error) {
				return dialer.Dial(network, addr)
			}
		}
	default: // http
		u := &url.URL{Scheme: "http", Host: hostport}
		if username != "" || password != "" {
			u.User = url.UserPassword(username, password)
		}
		transport.Proxy = http.ProxyURL(u)
	}

	client := &http.Client{Transport: transport, Timeout: timeout}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// ip-api.com devolve IP de saída + geolocalização (cidade/país) numa só
	// chamada. Como cada proxy sai por um IP diferente, o rate-limit por IP do
	// ip-api não é atingido mesmo testando vários. (Free tier = HTTP.)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, probeEchoURL, nil)
	resp, err := client.Do(req)
	if err != nil {
		// Erro de TRANSPORTE/dial → o proxy não roteia. Único caso que rebaixa
		// (A1/ADR 0021: geo é best-effort, falha do ip-api NÃO invalida o proxy).
		return proxyProbeResult{OK: false, Error: err.Error(), LatencyMs: elapsed()}
	}
	defer func() { _ = resp.Body.Close() }()
	// QUALQUER resposta HTTP (mesmo 429/500 do ip-api) prova que o proxy roteia → OK.
	return interpretProbeResponse(resp, elapsed())
}

// probeEchoURL é o endpoint de echo+geo (ip-api). Variável para permitir
// override em teste; geo é best-effort.
var probeEchoURL = "http://ip-api.com/json?fields=status,country,countryCode,city,query"

// interpretProbeResponse trata uma resposta recebida ATRAVÉS do proxy. Neste
// ponto o proxy JÁ está provado funcional (houve roundtrip HTTP), logo OK=true
// sempre. Geo é preenchida só em 200+`status:success`; um status ruim do serviço
// de geo (429/5xx) NÃO rebaixa o proxy.
func interpretProbeResponse(resp *http.Response, elapsedMs int64) proxyProbeResult {
	result := proxyProbeResult{OK: true, LatencyMs: elapsedMs}
	if resp.StatusCode != http.StatusOK {
		return result // proxy OK, geo indisponível
	}
	var body struct {
		Status      string `json:"status"`
		Country     string `json:"country"`
		CountryCode string `json:"countryCode"`
		City        string `json:"city"`
		Query       string `json:"query"`
	}
	if json.NewDecoder(resp.Body).Decode(&body) == nil && body.Status == "success" {
		result.IP = body.Query
		result.City = body.City
		result.Country = body.Country
		result.CountryCode = body.CountryCode
	}
	return result
}
