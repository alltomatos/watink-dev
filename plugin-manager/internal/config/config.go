package config

import "os"

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	FrontendURL string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	dbURL := os.Getenv("DATABASE_URL")
	// Fallback for development if not set, though it should be set in docker-compose
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/watink?sslmode=disable"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "mysecret"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://app.localhost"
	}

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		JWTSecret:   jwtSecret,
		FrontendURL: frontendURL,
	}
}
