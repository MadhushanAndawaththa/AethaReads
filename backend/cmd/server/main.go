package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"aetha-backend/internal/cache"
	"aetha-backend/internal/config"
	"aetha-backend/internal/database"
	"aetha-backend/internal/email"
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

	// Init repositories
	novelRepo := repository.NewNovelRepository(db)
	chapterRepo := repository.NewChapterRepository(db)
	userRepo := repository.NewUserRepository(db)
	authorRepo := repository.NewAuthorRepository(db)
	communityRepo := repository.NewCommunityRepository(db)
	reportRepo := repository.NewReportRepository(db)
	auditRepo := repository.NewAuditRepository(db)

	// Init cache
	cacheService := cache.NewCacheService(rdb, cfg.Cache.ChapterTTL, cfg.Cache.NovelTTL, cfg.Cache.CatalogTTL)

	// Prewarm cache with recent chapters
	ctx := context.Background()
	recentChapters, err := chapterRepo.GetRecentChapters(ctx, 100)
	if err == nil {
		cacheService.PrewarmChapters(ctx, recentChapters)
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:   "Aetha Backend v2.0",
		BodyLimit: 10 * 1024 * 1024, // 10MB
		Prefork:   false,
	})

	// Setup all handlers
	emailSvc := email.New(cfg.Email.Host, cfg.Email.Port, cfg.Email.Username, cfg.Email.Password, cfg.Email.From, cfg.Email.UseTLS)
	h := &router.Handlers{
		Novel:     handlers.NewNovelHandler(novelRepo, chapterRepo, cacheService),
		Auth:      handlers.NewAuthHandler(userRepo, &cfg.Auth, rdb, emailSvc, auditRepo),
		Author:    handlers.NewAuthorHandler(authorRepo, novelRepo, userRepo, cacheService),
		Community: handlers.NewCommunityHandler(communityRepo, novelRepo, reportRepo, auditRepo),
		Admin:     handlers.NewAdminHandler(reportRepo, userRepo, communityRepo, auditRepo),
		Health:    handlers.NewHealthHandler(db, rdb),
	}

	// Setup routes
	router.Setup(app, h, userRepo, cfg.Server.AllowedOrigins, cfg.Auth.JWTSecret)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutting down gracefully...")
		if err := app.Shutdown(); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			published, err := authorRepo.PublishDueChapters(context.Background())
			if err != nil {
				log.Printf("scheduled publish error: %v", err)
				continue
			}
			if published > 0 {
				log.Printf("published %d scheduled chapters", published)
			}
		}
	}()

	// Start server
	addr := ":" + cfg.Server.Port
	log.Printf("Aetha Backend v2 starting on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
