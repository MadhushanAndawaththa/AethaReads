package handlers

import (
	"log"

	"aetha-backend/internal/cache"
	"aetha-backend/internal/middleware"
	"aetha-backend/internal/models"
	"aetha-backend/internal/repository"

	"github.com/gofiber/fiber/v2"
)

type AuthorHandler struct {
	authorRepo *repository.AuthorRepository
	novelRepo  *repository.NovelRepository
	userRepo   *repository.UserRepository
	cache      *cache.CacheService
}

func NewAuthorHandler(ar *repository.AuthorRepository, nr *repository.NovelRepository, ur *repository.UserRepository, cs *cache.CacheService) *AuthorHandler {
	return &AuthorHandler{authorRepo: ar, novelRepo: nr, userRepo: ur, cache: cs}
}

// POST /api/author/novels — create a new novel
func (h *AuthorHandler) CreateNovel(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req models.CreateNovelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}

	if req.Title == "" {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Title is required"})
	}

	// Ensure user is an author (auto-promote)
	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(401).JSON(models.ErrorResponse{Error: "User not found"})
	}
	if user.Role == "reader" {
		_ = h.userRepo.UpdateRole(c.Context(), userID, "author")
		_, _ = h.userRepo.CreateAuthorProfile(c.Context(), userID)
	}

	novel, err := h.authorRepo.CreateNovel(c.Context(), userID, &req)
	if err != nil {
		log.Printf("create novel error: %v", err)
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to create novel"})
	}

	h.cache.InvalidateCatalog(c.Context())
	return c.Status(201).JSON(novel)
}

// PUT /api/author/novels/:id — update a novel
func (h *AuthorHandler) UpdateNovel(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	novelID := c.Params("id")

	var req models.UpdateNovelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}

	novel, err := h.authorRepo.UpdateNovel(c.Context(), novelID, userID, &req)
	if err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: err.Error()})
	}

	h.cache.InvalidateCatalog(c.Context())
	if novel.Slug != "" {
		h.cache.InvalidateNovel(c.Context(), novel.Slug)
	}
	return c.JSON(novel)
}

// GET /api/author/novels — list author's novels
func (h *AuthorHandler) GetMyNovels(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	novels, err := h.authorRepo.GetAuthorNovels(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch novels"})
	}
	return c.JSON(fiber.Map{"data": novels})
}

// GET /api/author/novels/:id — fetch a single author-owned novel with genres
func (h *AuthorHandler) GetMyNovel(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	novelID := c.Params("id")

	novel, err := h.authorRepo.GetAuthorNovel(c.Context(), novelID, userID)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Novel not found"})
	}

	return c.JSON(fiber.Map{"novel": novel})
}

// DELETE /api/author/novels/:id
func (h *AuthorHandler) DeleteNovel(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	novelID := c.Params("id")

	if err := h.authorRepo.DeleteNovel(c.Context(), novelID, userID); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: err.Error()})
	}

	h.cache.InvalidateCatalog(c.Context())
	return c.JSON(fiber.Map{"message": "Novel deleted"})
}

// POST /api/author/novels/:id/chapters — create chapter
func (h *AuthorHandler) CreateChapter(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	novelID := c.Params("id")

	var req models.CreateChapterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}
	if req.Title == "" || req.ContentMD == "" {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Title and content are required"})
	}

	chapter, err := h.authorRepo.CreateChapter(c.Context(), novelID, userID, &req)
	if err != nil {
		log.Printf("create chapter error: %v", err)
		return c.Status(400).JSON(models.ErrorResponse{Error: err.Error()})
	}

	return c.Status(201).JSON(chapter)
}

// GET /api/author/chapters/:id — fetch chapter for editing
func (h *AuthorHandler) GetChapterForEdit(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	chapterID := c.Params("id")

	chapter, err := h.authorRepo.GetChapterByID(c.Context(), chapterID, userID)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: err.Error()})
	}

	return c.JSON(chapter)
}

// PUT /api/author/chapters/:id — update chapter
func (h *AuthorHandler) UpdateChapter(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	chapterID := c.Params("id")

	var req models.UpdateChapterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}

	chapter, err := h.authorRepo.UpdateChapter(c.Context(), chapterID, userID, &req)
	if err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: err.Error()})
	}

	return c.JSON(chapter)
}

// GET /api/author/novels/:id/chapters — list all chapters (including drafts)
func (h *AuthorHandler) GetMyChapters(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	novelID := c.Params("id")

	chapters, err := h.authorRepo.GetChaptersByNovel(c.Context(), novelID, userID)
	if err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: err.Error()})
	}

	return c.JSON(fiber.Map{"data": chapters})
}

// DELETE /api/author/chapters/:id
func (h *AuthorHandler) DeleteChapter(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	chapterID := c.Params("id")

	if err := h.authorRepo.DeleteChapter(c.Context(), chapterID, userID); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Chapter deleted"})
}

// GET /api/author/stats — author analytics
func (h *AuthorHandler) GetStats(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	stats, err := h.authorRepo.GetStats(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch stats"})
	}
	return c.JSON(stats)
}

// POST /api/author/become — upgrade to author role
func (h *AuthorHandler) BecomeAuthor(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(401).JSON(models.ErrorResponse{Error: "User not found"})
	}
	if user.Role != "reader" {
		return c.JSON(fiber.Map{"message": "Already an author", "role": user.Role})
	}

	_ = h.userRepo.UpdateRole(c.Context(), userID, "author")
	_, _ = h.userRepo.CreateAuthorProfile(c.Context(), userID)

	return c.JSON(fiber.Map{"message": "Upgraded to author", "role": "author"})
}

// GET /api/user/profile — current user profile and author settings
func (h *AuthorHandler) GetMyProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "User not found"})
	}

	authorProfile, _ := h.userRepo.CreateAuthorProfile(c.Context(), userID)

	return c.JSON(fiber.Map{
		"user":           user,
		"author_profile": authorProfile,
	})
}

// PUT /api/user/profile — update current user profile and author settings
func (h *AuthorHandler) UpdateMyProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req models.UpdateUserProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}

	user, err := h.userRepo.UpdateProfile(c.Context(), userID, &req)
	if err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Failed to update profile"})
	}

	authorProfile, _ := h.userRepo.CreateAuthorProfile(c.Context(), userID)

	return c.JSON(fiber.Map{
		"user":           user,
		"author_profile": authorProfile,
	})
}

// GET /api/users/:username — public user profile
func (h *AuthorHandler) GetUserProfile(c *fiber.Ctx) error {
	username := c.Params("username")
	if username == "" {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Username is required"})
	}

	user, err := h.userRepo.GetByUsername(c.Context(), username)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "User not found"})
	}

	// Public view — omit sensitive fields
	profile := fiber.Map{
		"id":           user.ID,
		"username":     user.Username,
		"display_name": user.DisplayName,
		"avatar_url":   user.AvatarURL,
		"role":         user.Role,
		"bio":          user.Bio,
		"created_at":   user.CreatedAt,
	}

	if user.Role == "author" || user.Role == "admin" {
		if authorProfile, err := h.userRepo.GetAuthorProfile(c.Context(), user.ID); err == nil {
			profile["author_profile"] = authorProfile
		}
	}

	// If author/admin, include their novels
	var novels []models.Novel
	if user.Role == "author" || user.Role == "admin" {
		novels, _ = h.authorRepo.GetAuthorNovels(c.Context(), user.ID)
	}
	if novels == nil {
		novels = []models.Novel{}
	}

	return c.JSON(fiber.Map{
		"user":   profile,
		"novels": novels,
	})
}
