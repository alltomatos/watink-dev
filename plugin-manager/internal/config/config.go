package config

import "os"

// Config holds all configuration for the service
type Config struct {
	Environment    string
	DatabaseURL    string
	PluginCDNURL   string
	Port           string
	MarketplaceURL string
	MarketplaceKey string
}

// Load reads configuration from environment variables
// Constants for Watink Marketplace (Fixed Configuration)
const (
	MarketplaceURL = "https://uskylkkwbivdijhdozob.supabase.co"
	MarketplaceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVza3lsa2t3Yml2ZGlqaGRvem9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczOTAzOTAsImV4cCI6MjA4Mjk2NjM5MH0.ShnuNVuuC-KTxle5VM6JqLTwtC6TPRGjhf1nLg_nGdc"
)

func Load() *Config {
	return &Config{
		Environment:    getEnv("ENVIRONMENT", "production"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres:postgres@db:5432/watink?sslmode=disable"),
		PluginCDNURL:   getEnv("PLUGIN_CDN_URL", "https://plugins.watink.com"),
		Port:           getEnv("PORT", "3005"),
		MarketplaceURL: MarketplaceURL,
		MarketplaceKey: MarketplaceKey,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
