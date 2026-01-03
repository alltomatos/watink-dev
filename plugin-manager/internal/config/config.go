package config

import "os"

// Config holds all configuration for the service
type Config struct {
	Environment  string
	DatabaseURL  string
	PluginCDNURL string
	Port         string
}

// Load reads configuration from environment variables
func Load() *Config {
	return &Config{
		Environment:  getEnv("ENVIRONMENT", "development"),
		DatabaseURL:  getEnv("DATABASE_URL", "postgres://postgres:postgres@db:5432/watink?sslmode=disable"),
		PluginCDNURL: getEnv("PLUGIN_CDN_URL", "https://plugins.watink.com"),
		Port:         getEnv("PORT", "3005"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
