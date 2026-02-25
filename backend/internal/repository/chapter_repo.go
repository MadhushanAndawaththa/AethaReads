package repository

import (
	"context"
	"log"

	"aetha-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type ChapterRepository struct {
	db *sqlx.DB
}

func NewChapterRepository(db *sqlx.DB) *ChapterRepository {
	return &ChapterRepository{db: db}
}

func (r *ChapterRepository) GetByNovelID(ctx context.Context, novelID string) ([]models.ChapterListItem, error) {
	var chapters []models.ChapterListItem
	err := r.db.SelectContext(ctx, &chapters, `
		SELECT id, novel_id, chapter_number, title, word_count, views, created_at 
		FROM chapters 
		WHERE novel_id = $1 
		ORDER BY chapter_number ASC`, novelID)
	if err != nil {
		return nil, err
	}
	return chapters, nil
}

func (r *ChapterRepository) GetChapter(ctx context.Context, novelID string, chapterNumber int) (*models.Chapter, error) {
	chapter := &models.Chapter{}
	err := r.db.GetContext(ctx, chapter, `
		SELECT * FROM chapters 
		WHERE novel_id = $1 AND chapter_number = $2`, novelID, chapterNumber)
	if err != nil {
		return nil, err
	}
	return chapter, nil
}

func (r *ChapterRepository) GetTotalChapters(ctx context.Context, novelID string) (int, error) {
	var total int
	err := r.db.GetContext(ctx, &total, "SELECT COUNT(*) FROM chapters WHERE novel_id = $1", novelID)
	return total, err
}

func (r *ChapterRepository) IncrementViews(id string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("panic in IncrementViews(chapter): %v", r)
		}
	}()
	_, err := r.db.Exec("UPDATE chapters SET views = views + 1 WHERE id = $1", id)
	if err != nil {
		log.Printf("failed to increment chapter views: %v", err)
	}
}

func (r *ChapterRepository) GetAdjacentChapters(ctx context.Context, novelID string, currentNum int) (*int, *int) {
	var prev, next *int

	var prevNum int
	err := r.db.GetContext(ctx, &prevNum, `
		SELECT chapter_number FROM chapters 
		WHERE novel_id = $1 AND chapter_number < $2 
		ORDER BY chapter_number DESC LIMIT 1`, novelID, currentNum)
	if err == nil {
		prev = &prevNum
	}

	var nextNum int
	err = r.db.GetContext(ctx, &nextNum, `
		SELECT chapter_number FROM chapters 
		WHERE novel_id = $1 AND chapter_number > $2 
		ORDER BY chapter_number ASC LIMIT 1`, novelID, currentNum)
	if err == nil {
		next = &nextNum
	}

	return prev, next
}

// Used for batch preloading into Redis
func (r *ChapterRepository) GetRecentChapters(ctx context.Context, limit int) ([]models.Chapter, error) {
	var chapters []models.Chapter
	err := r.db.SelectContext(ctx, &chapters, `
		SELECT c.* FROM chapters c
		JOIN novels n ON c.novel_id = n.id
		ORDER BY c.updated_at DESC
		LIMIT $1`, limit)
	return chapters, err
}
