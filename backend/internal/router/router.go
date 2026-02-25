package router

import (
	"time"

	"aetha-backend/internal/handlers"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func Setup(app *fiber.App, nh *handlers.NovelHandler, allowedOrigins string) {
	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))
	app.Use(limiter.New(limiter.Config{
		Max:               100,
		Expiration:         1 * time.Minute,
		LimiterMiddleware:  limiter.SlidingWindow{},
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error": "Too many requests. Please slow down.",
			})
		},
	}))

	// API routes
	api := app.Group("/api")
	{
		api.Get("/health", handlers.HealthCheck)

		// Novels
		api.Get("/novels", nh.GetNovels)
		api.Get("/novels/:slug", nh.GetNovelBySlug)
		api.Get("/novels/:slug/chapters/:number", nh.GetChapter)

		// Search
		api.Get("/search", nh.Search)

		// Genres
		api.Get("/genres", nh.GetGenres)
	}
}
