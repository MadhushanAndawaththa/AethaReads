package router

import (
	"fmt"
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

func newScopedLimiter(scope string, max int, expiration time.Duration, keyFn func(*fiber.Ctx) string) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:               max,
		Expiration:        expiration,
		LimiterMiddleware: limiter.SlidingWindow{},
		KeyGenerator:      keyFn,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error": fmt.Sprintf("Too many %s requests. Please slow down.", scope),
			})
		},
	})
}

func routeKey(c *fiber.Ctx, actor string) string {
	routePath := c.Path()
	if route := c.Route(); route != nil && route.Path != "" {
		routePath = route.Path
	}
	return fmt.Sprintf("%s:%s:%s", c.Method(), routePath, actor)
}

func apiLimiter() fiber.Handler {
	return newScopedLimiter("API", 300, time.Minute, func(c *fiber.Ctx) string {
		return routeKey(c, "ip:"+c.IP())
	})
}

func authWriteLimiter() fiber.Handler {
	return newScopedLimiter("auth", 10, 5*time.Minute, func(c *fiber.Ctx) string {
		return routeKey(c, "ip:"+c.IP())
	})
}

func communityWriteLimiter() fiber.Handler {
	return newScopedLimiter("community", 20, time.Minute, func(c *fiber.Ctx) string {
		actor := middleware.GetUserID(c)
		if actor == "" {
			actor = "ip:" + c.IP()
		} else {
			actor = "user:" + actor
		}
		return routeKey(c, actor)
	})
}

func progressWriteLimiter() fiber.Handler {
	return newScopedLimiter("progress", 120, time.Minute, func(c *fiber.Ctx) string {
		actor := middleware.GetUserID(c)
		if actor == "" {
			actor = "ip:" + c.IP()
		} else {
			actor = "user:" + actor
		}
		return routeKey(c, actor)
	})
}

func securityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		return c.Next()
	}
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
	app.Use(securityHeaders())
	app.Use(apiLimiter())

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
		auth.Post("/register", authWriteLimiter(), h.Auth.Register)
		auth.Post("/login", authWriteLimiter(), h.Auth.Login)
		auth.Get("/google", h.Auth.GoogleRedirect)
		auth.Get("/google/callback", h.Auth.GoogleCallback)
		auth.Post("/refresh", authWriteLimiter(), h.Auth.Refresh)
		auth.Post("/logout", authWriteLimiter(), middleware.RequireAuth(jwtSecret), h.Auth.Logout)
		auth.Get("/me", middleware.RequireAuth(jwtSecret), h.Auth.GetMe)

		// ── Author routes (auth required) ────────────────
		author := api.Group("/author", middleware.RequireAuth(jwtSecret))

		// Become author — any authenticated user
		author.Post("/become", h.Author.BecomeAuthor)

		authorProtected := author.Group("", middleware.RequireRole("author", "admin"))
		authorProtected.Get("/novels", h.Author.GetMyNovels)
		authorProtected.Get("/novels/:id", h.Author.GetMyNovel)
		authorProtected.Post("/novels", h.Author.CreateNovel)
		authorProtected.Put("/novels/:id", h.Author.UpdateNovel)
		authorProtected.Delete("/novels/:id", h.Author.DeleteNovel)
		authorProtected.Get("/novels/:id/chapters", h.Author.GetMyChapters)
		authorProtected.Post("/novels/:id/chapters", h.Author.CreateChapter)
		authorProtected.Get("/chapters/:id", h.Author.GetChapterForEdit)
		authorProtected.Put("/chapters/:id", h.Author.UpdateChapter)
		authorProtected.Delete("/chapters/:id", h.Author.DeleteChapter)
		authorProtected.Get("/stats", h.Author.GetStats)

		// ── Community routes ────────────────
		// Comments (public read, auth write)
		api.Get("/chapters/:id/comments", h.Community.GetComments)
		api.Post("/chapters/:id/comments", middleware.RequireAuth(jwtSecret), communityWriteLimiter(), h.Community.CreateComment)
		api.Delete("/comments/:id", middleware.RequireAuth(jwtSecret), communityWriteLimiter(), h.Community.DeleteComment)

		// Reviews (public read, auth write)
		api.Get("/novels/:slug/reviews", h.Community.GetReviews)
		api.Post("/novels/:slug/reviews", middleware.RequireAuth(jwtSecret), communityWriteLimiter(), h.Community.CreateReview)
		api.Post("/reviews/:id/vote", middleware.RequireAuth(jwtSecret), communityWriteLimiter(), h.Community.VoteReview)

		// Follows
		api.Post("/novels/:slug/follow", middleware.RequireAuth(jwtSecret), communityWriteLimiter(), h.Community.FollowNovel)
		api.Delete("/novels/:slug/follow", middleware.RequireAuth(jwtSecret), communityWriteLimiter(), h.Community.UnfollowNovel)
		api.Get("/novels/:slug/following", middleware.RequireAuth(jwtSecret), h.Community.CheckFollowing)

		// Reading progress
		api.Put("/novels/:slug/progress", middleware.RequireAuth(jwtSecret), progressWriteLimiter(), h.Community.UpdateProgress)
		api.Get("/novels/:slug/progress", middleware.RequireAuth(jwtSecret), h.Community.GetProgress)

		// ── User routes (auth required) ────────────────
		user := api.Group("/user", middleware.RequireAuth(jwtSecret))
		user.Get("/follows", h.Community.GetFollowedNovels)
		user.Get("/notifications", h.Community.GetNotifications)
		user.Post("/notifications/read", communityWriteLimiter(), h.Community.MarkNotificationsRead)
		user.Get("/progress", h.Community.GetAllProgress)
		user.Get("/profile", h.Author.GetMyProfile)
		user.Put("/profile", communityWriteLimiter(), h.Author.UpdateMyProfile)

		// ── Public user profiles ────────────────
		api.Get("/users/:username", h.Author.GetUserProfile)
	}
}
