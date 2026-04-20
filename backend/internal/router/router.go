package router

import (
	"time"

	"aetha-backend/internal/handlers"
	"aetha-backend/internal/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

type Handlers struct {
	Novel     *handlers.NovelHandler
	Auth      *handlers.AuthHandler
	Author    *handlers.AuthorHandler
	Community *handlers.CommunityHandler
}

func Setup(app *fiber.App, h *Handlers, allowedOrigins, jwtSecret string) {
	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))
	app.Use(limiter.New(limiter.Config{
		Max:               100,
		Expiration:        1 * time.Minute,
		LimiterMiddleware: limiter.SlidingWindow{},
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

		// ── Public novel/chapter routes ────────────────
		api.Get("/novels", h.Novel.GetNovels)
		api.Get("/novels/:slug", h.Novel.GetNovelBySlug)
		api.Get("/novels/:slug/chapters/:number", h.Novel.GetChapter)
		api.Get("/search", h.Novel.Search)
		api.Get("/genres", h.Novel.GetGenres)

		// ── Auth routes ────────────────
		auth := api.Group("/auth")
		auth.Post("/register", h.Auth.Register)
		auth.Post("/login", h.Auth.Login)
		auth.Get("/google", h.Auth.GoogleRedirect)
		auth.Get("/google/callback", h.Auth.GoogleCallback)
		auth.Post("/refresh", h.Auth.Refresh)
		auth.Post("/logout", middleware.RequireAuth(jwtSecret), h.Auth.Logout)
		auth.Get("/me", middleware.RequireAuth(jwtSecret), h.Auth.GetMe)

		// ── Author routes (auth required) ────────────────
		author := api.Group("/author", middleware.RequireAuth(jwtSecret), middleware.RequireRole("author", "admin"))
		author.Get("/novels", h.Author.GetMyNovels)
		author.Post("/novels", h.Author.CreateNovel)
		author.Put("/novels/:id", h.Author.UpdateNovel)
		author.Delete("/novels/:id", h.Author.DeleteNovel)
		author.Get("/novels/:id/chapters", h.Author.GetMyChapters)
		author.Post("/novels/:id/chapters", h.Author.CreateChapter)
		author.Get("/chapters/:id", h.Author.GetChapterForEdit)
		author.Put("/chapters/:id", h.Author.UpdateChapter)
		author.Delete("/chapters/:id", h.Author.DeleteChapter)
		author.Get("/stats", h.Author.GetStats)

		// Become author — any authenticated user
		api.Post("/author/become", middleware.RequireAuth(jwtSecret), h.Author.BecomeAuthor)

		// ── Community routes ────────────────
		// Comments (public read, auth write)
		api.Get("/chapters/:id/comments", h.Community.GetComments)
		api.Post("/chapters/:id/comments", middleware.RequireAuth(jwtSecret), h.Community.CreateComment)
		api.Delete("/comments/:id", middleware.RequireAuth(jwtSecret), h.Community.DeleteComment)

		// Reviews (public read, auth write)
		api.Get("/novels/:slug/reviews", h.Community.GetReviews)
		api.Post("/novels/:slug/reviews", middleware.RequireAuth(jwtSecret), h.Community.CreateReview)
		api.Post("/reviews/:id/vote", middleware.RequireAuth(jwtSecret), h.Community.VoteReview)

		// Follows
		api.Post("/novels/:slug/follow", middleware.RequireAuth(jwtSecret), h.Community.FollowNovel)
		api.Delete("/novels/:slug/follow", middleware.RequireAuth(jwtSecret), h.Community.UnfollowNovel)
		api.Get("/novels/:slug/following", middleware.RequireAuth(jwtSecret), h.Community.CheckFollowing)

		// Reading progress
		api.Put("/novels/:slug/progress", middleware.RequireAuth(jwtSecret), h.Community.UpdateProgress)
		api.Get("/novels/:slug/progress", middleware.RequireAuth(jwtSecret), h.Community.GetProgress)

		// ── User routes (auth required) ────────────────
		user := api.Group("/user", middleware.RequireAuth(jwtSecret))
		user.Get("/follows", h.Community.GetFollowedNovels)
		user.Get("/notifications", h.Community.GetNotifications)
		user.Post("/notifications/read", h.Community.MarkNotificationsRead)
		user.Get("/progress", h.Community.GetAllProgress)

		// ── Public user profiles ────────────────
		api.Get("/users/:username", h.Author.GetUserProfile)
	}
}
