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
	OK        bool   `json:"ok"`
	IP        string `json:"ip,omitempty"`
	LatencyMs int64  `json:"latencyMs"`
	Error     string `json:"error,omitempty"`
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

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.ipify.org?format=json", nil)
	resp, err := client.Do(req)
	if err != nil {
		return proxyProbeResult{OK: false, Error: err.Error(), LatencyMs: elapsed()}
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return proxyProbeResult{OK: false, Error: fmt.Sprintf("HTTP %d", resp.StatusCode), LatencyMs: elapsed()}
	}
	var body struct {
		IP string `json:"ip"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&body)
	return proxyProbeResult{OK: true, IP: body.IP, LatencyMs: elapsed()}
}
