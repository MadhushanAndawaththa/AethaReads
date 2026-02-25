package handlers

import (
	"github.com/gofiber/fiber/v2"
)

// GET /api/health - Health check endpoint
func HealthCheck(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "ok",
		"service": "aetha-backend",
		"version": "1.0.0",
	})
}
