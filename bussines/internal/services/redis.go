package services

import (
	"context"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client
var ctx = context.Background()

func ConnectRedis() {
	url := os.Getenv("REDIS_URL")
	if url == "" {
		url = "redis://localhost:6379"
	}

	opts, err := redis.ParseURL(url)
	if err != nil {
		panic(err)
	}

	RedisClient = redis.NewClient(opts)
}

func GetRedis() *redis.Client {
	return RedisClient
}

func SetLock(key string, value string, expiration time.Duration) (bool, error) {
	return RedisClient.SetNX(ctx, key, value, expiration).Result()
}

func DelLock(key string) error {
	return RedisClient.Del(ctx, key).Err()
}
