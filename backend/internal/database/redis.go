package database

import (
	"context"
	"log"

	"aetha-backend/internal/config"

	"github.com/redis/go-redis/v9"
)

func ConnectRedis(cfg config.RedisConfig) *redis.Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr,
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	log.Println("✅ Connected to Redis")
	return rdb
}
