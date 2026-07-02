package services

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// nominatimUserAgent identifies Watink to the Nominatim usage policy, which
// rejects/rate-limits requests without an identifiable User-Agent.
const nominatimUserAgent = "Watink-CRM/1.0 (contato via configuração do tenant)"

// nominatimResult mirrors the subset of the Nominatim /search response we
// care about. lat/lon come back as JSON strings, not numbers.
type nominatimResult struct {
	Lat string `json:"lat"`
	Lon string `json:"lon"`
}

// Geocode resolves a Brazilian postal address to latitude/longitude via
// Nominatim/OpenStreetMap. It is deliberately best-effort: it never returns
// an error to the caller. Any failure (network, timeout, empty result,
// malformed response) is logged and results in (nil, nil), so callers can
// always save the address without lat/lng rather than block on geocoding.
func Geocode(ctx context.Context, street, number, neighborhood, city, state string) (lat, lng *float64) {
	query := strings.TrimSpace(strings.Join(filterNonEmpty([]string{
		street, number, neighborhood, city, state,
	}), " ") + ", Brazil")

	reqURL := "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + url.QueryEscape(query)

	client := &http.Client{Timeout: 5 * time.Second}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		log.Printf("geocode: failed to build request: %v", err)
		return nil, nil
	}
	req.Header.Set("User-Agent", nominatimUserAgent)

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("geocode: request failed: %v", err)
		return nil, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("geocode: unexpected status %d from Nominatim", resp.StatusCode)
		return nil, nil
	}

	var results []nominatimResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		log.Printf("geocode: failed to decode response: %v", err)
		return nil, nil
	}

	if len(results) == 0 {
		return nil, nil
	}

	parsedLat, err := strconv.ParseFloat(results[0].Lat, 64)
	if err != nil {
		log.Printf("geocode: failed to parse lat %q: %v", results[0].Lat, err)
		return nil, nil
	}
	parsedLon, err := strconv.ParseFloat(results[0].Lon, 64)
	if err != nil {
		log.Printf("geocode: failed to parse lon %q: %v", results[0].Lon, err)
		return nil, nil
	}

	return &parsedLat, &parsedLon
}

// filterNonEmpty drops blank fields so the assembled query doesn't carry
// stray double spaces from missing address parts (e.g. no complement).
func filterNonEmpty(parts []string) []string {
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if strings.TrimSpace(p) != "" {
			out = append(out, strings.TrimSpace(p))
		}
	}
	return out
}
