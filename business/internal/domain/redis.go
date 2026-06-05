package domain

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisService defines the interface for Redis operations.
// Enables dependency injection and eliminates global RedisClient.
type RedisService interface {
	// SetLock acquires a distributed lock via SetNX with expiration
	SetLock(key string, value string, expiration time.Duration) (bool, error)

	// DelLock releases a lock by key
	DelLock(key string) error

	// Subscribe subscribes to a Redis Pub/Sub channel and returns the subscription
	Subscribe(ctx context.Context, channel string) *redis.PubSub

	// Publish publishes a message to a Redis Pub/Sub channel
	Publish(ctx context.Context, channel string, message interface{}) error

	// Ping tests the Redis connection
	Ping(ctx context.Context) error
}

// RedisServiceConfig holds configuration for creating a RedisService
type RedisServiceConfig struct {
	URL string
}

// RedisServiceImpl implements RedisService interface
type RedisServiceImpl struct {
	client *redis.Client
}

// NewRedisService creates a new RedisService instance with proper DI.
// Returns error if connection fails — no silent global state.
func NewRedisService(config RedisServiceConfig) (RedisService, error) {
	opts, err := redis.ParseURL(config.URL)
	if err != nil {
		return nil, err
	}

	client := redis.NewClient(opts)

	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}

	return &RedisServiceImpl{client: client}, nil
}

// SetLock acquires a distributed lock via SetNX
func (rs *RedisServiceImpl) SetLock(key string, value string, expiration time.Duration) (bool, error) {
	return rs.client.SetNX(context.Background(), key, value, expiration).Result()
}

// DelLock releases a lock by key
func (rs *RedisServiceImpl) DelLock(key string) error {
	return rs.client.Del(context.Background(), key).Err()
}

// Subscribe subscribes to a Redis Pub/Sub channel
func (rs *RedisServiceImpl) Subscribe(ctx context.Context, channel string) *redis.PubSub {
	return rs.client.Subscribe(ctx, channel)
}

// Publish publishes a message to a Redis Pub/Sub channel
func (rs *RedisServiceImpl) Publish(ctx context.Context, channel string, message interface{}) error {
	return rs.client.Publish(ctx, channel, message).Err()
}

// Ping tests the Redis connection
func (rs *RedisServiceImpl) Ping(ctx context.Context) error {
	return rs.client.Ping(ctx).Err()
}
