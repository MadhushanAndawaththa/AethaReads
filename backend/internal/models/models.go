package models

import (
	"time"
)

// Novel represents the main novel entity
type Novel struct {
	ID           string    `json:"id" db:"id"`
	Title        string    `json:"title" db:"title"`
	Slug         string    `json:"slug" db:"slug"`
	Author       string    `json:"author" db:"author"`
	Artist       string    `json:"artist" db:"artist"`
	Description  string    `json:"description" db:"description"`
	CoverURL     string    `json:"cover_url" db:"cover_url"`
	Status       string    `json:"status" db:"status"`
	NovelType    string    `json:"novel_type" db:"novel_type"`
	Year         int       `json:"year" db:"year"`
	Rating       float64   `json:"rating" db:"rating"`
	Views        int64     `json:"views" db:"views"`
	ChapterCount int       `json:"chapter_count" db:"chapter_count"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// NovelWithGenres includes genre info
type NovelWithGenres struct {
	Novel
	Genres []Genre `json:"genres"`
}

// Genre represents a genre/tag
type Genre struct {
	ID   string `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
	Slug string `json:"slug" db:"slug"`
}

// Chapter represents a novel chapter
type Chapter struct {
	ID            string    `json:"id" db:"id"`
	NovelID       string    `json:"novel_id" db:"novel_id"`
	ChapterNumber int       `json:"chapter_number" db:"chapter_number"`
	Title         string    `json:"title" db:"title"`
	Content       string    `json:"content" db:"content"`
	WordCount     int       `json:"word_count" db:"word_count"`
	Views         int64     `json:"views" db:"views"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

// ChapterListItem is a chapter without content (for chapter lists)
type ChapterListItem struct {
	ID            string    `json:"id" db:"id"`
	NovelID       string    `json:"novel_id" db:"novel_id"`
	ChapterNumber int       `json:"chapter_number" db:"chapter_number"`
	Title         string    `json:"title" db:"title"`
	WordCount     int       `json:"word_count" db:"word_count"`
	Views         int64     `json:"views" db:"views"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

// Bookmark tracks reading progress
type Bookmark struct {
	ID             string    `json:"id" db:"id"`
	SessionID      string    `json:"session_id" db:"session_id"`
	NovelID        string    `json:"novel_id" db:"novel_id"`
	ChapterID      *string   `json:"chapter_id" db:"chapter_id"`
	ScrollPosition float64   `json:"scroll_position" db:"scroll_position"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

// --- API Response structs ---

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Page       int         `json:"page"`
	PerPage    int         `json:"per_page"`
	Total      int         `json:"total"`
	TotalPages int         `json:"total_pages"`
}

type NovelDetailResponse struct {
	Novel    NovelWithGenres  `json:"novel"`
	Chapters []ChapterListItem `json:"chapters"`
}

type ChapterReadResponse struct {
	Chapter     Chapter  `json:"chapter"`
	NovelTitle  string   `json:"novel_title"`
	NovelSlug   string   `json:"novel_slug"`
	PrevChapter *int     `json:"prev_chapter"`
	NextChapter *int     `json:"next_chapter"`
	TotalChaps  int      `json:"total_chapters"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
