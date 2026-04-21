package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"aetha-backend/internal/models"

	"github.com/redis/go-redis/v9"
)

type CacheService struct {
	rdb        *redis.Client
	chapterTTL time.Duration
	novelTTL   time.Duration
	catalogTTL time.Duration
}

func NewCacheService(rdb *redis.Client, chapterTTL, novelTTL, catalogTTL time.Duration) *CacheService {
	return &CacheService{
		rdb:        rdb,
		chapterTTL: chapterTTL,
		novelTTL:   novelTTL,
		catalogTTL: catalogTTL,
	}
}

// --- Chapter cache ---

func chapterKey(novelID string, chapterNum int) string {
	return fmt.Sprintf("chapter:%s:%d", novelID, chapterNum)
}

func (c *CacheService) GetChapter(ctx context.Context, novelID string, chapterNum int) (*models.Chapter, error) {
	key := chapterKey(novelID, chapterNum)
	data, err := c.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return nil, err
	}

	var chapter models.Chapter
	if err := json.Unmarshal(data, &chapter); err != nil {
		return nil, err
	}
	return &chapter, nil
}

func (c *CacheService) SetChapter(ctx context.Context, novelID string, chapterNum int, chapter *models.Chapter) error {
	key := chapterKey(novelID, chapterNum)
	data, err := json.Marshal(chapter)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, key, data, c.chapterTTL).Err()
}

// --- Novel cache ---

func novelKey(slug string) string {
	return fmt.Sprintf("novel:%s", slug)
}

func (c *CacheService) GetNovel(ctx context.Context, slug string) (*models.NovelDetailResponse, error) {
	key := novelKey(slug)
	data, err := c.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return nil, err
	}

	var resp models.NovelDetailResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *CacheService) SetNovel(ctx context.Context, slug string, resp *models.NovelDetailResponse) error {
	key := novelKey(slug)
	data, err := json.Marshal(resp)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, key, data, c.novelTTL).Err()
}

// --- Catalog cache ---

func catalogKey(page, perPage int, sortBy, status, genre, language string) string {
	return fmt.Sprintf("catalog:%d:%d:%s:%s:%s:%s", page, perPage, sortBy, status, genre, language)
}

func (c *CacheService) GetCatalog(ctx context.Context, page, perPage int, sortBy, status, genre, language string) (*models.PaginatedResponse, error) {
	key := catalogKey(page, perPage, sortBy, status, genre, language)
	data, err := c.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return nil, err
	}

	var resp models.PaginatedResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *CacheService) SetCatalog(ctx context.Context, page, perPage int, sortBy, status, genre, language string, resp *models.PaginatedResponse) error {
	key := catalogKey(page, perPage, sortBy, status, genre, language)
	data, err := json.Marshal(resp)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, key, data, c.catalogTTL).Err()
}

// --- Prewarming ---

func (c *CacheService) PrewarmChapters(ctx context.Context, chapters []models.Chapter) {
	for _, ch := range chapters {
		if err := c.SetChapter(ctx, ch.NovelID, ch.ChapterNumber, &ch); err != nil {
			log.Printf("Cache prewarm error for chapter %s:%d: %v", ch.NovelID, ch.ChapterNumber, err)
		}
	}
	log.Printf("🔥 Prewarmed %d chapters into Redis", len(chapters))
}

// --- Invalidation ---

func (c *CacheService) InvalidateNovel(ctx context.Context, slug string) {
	c.rdb.Del(ctx, novelKey(slug))
}

func (c *CacheService) InvalidateCatalog(ctx context.Context) {
	// Delete all catalog keys
	iter := c.rdb.Scan(ctx, 0, "catalog:*", 100).Iterator()
	for iter.Next(ctx) {
		c.rdb.Del(ctx, iter.Val())
	}
}
