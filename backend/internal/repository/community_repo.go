package repository

import (
	"context"
	"fmt"
	"log"

	"aetha-backend/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type CommunityRepository struct {
	db *sqlx.DB
}

func NewCommunityRepository(db *sqlx.DB) *CommunityRepository {
	return &CommunityRepository{db: db}
}

// ===================== Comments (Materialized Path) =====================

func (r *CommunityRepository) CreateComment(ctx context.Context, chapterID, userID string, req *models.CreateCommentRequest) (*models.CommentWithUser, error) {
	id := uuid.New().String()
	depth := 0
	path := id

	if req.ParentID != nil && *req.ParentID != "" {
		// Get parent to build path
		var parent models.Comment
		err := r.db.GetContext(ctx, &parent,
			"SELECT * FROM comments WHERE id = $1 AND deleted_at IS NULL", *req.ParentID)
		if err != nil {
			return nil, fmt.Errorf("parent comment not found")
		}
		if parent.Depth >= 3 {
			return nil, fmt.Errorf("maximum reply depth reached")
		}
		depth = parent.Depth + 1
		path = parent.Path + "." + id
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO comments (id, chapter_id, user_id, parent_id, path, depth, body)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, chapterID, userID, req.ParentID, path, depth, req.Body)
	if err != nil {
		return nil, err
	}

	return r.GetComment(ctx, id)
}

func (r *CommunityRepository) GetComment(ctx context.Context, id string) (*models.CommentWithUser, error) {
	comment := &models.CommentWithUser{}
	err := r.db.GetContext(ctx, comment, `
		SELECT c.*, u.username, u.display_name, u.avatar_url, u.role as user_role
		FROM comments c JOIN users u ON c.user_id = u.id
		WHERE c.id = $1 AND c.deleted_at IS NULL AND c.hidden = FALSE`, id)
	return comment, err
}

func (r *CommunityRepository) GetCommentsByChapter(ctx context.Context, chapterID string, page, perPage int) ([]models.CommentWithUser, int, error) {
	offset := (page - 1) * perPage

	var total int
	err := r.db.GetContext(ctx, &total,
		"SELECT COUNT(*) FROM comments WHERE chapter_id = $1 AND deleted_at IS NULL AND hidden = FALSE", chapterID)
	if err != nil {
		return nil, 0, err
	}

	var comments []models.CommentWithUser
	err = r.db.SelectContext(ctx, &comments, `
		SELECT c.*, u.username, u.display_name, u.avatar_url, u.role as user_role
		FROM comments c JOIN users u ON c.user_id = u.id
		WHERE c.chapter_id = $1 AND c.deleted_at IS NULL AND c.hidden = FALSE
		ORDER BY c.path ASC
		LIMIT $2 OFFSET $3`, chapterID, perPage, offset)
	return comments, total, err
}

func (r *CommunityRepository) DeleteComment(ctx context.Context, commentID, userID string) error {
	res, err := r.db.ExecContext(ctx,
		"UPDATE comments SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
		commentID, userID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("comment not found or not owned by user")
	}
	return nil
}

// ===================== Reviews =====================

func (r *CommunityRepository) CreateReview(ctx context.Context, novelID, userID string, req *models.CreateReviewRequest) (*models.ReviewWithUser, error) {
	id := uuid.New().String()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO reviews (id, novel_id, user_id, rating_story, rating_style, rating_grammar, rating_character, title, body)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		id, novelID, userID, req.RatingStory, req.RatingStyle, req.RatingGrammar, req.RatingCharacter, req.Title, req.Body)
	if err != nil {
		return nil, err
	}

	// Update novel rating
	r.updateNovelRating(ctx, novelID)

	return r.GetReview(ctx, id)
}

func (r *CommunityRepository) GetReview(ctx context.Context, id string) (*models.ReviewWithUser, error) {
	review := &models.ReviewWithUser{}
	err := r.db.GetContext(ctx, review, `
		SELECT r.*, u.username, u.display_name, u.avatar_url
		FROM reviews r JOIN users u ON r.user_id = u.id
		WHERE r.id = $1 AND r.deleted_at IS NULL`, id)
	return review, err
}

func (r *CommunityRepository) GetReviewsByNovel(ctx context.Context, novelID string, page, perPage int) ([]models.ReviewWithUser, int, error) {
	offset := (page - 1) * perPage

	var total int
	err := r.db.GetContext(ctx, &total,
		"SELECT COUNT(*) FROM reviews WHERE novel_id = $1 AND deleted_at IS NULL AND hidden = FALSE", novelID)
	if err != nil {
		return nil, 0, err
	}

	var reviews []models.ReviewWithUser
	err = r.db.SelectContext(ctx, &reviews, `
		SELECT r.*, u.username, u.display_name, u.avatar_url
		FROM reviews r JOIN users u ON r.user_id = u.id
		WHERE r.novel_id = $1 AND r.deleted_at IS NULL AND r.hidden = FALSE
		ORDER BY r.helpful_count DESC, r.created_at DESC
		LIMIT $2 OFFSET $3`, novelID, perPage, offset)
	return reviews, total, err
}

func (r *CommunityRepository) HideComment(ctx context.Context, commentID, reason string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE comments SET hidden = TRUE, hidden_reason = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
		commentID, reason)
	return err
}

func (r *CommunityRepository) UnhideComment(ctx context.Context, commentID string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE comments SET hidden = FALSE, hidden_reason = '', updated_at = NOW() WHERE id = $1",
		commentID)
	return err
}

func (r *CommunityRepository) HideReview(ctx context.Context, reviewID, reason string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE reviews SET hidden = TRUE, hidden_reason = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
		reviewID, reason)
	return err
}

func (r *CommunityRepository) UnhideReview(ctx context.Context, reviewID string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE reviews SET hidden = FALSE, hidden_reason = '', updated_at = NOW() WHERE id = $1",
		reviewID)
	return err
}

func (r *CommunityRepository) VoteReview(ctx context.Context, reviewID, userID string, helpful bool) error {
	id := uuid.New().String()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO review_votes (id, review_id, user_id, helpful)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (review_id, user_id) DO UPDATE SET helpful = $4`,
		id, reviewID, userID, helpful)
	if err != nil {
		return err
	}

	// Update helpful count
	_, err = r.db.ExecContext(ctx, `
		UPDATE reviews SET helpful_count = (
			SELECT COUNT(*) FROM review_votes WHERE review_id = $1 AND helpful = true
		) WHERE id = $1`, reviewID)
	return err
}

func (r *CommunityRepository) updateNovelRating(ctx context.Context, novelID string) {
	_, err := r.db.ExecContext(ctx, `
		UPDATE novels SET rating = COALESCE((
			SELECT AVG(overall_rating) FROM reviews WHERE novel_id = $1 AND deleted_at IS NULL
		), 0) WHERE id = $1`, novelID)
	if err != nil {
		log.Printf("error updating novel rating: %v", err)
	}
}

// ===================== Follows =====================

func (r *CommunityRepository) FollowNovel(ctx context.Context, userID, novelID string) error {
	id := uuid.New().String()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO follows (id, user_id, novel_id)
		VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		id, userID, novelID)
	if err != nil {
		return err
	}
	_, _ = r.db.ExecContext(ctx, `
		UPDATE novels SET follower_count = (
			SELECT COUNT(*) FROM follows WHERE novel_id = $1
		) WHERE id = $1`, novelID)
	return nil
}

func (r *CommunityRepository) UnfollowNovel(ctx context.Context, userID, novelID string) error {
	_, err := r.db.ExecContext(ctx,
		"DELETE FROM follows WHERE user_id = $1 AND novel_id = $2", userID, novelID)
	if err != nil {
		return err
	}
	_, _ = r.db.ExecContext(ctx, `
		UPDATE novels SET follower_count = (
			SELECT COUNT(*) FROM follows WHERE novel_id = $1
		) WHERE id = $1`, novelID)
	return nil
}

func (r *CommunityRepository) IsFollowing(ctx context.Context, userID, novelID string) bool {
	var count int
	err := r.db.GetContext(ctx, &count,
		"SELECT COUNT(*) FROM follows WHERE user_id = $1 AND novel_id = $2", userID, novelID)
	return err == nil && count > 0
}

func (r *CommunityRepository) GetFollowedNovels(ctx context.Context, userID string) ([]models.Novel, error) {
	var novels []models.Novel
	err := r.db.SelectContext(ctx, &novels, `
		SELECT n.* FROM novels n 
		JOIN follows f ON n.id = f.novel_id 
		WHERE f.user_id = $1 
		ORDER BY f.created_at DESC`, userID)
	return novels, err
}

// ===================== Notifications =====================

func (r *CommunityRepository) CreateNotification(ctx context.Context, userID, nType, title, body, link string) error {
	id := uuid.New().String()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO notifications (id, user_id, type, title, body, link)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		id, userID, nType, title, body, link)
	return err
}

func (r *CommunityRepository) GetNotifications(ctx context.Context, userID string, limit int) ([]models.Notification, error) {
	var notifs []models.Notification
	err := r.db.SelectContext(ctx, &notifs, `
		SELECT * FROM notifications WHERE user_id = $1
		ORDER BY created_at DESC LIMIT $2`, userID, limit)
	return notifs, err
}

func (r *CommunityRepository) MarkNotificationsRead(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false", userID)
	return err
}

func (r *CommunityRepository) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.GetContext(ctx, &count,
		"SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false", userID)
	return count, err
}

// ===================== Reading Progress =====================

func (r *CommunityRepository) UpdateReadingProgress(ctx context.Context, userID, novelID string, req *models.UpdateProgressRequest) error {
	id := uuid.New().String()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO reading_progress (id, user_id, novel_id, chapter_number, scroll_position)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, novel_id) DO UPDATE SET
			chapter_number = $4, scroll_position = $5, updated_at = NOW()`,
		id, userID, novelID, req.ChapterNumber, req.ScrollPosition)
	return err
}

func (r *CommunityRepository) GetReadingProgress(ctx context.Context, userID, novelID string) (*models.ReadingProgress, error) {
	progress := &models.ReadingProgress{}
	err := r.db.GetContext(ctx, progress, `
		SELECT rp.id, rp.user_id, rp.novel_id, n.slug AS novel_slug, n.title AS novel_title,
		       rp.chapter_number, rp.scroll_position, rp.updated_at
		FROM reading_progress rp
		JOIN novels n ON rp.novel_id = n.id
		WHERE rp.user_id = $1 AND rp.novel_id = $2`, userID, novelID)
	return progress, err
}

func (r *CommunityRepository) GetAllReadingProgress(ctx context.Context, userID string) ([]models.ReadingProgress, error) {
	var progress []models.ReadingProgress
	err := r.db.SelectContext(ctx, &progress, `
		SELECT rp.id, rp.user_id, rp.novel_id, n.slug AS novel_slug, n.title AS novel_title,
		       rp.chapter_number, rp.scroll_position, rp.updated_at
		FROM reading_progress rp
		JOIN novels n ON rp.novel_id = n.id
		WHERE rp.user_id = $1
		ORDER BY rp.updated_at DESC`, userID)
	return progress, err
}
