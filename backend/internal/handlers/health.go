package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

type HealthHandler struct {
	db  *sqlx.DB
	rdb *redis.Client
}

func NewHealthHandler(db *sqlx.DB, rdb *redis.Client) *HealthHandler {
	return &HealthHandler{db: db, rdb: rdb}
}

func (h *HealthHandler) Check(c *fiber.Ctx) error {
	postgresOK := true
	redisOK := true

	if h.db == nil || h.db.QueryRowxContext(c.Context(), "SELECT 1").Err() != nil {
		postgresOK = false
	}
	if h.rdb == nil || h.rdb.Ping(c.Context()).Err() != nil {
		redisOK = false
	}

	status := "ok"
	code := fiber.StatusOK
	if !postgresOK || !redisOK {
		status = "degraded"
		code = fiber.StatusServiceUnavailable
	}

	return c.Status(code).JSON(fiber.Map{
		"status":    status,
		"service":   "aetha-backend",
		"version":   "1.0.0",
		"postgres":  postgresOK,
		"redis":     redisOK,
		"timestamp": time.Now().UTC(),
	})
}
