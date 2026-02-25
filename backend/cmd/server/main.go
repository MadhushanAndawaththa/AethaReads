package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"aetha-backend/internal/cache"
	"aetha-backend/internal/config"
	"aetha-backend/internal/database"
	"aetha-backend/internal/handlers"
	"aetha-backend/internal/repository"
	"aetha-backend/internal/router"

	"github.com/gofiber/fiber/v2"
)

func main() {
	// Load config
	cfg := config.Load()

	// Connect to PostgreSQL
	db := database.Connect(cfg.DB)
	defer db.Close()

	// Run migrations
	database.RunMigrations(db)

	// Seed data
	database.SeedData(db)

	// Connect to Redis
	rdb := database.ConnectRedis(cfg.Redis)
	defer rdb.Close()

	// Init layers
	novelRepo := repository.NewNovelRepository(db)
	chapterRepo := repository.NewChapterRepository(db)
	cacheService := cache.NewCacheService(rdb, cfg.Cache.ChapterTTL, cfg.Cache.NovelTTL, cfg.Cache.CatalogTTL)

	// Prewarm cache with recent chapters
	ctx := context.Background()
	recentChapters, err := chapterRepo.GetRecentChapters(ctx, 100)
	if err == nil {
		cacheService.PrewarmChapters(ctx, recentChapters)
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:   "Aetha Backend v1.0",
		BodyLimit: 10 * 1024 * 1024, // 10MB
		Prefork:   false,
	})

	// Setup handlers
	novelHandler := handlers.NewNovelHandler(novelRepo, chapterRepo, cacheService)

	// Setup routes
	router.Setup(app, novelHandler, cfg.Server.AllowedOrigins)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("🛑 Shutting down gracefully...")
		if err := app.Shutdown(); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	// Start server
	addr := ":" + cfg.Server.Port
	log.Printf("🚀 Aetha Backend starting on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
