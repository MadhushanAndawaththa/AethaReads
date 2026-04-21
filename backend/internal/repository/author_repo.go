package repository

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"aetha-backend/internal/models"

	"github.com/google/uuid"
	"github.com/gosimple/slug"
	"github.com/jmoiron/sqlx"
)

type AuthorRepository struct {
	db *sqlx.DB
}

func NewAuthorRepository(db *sqlx.DB) *AuthorRepository {
	return &AuthorRepository{db: db}
}

func normalizeNovelStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "completed":
		return "completed"
	case "hiatus":
		return "hiatus"
	default:
		return "ongoing"
	}
}

func normalizeNovelType(novelType string) string {
	normalized := strings.ToLower(strings.TrimSpace(novelType))
	normalized = strings.ReplaceAll(normalized, " ", "_")
	if normalized == "" {
		return "web_novel"
	}
	return normalized
}

func normalizeNovelLanguage(language string) string {
	switch strings.ToLower(strings.TrimSpace(language)) {
	case "si", "sinhala":
		return "si"
	case "bilingual", "si-en", "en-si":
		return "bilingual"
	default:
		return "en"
	}
}

// ===================== Novel Management =====================

func (r *AuthorRepository) CreateNovel(ctx context.Context, authorID string, req *models.CreateNovelRequest) (*models.Novel, error) {
	id := uuid.New().String()
	novelSlug := slug.Make(req.Title) + "-" + id[:8]
	status := normalizeNovelStatus(req.Status)
	novelType := normalizeNovelType(req.NovelType)
	language := normalizeNovelLanguage(req.Language)

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	novel := &models.Novel{}
	err = tx.GetContext(ctx, novel, `
		INSERT INTO novels (id, title, slug, author_id, description, cover_url, status, language, novel_type, author)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '')
		RETURNING *`,
		id, req.Title, novelSlug, authorID, req.Description, req.CoverURL, status, language, novelType)
	if err != nil {
		return nil, err
	}

	// Set genres
	for _, gID := range req.GenreIDs {
		_, err = tx.ExecContext(ctx,
			"INSERT INTO novel_genres (novel_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
			id, gID)
		if err != nil {
			return nil, err
		}
	}

	return novel, tx.Commit()
}

func (r *AuthorRepository) UpdateNovel(ctx context.Context, novelID, authorID string, req *models.UpdateNovelRequest) (*models.Novel, error) {
	// Build dynamic update
	sets := []string{}
	args := []any{}
	idx := 1

	if req.Title != nil {
		sets = append(sets, "title = $"+strconv.Itoa(idx))
		args = append(args, *req.Title)
		idx++
		sets = append(sets, "slug = $"+strconv.Itoa(idx))
		args = append(args, slug.Make(*req.Title)+"-"+novelID[:8])
		idx++
	}
	if req.Description != nil {
		sets = append(sets, "description = $"+strconv.Itoa(idx))
		args = append(args, *req.Description)
		idx++
	}
	if req.CoverURL != nil {
		sets = append(sets, "cover_url = $"+strconv.Itoa(idx))
		args = append(args, *req.CoverURL)
		idx++
	}
	if req.Status != nil {
		sets = append(sets, "status = $"+strconv.Itoa(idx))
		args = append(args, normalizeNovelStatus(*req.Status))
		idx++
	}
	if req.Language != nil {
		sets = append(sets, "language = $"+strconv.Itoa(idx))
		args = append(args, normalizeNovelLanguage(*req.Language))
		idx++
	}

	if len(sets) == 0 && len(req.GenreIDs) == 0 {
		// Nothing to update
		novel := &models.Novel{}
		err := r.db.GetContext(ctx, novel, "SELECT * FROM novels WHERE id = $1 AND author_id = $2", novelID, authorID)
		return novel, err
	}

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if len(sets) > 0 {
		sets = append(sets, "updated_at = NOW()")
		query := "UPDATE novels SET " + strings.Join(sets, ", ") +
			" WHERE id = $" + strconv.Itoa(idx) + " AND author_id = $" + strconv.Itoa(idx+1)
		args = append(args, novelID, authorID)
		_, err = tx.ExecContext(ctx, query, args...)
		if err != nil {
			return nil, err
		}
	}

	// Update genres if provided
	if req.GenreIDs != nil {
		_, _ = tx.ExecContext(ctx, "DELETE FROM novel_genres WHERE novel_id = $1", novelID)
		for _, gID := range req.GenreIDs {
			_, _ = tx.ExecContext(ctx,
				"INSERT INTO novel_genres (novel_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
				novelID, gID)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	novel := &models.Novel{}
	err = r.db.GetContext(ctx, novel, "SELECT * FROM novels WHERE id = $1", novelID)
	return novel, err
}

func (r *AuthorRepository) GetAuthorNovels(ctx context.Context, authorID string) ([]models.Novel, error) {
	var novels []models.Novel
	err := r.db.SelectContext(ctx, &novels,
		"SELECT * FROM novels WHERE author_id = $1 ORDER BY updated_at DESC", authorID)
	return novels, err
}

func (r *AuthorRepository) GetAuthorNovel(ctx context.Context, novelID, authorID string) (*models.NovelWithGenres, error) {
	novel := &models.Novel{}
	if err := r.db.GetContext(ctx, novel, "SELECT * FROM novels WHERE id = $1 AND author_id = $2", novelID, authorID); err != nil {
		return nil, err
	}

	genres, err := NewNovelRepository(r.db).GetGenresByNovelID(ctx, novelID)
	if err != nil {
		return nil, err
	}

	return &models.NovelWithGenres{
		Novel:  *novel,
		Genres: genres,
	}, nil
}

func (r *AuthorRepository) DeleteNovel(ctx context.Context, novelID, authorID string) error {
	res, err := r.db.ExecContext(ctx, "DELETE FROM novels WHERE id = $1 AND author_id = $2", novelID, authorID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("novel not found or not owned by author")
	}
	return nil
}

// ===================== Chapter Management =====================

func (r *AuthorRepository) CreateChapter(ctx context.Context, novelID, authorID string, req *models.CreateChapterRequest) (*models.Chapter, error) {
	// Verify ownership
	var ownerID string
	err := r.db.GetContext(ctx, &ownerID, "SELECT author_id FROM novels WHERE id = $1", novelID)
	if err != nil || ownerID != authorID {
		return nil, fmt.Errorf("novel not found or not owned by author")
	}

	id := uuid.New().String()

	// Get next chapter number
	var maxNum int
	_ = r.db.GetContext(ctx, &maxNum, "SELECT COALESCE(MAX(chapter_number), 0) FROM chapters WHERE novel_id = $1", novelID)
	nextNum := maxNum + 1

	content := req.ContentMD // Store markdown; in production, also convert to sanitized HTML
	wordCount := len(strings.Fields(content))

	status := req.Status
	if status == "" {
		status = "draft"
	}

	var publishedAt *time.Time
	if status == "published" {
		now := time.Now()
		publishedAt = &now
	}

	chapter := &models.Chapter{}
	err = r.db.GetContext(ctx, chapter, `
		INSERT INTO chapters (id, novel_id, chapter_number, title, content, content_md, word_count, status, published_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING *`,
		id, novelID, nextNum, req.Title, content, req.ContentMD, wordCount, status, publishedAt)
	if err != nil {
		return nil, err
	}

	// Update chapter count if published
	if status == "published" {
		_, _ = r.db.ExecContext(ctx, `
			UPDATE novels SET chapter_count = (
				SELECT COUNT(*) FROM chapters WHERE novel_id = $1 AND status = 'published'
			), updated_at = NOW() WHERE id = $1`, novelID)
	}

	return chapter, nil
}

func (r *AuthorRepository) UpdateChapter(ctx context.Context, chapterID, authorID string, req *models.UpdateChapterRequest) (*models.Chapter, error) {
	// Verify ownership through novel
	var ownerID string
	err := r.db.GetContext(ctx, &ownerID, `
		SELECT n.author_id FROM chapters c JOIN novels n ON c.novel_id = n.id WHERE c.id = $1`, chapterID)
	if err != nil || ownerID != authorID {
		return nil, fmt.Errorf("chapter not found or not owned by author")
	}

	sets := []string{}
	args := []any{}
	idx := 1

	if req.Title != nil {
		sets = append(sets, "title = $"+strconv.Itoa(idx))
		args = append(args, *req.Title)
		idx++
	}
	if req.ContentMD != nil {
		sets = append(sets, "content_md = $"+strconv.Itoa(idx))
		args = append(args, *req.ContentMD)
		idx++
		sets = append(sets, "content = $"+strconv.Itoa(idx))
		args = append(args, *req.ContentMD)
		idx++
		wordCount := len(strings.Fields(*req.ContentMD))
		sets = append(sets, "word_count = $"+strconv.Itoa(idx))
		args = append(args, wordCount)
		idx++
	}
	if req.Status != nil {
		sets = append(sets, "status = $"+strconv.Itoa(idx))
		args = append(args, *req.Status)
		idx++
		if *req.Status == "published" {
			sets = append(sets, "published_at = NOW()")
		}
	}

	if len(sets) == 0 {
		chapter := &models.Chapter{}
		err := r.db.GetContext(ctx, chapter, "SELECT * FROM chapters WHERE id = $1", chapterID)
		return chapter, err
	}

	sets = append(sets, "updated_at = NOW()")
	query := "UPDATE chapters SET " + strings.Join(sets, ", ") + " WHERE id = $" + strconv.Itoa(idx)
	args = append(args, chapterID)
	_, err = r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	chapter := &models.Chapter{}
	err = r.db.GetContext(ctx, chapter, "SELECT * FROM chapters WHERE id = $1", chapterID)
	if err != nil {
		return nil, err
	}

	// Update novel chapter count
	_, _ = r.db.ExecContext(ctx, `
		UPDATE novels SET chapter_count = (
			SELECT COUNT(*) FROM chapters WHERE novel_id = $1 AND status = 'published'
		), updated_at = NOW() WHERE id = $1`, chapter.NovelID)

	return chapter, nil
}

func (r *AuthorRepository) GetChaptersByNovel(ctx context.Context, novelID, authorID string) ([]models.ChapterListItem, error) {
	// Verify ownership
	var ownerID string
	err := r.db.GetContext(ctx, &ownerID, "SELECT author_id FROM novels WHERE id = $1", novelID)
	if err != nil || ownerID != authorID {
		return nil, fmt.Errorf("novel not found or not owned by author")
	}

	var chapters []models.ChapterListItem
	err = r.db.SelectContext(ctx, &chapters, `
		SELECT id, novel_id, chapter_number, title, word_count, views, status, published_at, created_at
		FROM chapters WHERE novel_id = $1 ORDER BY chapter_number ASC`, novelID)
	return chapters, err
}

func (r *AuthorRepository) GetChapterByID(ctx context.Context, chapterID, authorID string) (*models.Chapter, error) {
	var ownerID string
	err := r.db.GetContext(ctx, &ownerID, `
		SELECT n.author_id FROM chapters c JOIN novels n ON c.novel_id = n.id WHERE c.id = $1`, chapterID)
	if err != nil || ownerID != authorID {
		return nil, fmt.Errorf("chapter not found or not owned by author")
	}

	var chapter models.Chapter
	err = r.db.GetContext(ctx, &chapter, "SELECT * FROM chapters WHERE id = $1", chapterID)
	if err != nil {
		return nil, err
	}
	return &chapter, nil
}

func (r *AuthorRepository) DeleteChapter(ctx context.Context, chapterID, authorID string) error {
	var ownerID string
	err := r.db.GetContext(ctx, &ownerID, `
		SELECT n.author_id FROM chapters c JOIN novels n ON c.novel_id = n.id WHERE c.id = $1`, chapterID)
	if err != nil || ownerID != authorID {
		return fmt.Errorf("chapter not found or not owned by author")
	}

	_, err = r.db.ExecContext(ctx, "DELETE FROM chapters WHERE id = $1", chapterID)
	return err
}

// ===================== Analytics =====================

type AuthorStats struct {
	TotalNovels   int   `json:"total_novels" db:"total_novels"`
	TotalChapters int   `json:"total_chapters" db:"total_chapters"`
	TotalViews    int64 `json:"total_views" db:"total_views"`
	TotalFollows  int   `json:"total_follows" db:"total_follows"`
}

func (r *AuthorRepository) GetStats(ctx context.Context, authorID string) (*AuthorStats, error) {
	stats := &AuthorStats{}
	err := r.db.GetContext(ctx, stats, `
		SELECT 
			(SELECT COUNT(*) FROM novels WHERE author_id = $1) as total_novels,
			(SELECT COUNT(*) FROM chapters c JOIN novels n ON c.novel_id = n.id WHERE n.author_id = $1) as total_chapters,
			(SELECT COALESCE(SUM(views), 0) FROM novels WHERE author_id = $1) as total_views,
			(SELECT COUNT(*) FROM follows f JOIN novels n ON f.novel_id = n.id WHERE n.author_id = $1) as total_follows
	`, authorID)
	if err != nil {
		log.Printf("error getting author stats: %v", err)
	}
	return stats, err
}
