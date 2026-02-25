package handlers

import (
	"math"
	"strconv"

	"aetha-backend/internal/cache"
	"aetha-backend/internal/models"
	"aetha-backend/internal/repository"

	"github.com/gofiber/fiber/v2"
)

type NovelHandler struct {
	novelRepo   *repository.NovelRepository
	chapterRepo *repository.ChapterRepository
	cache       *cache.CacheService
}

func NewNovelHandler(nr *repository.NovelRepository, cr *repository.ChapterRepository, cs *cache.CacheService) *NovelHandler {
	return &NovelHandler{
		novelRepo:   nr,
		chapterRepo: cr,
		cache:       cs,
	}
}

// GET /api/novels - Paginated novel catalog
func (h *NovelHandler) GetNovels(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	sortBy := c.Query("sort", "updated")
	status := c.Query("status", "all")
	genre := c.Query("genre", "")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 50 {
		perPage = 20
	}

	// Check cache first
	ctx := c.Context()
	cached, err := h.cache.GetCatalog(ctx, page, perPage, sortBy, status, genre)
	if err == nil && cached != nil {
		return c.JSON(cached)
	}

	novels, total, err := h.novelRepo.GetAll(page, perPage, sortBy, status, genre)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch novels"})
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))

	resp := &models.PaginatedResponse{
		Data:       novels,
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	}

	// Cache the result
	h.cache.SetCatalog(ctx, page, perPage, sortBy, status, genre, resp)

	return c.JSON(resp)
}

// GET /api/novels/:slug - Novel detail with chapters
func (h *NovelHandler) GetNovelBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")

	// Check cache
	ctx := c.Context()
	cached, err := h.cache.GetNovel(ctx, slug)
	if err == nil && cached != nil {
		return c.JSON(cached)
	}

	novel, err := h.novelRepo.GetBySlug(slug)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Novel not found"})
	}

	genres, _ := h.novelRepo.GetGenresByNovelID(novel.ID)
	chapters, _ := h.chapterRepo.GetByNovelID(novel.ID)

	// Increment views async
	go h.novelRepo.IncrementViews(novel.ID)

	resp := &models.NovelDetailResponse{
		Novel: models.NovelWithGenres{
			Novel:  *novel,
			Genres: genres,
		},
		Chapters: chapters,
	}

	// Cache
	h.cache.SetNovel(ctx, slug, resp)

	return c.JSON(resp)
}

// GET /api/novels/:slug/chapters/:number - Read chapter
func (h *NovelHandler) GetChapter(c *fiber.Ctx) error {
	slug := c.Params("slug")
	chapterNum, err := strconv.Atoi(c.Params("number"))
	if err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid chapter number"})
	}

	novel, err := h.novelRepo.GetBySlug(slug)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Novel not found"})
	}

	// Try Redis cache first (hot path - should be <20ms)
	ctx := c.Context()
	chapter, err := h.cache.GetChapter(ctx, novel.ID, chapterNum)
	if err != nil || chapter == nil {
		// Cache miss - fetch from DB
		chapter, err = h.chapterRepo.GetChapter(novel.ID, chapterNum)
		if err != nil {
			return c.Status(404).JSON(models.ErrorResponse{Error: "Chapter not found"})
		}
		// Store in cache
		h.cache.SetChapter(ctx, novel.ID, chapterNum, chapter)
	}

	// Get adjacent chapters for navigation
	prev, next := h.chapterRepo.GetAdjacentChapters(novel.ID, chapterNum)
	totalChaps, _ := h.chapterRepo.GetTotalChapters(novel.ID)

	// Increment views async
	go h.chapterRepo.IncrementViews(chapter.ID)

	resp := models.ChapterReadResponse{
		Chapter:     *chapter,
		NovelTitle:  novel.Title,
		NovelSlug:   novel.Slug,
		PrevChapter: prev,
		NextChapter: next,
		TotalChaps:  totalChaps,
	}

	return c.JSON(resp)
}

// GET /api/search?q=... - Search novels
func (h *NovelHandler) Search(c *fiber.Ctx) error {
	query := c.Query("q", "")
	if len(query) < 2 {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Query too short (min 2 chars)"})
	}

	novels, err := h.novelRepo.Search(query, 20)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Search failed"})
	}

	return c.JSON(fiber.Map{"data": novels, "query": query})
}

// GET /api/genres - List all genres
func (h *NovelHandler) GetGenres(c *fiber.Ctx) error {
	genres, err := h.novelRepo.GetAllGenres()
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch genres"})
	}
	return c.JSON(fiber.Map{"data": genres})
}
