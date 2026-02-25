package repository

import (
	"fmt"

	"aetha-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

type NovelRepository struct {
	db *sqlx.DB
}

func NewNovelRepository(db *sqlx.DB) *NovelRepository {
	return &NovelRepository{db: db}
}

func (r *NovelRepository) GetAll(page, perPage int, sortBy, status, genre string) ([]models.Novel, int, error) {
	offset := (page - 1) * perPage

	// Build dynamic query
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if status != "" && status != "all" {
		where += " AND n.status = $" + itoa(argIdx)
		args = append(args, status)
		argIdx++
	}

	countQuery := "SELECT COUNT(*) FROM novels n " + where
	if genre != "" {
		countQuery = `SELECT COUNT(DISTINCT n.id) FROM novels n 
			JOIN novel_genres ng ON n.id = ng.novel_id 
			JOIN genres g ON ng.genre_id = g.id ` + where + " AND g.slug = $" + itoa(argIdx)
		args = append(args, genre)
		argIdx++
	}

	var total int
	err := r.db.Get(&total, countQuery, args...)
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

	// Reset args for main query
	args2 := []interface{}{}
	where2 := "WHERE 1=1"
	argIdx2 := 1

	if status != "" && status != "all" {
		where2 += " AND n.status = $" + itoa(argIdx2)
		args2 = append(args2, status)
		argIdx2++
	}

	query := "SELECT n.* FROM novels n "
	if genre != "" {
		query = `SELECT DISTINCT n.* FROM novels n 
			JOIN novel_genres ng ON n.id = ng.novel_id 
			JOIN genres g ON ng.genre_id = g.id `
		where2 += " AND g.slug = $" + itoa(argIdx2)
		args2 = append(args2, genre)
		argIdx2++
	}

	query += where2 + " " + orderBy + " LIMIT $" + itoa(argIdx2) + " OFFSET $" + itoa(argIdx2+1)
	args2 = append(args2, perPage, offset)

	var novels []models.Novel
	err = r.db.Select(&novels, query, args2...)
	if err != nil {
		return nil, 0, err
	}

	return novels, total, nil
}

func (r *NovelRepository) GetBySlug(slug string) (*models.Novel, error) {
	novel := &models.Novel{}
	err := r.db.Get(novel, "SELECT * FROM novels WHERE slug = $1", slug)
	if err != nil {
		return nil, err
	}
	return novel, nil
}

func (r *NovelRepository) GetGenresByNovelID(novelID string) ([]models.Genre, error) {
	var genres []models.Genre
	err := r.db.Select(&genres, `
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
	r.db.Exec("UPDATE novels SET views = views + 1 WHERE id = $1", id)
}

func (r *NovelRepository) Search(query string, limit int) ([]models.Novel, error) {
	var novels []models.Novel
	err := r.db.Select(&novels, `
		SELECT * FROM novels 
		WHERE title ILIKE $1 OR author ILIKE $1 OR description ILIKE $1
		ORDER BY views DESC
		LIMIT $2`, "%"+query+"%", limit)
	if err != nil {
		return nil, err
	}
	return novels, nil
}

func (r *NovelRepository) GetAllGenres() ([]models.Genre, error) {
	var genres []models.Genre
	err := r.db.Select(&genres, "SELECT * FROM genres ORDER BY name")
	return genres, err
}

func itoa(i int) string {
	return fmt.Sprintf("%d", i)
}
