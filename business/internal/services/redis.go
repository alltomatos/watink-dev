package services

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/redis/go-redis/v9"
)

// NewRedisServiceFromEnv creates a domain.RedisService from the REDIS_URL env var.
// This is the ONLY way to create a Redis instance — no globals.
func NewRedisServiceFromEnv() (domain.RedisService, error) {
	return domain.NewRedisService(domain.RedisServiceConfig{
		URL: redisURLFromEnv(),
	})
}

// redisURLFromEnv returns the Redis URL from environment or default
func redisURLFromEnv() string {
	url := os.Getenv("REDIS_URL")
	if url == "" {
		url = "redis://localhost:6379"
	}
	return url
}

// DEPRECATED: Global RedisClient — kept temporarily for compilation.
// All consumers must migrate to domain.RedisService injection.
// Will be removed after Fase 4B migration is complete.
var RedisClient *redis.Client

// DEPRECATED: Global ctx — removed. Use context.Background() or request context.
var ctx = context.Background()

// DEPRECATED: ConnectRedis — use NewRedisServiceFromEnv() instead.
// Kept temporarily for backward compatibility during migration.
func ConnectRedis() {
	log.Printf("[DEPRECATION WARNING] ConnectRedis called")
	url := redisURLFromEnv()
	opts, err := redis.ParseURL(url)
	if err != nil {
		panic(err)
	}
	RedisClient = redis.NewClient(opts)
}

// DEPRECATED: GetRedis — use domain.RedisService injection instead.
func GetRedis() *redis.Client {
	log.Printf("[DEPRECATION WARNING] GetRedis called")
	return RedisClient
}

// DEPRECATED: SetLock — use domain.RedisService.SetLock() instead.
func SetLock(key string, value string, expiration time.Duration) (bool, error) {
	log.Printf("[DEPRECATION WARNING] SetLock called")
	return RedisClient.SetNX(ctx, key, value, expiration).Result()
}

// DEPRECATED: DelLock — use domain.RedisService.DelLock() instead.
func DelLock(key string) error {
	log.Printf("[DEPRECATION WARNING] DelLock called")
	return RedisClient.Del(ctx, key).Err()
}
