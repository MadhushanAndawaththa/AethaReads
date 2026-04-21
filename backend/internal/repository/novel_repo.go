package repository

import (
	"context"
	"log"
	"strconv"

	"aetha-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type NovelRepository struct {
	db *sqlx.DB
}

func NewNovelRepository(db *sqlx.DB) *NovelRepository {
	return &NovelRepository{db: db}
}

func (r *NovelRepository) GetAll(ctx context.Context, page, perPage int, sortBy, status, genre, language string) ([]models.Novel, int, error) {
	offset := (page - 1) * perPage

	// Build shared filter clauses
	where := "WHERE 1=1"
	args := []any{}
	argIdx := 1

	if status != "" && status != "all" {
		where += " AND n.status = $" + strconv.Itoa(argIdx)
		args = append(args, status)
		argIdx++
	}

	if language != "" && language != "all" {
		where += " AND n.language = $" + strconv.Itoa(argIdx)
		args = append(args, language)
		argIdx++
	}

	joinClause := ""
	if genre != "" {
		joinClause = `JOIN novel_genres ng ON n.id = ng.novel_id 
			JOIN genres g ON ng.genre_id = g.id `
		where += " AND g.slug = $" + strconv.Itoa(argIdx)
		args = append(args, genre)
		argIdx++
	}

	// Count query
	distinct := ""
	if genre != "" {
		distinct = "DISTINCT "
	}
	countQuery := "SELECT COUNT(" + distinct + "n.id) FROM novels n " + joinClause + where

	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	orderBy := "ORDER BY n.updated_at DESC"
	switch sortBy {
	case "popular":
		orderBy = "ORDER BY n.views DESC"
	case "rating":
		orderBy = "ORDER BY n.rating DESC"
	case "title":
		orderBy = "ORDER BY n.title ASC"
	case "newest":
		orderBy = "ORDER BY n.created_at DESC"
	}

	selectDistinct := ""
	if genre != "" {
		selectDistinct = "DISTINCT "
	}
	query := "SELECT " + selectDistinct + "n.* FROM novels n " + joinClause + where + " " + orderBy +
		" LIMIT $" + strconv.Itoa(argIdx) + " OFFSET $" + strconv.Itoa(argIdx+1)
	args = append(args, perPage, offset)

	var novels []models.Novel
	err = r.db.SelectContext(ctx, &novels, query, args...)
	if err != nil {
		return nil, 0, err
	}

	return novels, total, nil
}

func (r *NovelRepository) GetBySlug(ctx context.Context, slug string) (*models.Novel, error) {
	novel := &models.Novel{}
	err := r.db.GetContext(ctx, novel, "SELECT * FROM novels WHERE slug = $1", slug)
	if err != nil {
		return nil, err
	}
	return novel, nil
}

func (r *NovelRepository) GetGenresByNovelID(ctx context.Context, novelID string) ([]models.Genre, error) {
	var genres []models.Genre
	err := r.db.SelectContext(ctx, &genres, `
		SELECT g.* FROM genres g
		JOIN novel_genres ng ON g.id = ng.genre_id
		WHERE ng.novel_id = $1
		ORDER BY g.name`, novelID)
	if err != nil {
		return nil, err
	}
	return genres, nil
}

func (r *NovelRepository) IncrementViews(id string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("panic in IncrementViews(novel): %v", r)
		}
	}()
	_, err := r.db.Exec("UPDATE novels SET views = views + 1 WHERE id = $1", id)
	if err != nil {
		log.Printf("failed to increment novel views: %v", err)
	}
}

func (r *NovelRepository) Search(ctx context.Context, query string, limit int) ([]models.Novel, error) {
	var novels []models.Novel
	err := r.db.SelectContext(ctx, &novels, `
		SELECT * FROM novels 
		WHERE title ILIKE $1 OR author ILIKE $1 OR description ILIKE $1
		ORDER BY views DESC
		LIMIT $2`, "%"+query+"%", limit)
	if err != nil {
		return nil, err
	}
	return novels, nil
}

func (r *NovelRepository) GetAllGenres(ctx context.Context) ([]models.Genre, error) {
	var genres []models.Genre
	err := r.db.SelectContext(ctx, &genres, "SELECT * FROM genres ORDER BY name")
	return genres, err
}
