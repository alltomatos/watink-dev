package services

import (
	"os"

	"github.com/alltomatos/watinkdev/business/internal/domain"
)

// NewRedisServiceFromEnv creates a domain.RedisService from the REDIS_URL env var.
func NewRedisServiceFromEnv() (domain.RedisService, error) {
	return domain.NewRedisService(domain.RedisServiceConfig{
		URL: redisURLFromEnv(),
	})
}

func redisURLFromEnv() string {
	url := os.Getenv("REDIS_URL")
	if url == "" {
		url = "redis://localhost:6379"
	}
	return url
}
