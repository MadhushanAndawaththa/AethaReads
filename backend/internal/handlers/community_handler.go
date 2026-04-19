package handlers

import (
	"math"
	"strconv"

	"aetha-backend/internal/middleware"
	"aetha-backend/internal/models"
	"aetha-backend/internal/repository"

	"github.com/gofiber/fiber/v2"
)

type CommunityHandler struct {
	communityRepo *repository.CommunityRepository
	novelRepo     *repository.NovelRepository
}

func NewCommunityHandler(cr *repository.CommunityRepository, nr *repository.NovelRepository) *CommunityHandler {
	return &CommunityHandler{communityRepo: cr, novelRepo: nr}
}

// ===================== Comments =====================

// POST /api/chapters/:id/comments
func (h *CommunityHandler) CreateComment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	chapterID := c.Params("id")

	var req models.CreateCommentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}
	if req.Body == "" {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Comment body is required"})
	}

	comment, err := h.communityRepo.CreateComment(c.Context(), chapterID, userID, &req)
	if err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: err.Error()})
	}
	return c.Status(201).JSON(comment)
}

// GET /api/chapters/:id/comments
func (h *CommunityHandler) GetComments(c *fiber.Ctx) error {
	chapterID := c.Params("id")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "50"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 50
	}

	comments, total, err := h.communityRepo.GetCommentsByChapter(c.Context(), chapterID, page, perPage)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch comments"})
	}

	return c.JSON(models.PaginatedResponse{
		Data:       comments,
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: int(math.Ceil(float64(total) / float64(perPage))),
	})
}

// DELETE /api/comments/:id
func (h *CommunityHandler) DeleteComment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	commentID := c.Params("id")
	if err := h.communityRepo.DeleteComment(c.Context(), commentID, userID); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Comment deleted"})
}

// ===================== Reviews =====================

// POST /api/novels/:slug/reviews
func (h *CommunityHandler) CreateReview(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	slug := c.Params("slug")

	novel, err := h.novelRepo.GetBySlug(c.Context(), slug)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Novel not found"})
	}

	var req models.CreateReviewRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}
	// Validate ratings 1-5
	for _, r := range []int{req.RatingStory, req.RatingStyle, req.RatingGrammar, req.RatingCharacter} {
		if r < 1 || r > 5 {
			return c.Status(400).JSON(models.ErrorResponse{Error: "Ratings must be between 1 and 5"})
		}
	}

	review, err := h.communityRepo.CreateReview(c.Context(), novel.ID, userID, &req)
	if err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Failed to create review (you may have already reviewed this novel)"})
	}
	return c.Status(201).JSON(review)
}

// GET /api/novels/:slug/reviews
func (h *CommunityHandler) GetReviews(c *fiber.Ctx) error {
	slug := c.Params("slug")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 50 {
		perPage = 20
	}

	novel, err := h.novelRepo.GetBySlug(c.Context(), slug)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Novel not found"})
	}

	reviews, total, err := h.communityRepo.GetReviewsByNovel(c.Context(), novel.ID, page, perPage)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch reviews"})
	}

	return c.JSON(models.PaginatedResponse{
		Data:       reviews,
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: int(math.Ceil(float64(total) / float64(perPage))),
	})
}

// POST /api/reviews/:id/vote
func (h *CommunityHandler) VoteReview(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	reviewID := c.Params("id")

	var body struct {
		Helpful bool `json:"helpful"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}

	if err := h.communityRepo.VoteReview(c.Context(), reviewID, userID, body.Helpful); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Failed to vote"})
	}
	return c.JSON(fiber.Map{"message": "Vote recorded"})
}

// ===================== Follows =====================

// POST /api/novels/:slug/follow
func (h *CommunityHandler) FollowNovel(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	slug := c.Params("slug")

	novel, err := h.novelRepo.GetBySlug(c.Context(), slug)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Novel not found"})
	}

	if err := h.communityRepo.FollowNovel(c.Context(), userID, novel.ID); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Failed to follow"})
	}
	return c.JSON(fiber.Map{"message": "Following", "following": true})
}

// DELETE /api/novels/:slug/follow
func (h *CommunityHandler) UnfollowNovel(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	slug := c.Params("slug")

	novel, err := h.novelRepo.GetBySlug(c.Context(), slug)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Novel not found"})
	}

	if err := h.communityRepo.UnfollowNovel(c.Context(), userID, novel.ID); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Failed to unfollow"})
	}
	return c.JSON(fiber.Map{"message": "Unfollowed", "following": false})
}

// GET /api/user/follows
func (h *CommunityHandler) GetFollowedNovels(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	novels, err := h.communityRepo.GetFollowedNovels(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch follows"})
	}
	return c.JSON(fiber.Map{"data": novels})
}

// GET /api/novels/:slug/following — check if user follows
func (h *CommunityHandler) CheckFollowing(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	slug := c.Params("slug")
	novel, err := h.novelRepo.GetBySlug(c.Context(), slug)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Novel not found"})
	}
	following := h.communityRepo.IsFollowing(c.Context(), userID, novel.ID)
	return c.JSON(fiber.Map{"following": following})
}

// ===================== Notifications =====================

// GET /api/user/notifications
func (h *CommunityHandler) GetNotifications(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	notifs, err := h.communityRepo.GetNotifications(c.Context(), userID, limit)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch notifications"})
	}

	unread, _ := h.communityRepo.GetUnreadCount(c.Context(), userID)

	return c.JSON(fiber.Map{"data": notifs, "unread_count": unread})
}

// POST /api/user/notifications/read
func (h *CommunityHandler) MarkNotificationsRead(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if err := h.communityRepo.MarkNotificationsRead(c.Context(), userID); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to mark notifications read"})
	}
	return c.JSON(fiber.Map{"message": "Marked as read"})
}

// ===================== Reading Progress =====================

// PUT /api/novels/:slug/progress
func (h *CommunityHandler) UpdateProgress(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	slug := c.Params("slug")

	novel, err := h.novelRepo.GetBySlug(c.Context(), slug)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Novel not found"})
	}

	var req models.UpdateProgressRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}

	if err := h.communityRepo.UpdateReadingProgress(c.Context(), userID, novel.ID, &req); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to save progress"})
	}
	return c.JSON(fiber.Map{"message": "Progress saved"})
}

// GET /api/novels/:slug/progress
func (h *CommunityHandler) GetProgress(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	slug := c.Params("slug")

	novel, err := h.novelRepo.GetBySlug(c.Context(), slug)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Novel not found"})
	}

	progress, err := h.communityRepo.GetReadingProgress(c.Context(), userID, novel.ID)
	if err != nil {
		return c.JSON(fiber.Map{"progress": nil})
	}
	return c.JSON(fiber.Map{"progress": progress})
}

// GET /api/user/progress
func (h *CommunityHandler) GetAllProgress(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	progress, err := h.communityRepo.GetAllReadingProgress(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch progress"})
	}
	return c.JSON(fiber.Map{"data": progress})
}
