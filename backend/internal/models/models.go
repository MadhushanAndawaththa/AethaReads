package models

import (
	"time"
)

// ===================== Core Entities =====================

type Novel struct {
	ID            string    `json:"id" db:"id"`
	Title         string    `json:"title" db:"title"`
	Slug          string    `json:"slug" db:"slug"`
	Author        string    `json:"author" db:"author"`
	AuthorID      *string   `json:"author_id" db:"author_id"`
	Artist        string    `json:"artist" db:"artist"`
	Description   string    `json:"description" db:"description"`
	CoverURL      string    `json:"cover_url" db:"cover_url"`
	Status        string    `json:"status" db:"status"`
	Language      string    `json:"language" db:"language"`
	NovelType     string    `json:"novel_type" db:"novel_type"`
	Year          int       `json:"year" db:"year"`
	Rating        float64   `json:"rating" db:"rating"`
	Views         int64     `json:"views" db:"views"`
	ChapterCount  int       `json:"chapter_count" db:"chapter_count"`
	FollowerCount int       `json:"follower_count" db:"follower_count"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

type NovelWithGenres struct {
	Novel
	Genres   []Genre          `json:"genres"`
	Warnings []ContentWarning `json:"warnings"`
}

type Genre struct {
	ID   string `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
	Slug string `json:"slug" db:"slug"`
}

type ContentWarning struct {
	ID   string `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
	Slug string `json:"slug" db:"slug"`
}

type Chapter struct {
	ID            string     `json:"id" db:"id"`
	NovelID       string     `json:"novel_id" db:"novel_id"`
	ChapterNumber int        `json:"chapter_number" db:"chapter_number"`
	Title         string     `json:"title" db:"title"`
	Content       string     `json:"content" db:"content"`
	ContentMD     string     `json:"content_md,omitempty" db:"content_md"`
	WordCount     int        `json:"word_count" db:"word_count"`
	Views         int64      `json:"views" db:"views"`
	Status        string     `json:"status" db:"status"`
	PublishedAt   *time.Time `json:"published_at" db:"published_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

type ChapterListItem struct {
	ID            string     `json:"id" db:"id"`
	NovelID       string     `json:"novel_id" db:"novel_id"`
	ChapterNumber int        `json:"chapter_number" db:"chapter_number"`
	Title         string     `json:"title" db:"title"`
	WordCount     int        `json:"word_count" db:"word_count"`
	Views         int64      `json:"views" db:"views"`
	Status        string     `json:"status" db:"status"`
	PublishedAt   *time.Time `json:"published_at" db:"published_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
}

// ===================== User & Auth =====================

type User struct {
	ID           string     `json:"id" db:"id"`
	Email        string     `json:"email" db:"email"`
	Username     string     `json:"username" db:"username"`
	DisplayName  string     `json:"display_name" db:"display_name"`
	PasswordHash *string    `json:"-" db:"password_hash"`
	AvatarURL    string     `json:"avatar_url" db:"avatar_url"`
	Role         string     `json:"role" db:"role"`
	Bio          string     `json:"bio" db:"bio"`
	EmailVerified bool      `json:"email_verified" db:"email_verified"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty" db:"email_verified_at"`
	SuspendedAt *time.Time  `json:"suspended_at,omitempty" db:"suspended_at"`
	SuspensionReason string `json:"suspension_reason,omitempty" db:"suspension_reason"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt    *time.Time `json:"-" db:"deleted_at"`
}

type UserPublic struct {
	ID          string    `json:"id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	AvatarURL   string    `json:"avatar_url"`
	Role        string    `json:"role"`
	Bio         string    `json:"bio"`
	EmailVerified bool    `json:"email_verified"`
	CreatedAt   time.Time `json:"created_at"`
}

type OAuthAccount struct {
	ID         string    `json:"id" db:"id"`
	UserID     string    `json:"user_id" db:"user_id"`
	Provider   string    `json:"provider" db:"provider"`
	ProviderID string    `json:"provider_id" db:"provider_id"`
	Email      string    `json:"email" db:"email"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type RefreshToken struct {
	ID        string     `db:"id"`
	UserID    string     `db:"user_id"`
	TokenHash string     `db:"token_hash"`
	ExpiresAt time.Time  `db:"expires_at"`
	CreatedAt time.Time  `db:"created_at"`
	RevokedAt *time.Time `db:"revoked_at"`
}

type AuthorProfile struct {
	UserID         string    `json:"user_id" db:"user_id"`
	BrandColor     string    `json:"brand_color" db:"brand_color"`
	WebsiteURL     string    `json:"website_url" db:"website_url"`
	SocialLinks    string    `json:"social_links" db:"social_links"` // JSONB
	TotalViews     int64     `json:"total_views" db:"total_views"`
	TotalFollowers int       `json:"total_followers" db:"total_followers"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

// ===================== Community =====================

type Comment struct {
	ID        string     `json:"id" db:"id"`
	ChapterID string     `json:"chapter_id" db:"chapter_id"`
	UserID    string     `json:"user_id" db:"user_id"`
	ParentID  *string    `json:"parent_id" db:"parent_id"`
	Path      string     `json:"path" db:"path"`
	Depth     int        `json:"depth" db:"depth"`
	Body      string     `json:"body" db:"body"`
	Upvotes   int        `json:"upvotes" db:"upvotes"`
	Downvotes int        `json:"downvotes" db:"downvotes"`
	Hidden    bool       `json:"hidden" db:"hidden"`
	HiddenReason string  `json:"hidden_reason,omitempty" db:"hidden_reason"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"-" db:"deleted_at"`
}

type CommentWithUser struct {
	Comment
	Username    string `json:"username" db:"username"`
	DisplayName string `json:"display_name" db:"display_name"`
	AvatarURL   string `json:"avatar_url" db:"avatar_url"`
	UserRole    string `json:"user_role" db:"user_role"`
}

type Review struct {
	ID              string     `json:"id" db:"id"`
	NovelID         string     `json:"novel_id" db:"novel_id"`
	UserID          string     `json:"user_id" db:"user_id"`
	RatingStory     int        `json:"rating_story" db:"rating_story"`
	RatingStyle     int        `json:"rating_style" db:"rating_style"`
	RatingGrammar   int        `json:"rating_grammar" db:"rating_grammar"`
	RatingCharacter int        `json:"rating_character" db:"rating_character"`
	OverallRating   float64    `json:"overall_rating" db:"overall_rating"`
	Title           string     `json:"title" db:"title"`
	Body            string     `json:"body" db:"body"`
	HelpfulCount    int        `json:"helpful_count" db:"helpful_count"`
	Hidden          bool       `json:"hidden" db:"hidden"`
	HiddenReason    string     `json:"hidden_reason,omitempty" db:"hidden_reason"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt       *time.Time `json:"-" db:"deleted_at"`
}

type ReviewWithUser struct {
	Review
	Username    string `json:"username" db:"username"`
	DisplayName string `json:"display_name" db:"display_name"`
	AvatarURL   string `json:"avatar_url" db:"avatar_url"`
}

type Follow struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	NovelID   string    `json:"novel_id" db:"novel_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type Notification struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Type      string    `json:"type" db:"type"`
	Title     string    `json:"title" db:"title"`
	Body      string    `json:"body" db:"body"`
	Link      string    `json:"link" db:"link"`
	IsRead    bool      `json:"is_read" db:"is_read"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type ReadingProgress struct {
	ID             string    `json:"id" db:"id"`
	UserID         string    `json:"user_id" db:"user_id"`
	NovelID        string    `json:"novel_id" db:"novel_id"`
	NovelSlug      string    `json:"novel_slug" db:"novel_slug"`
	NovelTitle     string    `json:"novel_title" db:"novel_title"`
	ChapterNumber  int       `json:"chapter_number" db:"chapter_number"`
	ScrollPosition float64   `json:"scroll_position" db:"scroll_position"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

type Report struct {
	ID         string     `json:"id" db:"id"`
	ReporterID string     `json:"reporter_id" db:"reporter_id"`
	TargetType string     `json:"target_type" db:"target_type"`
	TargetID   string     `json:"target_id" db:"target_id"`
	Reason     string     `json:"reason" db:"reason"`
	Details    string     `json:"details" db:"details"`
	Status     string     `json:"status" db:"status"`
	ReviewedBy *string    `json:"reviewed_by,omitempty" db:"reviewed_by"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	ResolvedAt *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
}

type ReportWithReporter struct {
	Report
	ReporterUsername    string `json:"reporter_username" db:"reporter_username"`
	ReporterDisplayName string `json:"reporter_display_name" db:"reporter_display_name"`
}

type EmailVerificationToken struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	TokenHash string    `json:"-" db:"token_hash"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type AuditLog struct {
	ID           string    `json:"id" db:"id"`
	ActorID      *string   `json:"actor_id,omitempty" db:"actor_id"`
	Action       string    `json:"action" db:"action"`
	ResourceType string    `json:"resource_type" db:"resource_type"`
	ResourceID   *string   `json:"resource_id,omitempty" db:"resource_id"`
	Details      string    `json:"details" db:"details"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// ===================== API Requests =====================

type RegisterRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

type VerifyEmailRequest struct {
	Token string `json:"token"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type CreateNovelRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	CoverURL    string   `json:"cover_url"`
	Status      string   `json:"status"`
	Language    string   `json:"language"`
	NovelType   string   `json:"novel_type"`
	GenreIDs    []string `json:"genre_ids"`
	WarningIDs  []string `json:"warning_ids"`
}

type UpdateNovelRequest struct {
	Title       *string  `json:"title"`
	Description *string  `json:"description"`
	CoverURL    *string  `json:"cover_url"`
	Status      *string  `json:"status"`
	Language    *string  `json:"language"`
	NovelType   *string  `json:"novel_type"`
	GenreIDs    []string `json:"genre_ids"`
	WarningIDs  []string `json:"warning_ids"`
}

type UpdateUserProfileRequest struct {
	DisplayName *string `json:"display_name"`
	AvatarURL   *string `json:"avatar_url"`
	Bio         *string `json:"bio"`
	BrandColor  *string `json:"brand_color"`
	WebsiteURL  *string `json:"website_url"`
	SocialLinks *string `json:"social_links"`
}

type CreateChapterRequest struct {
	Title     string `json:"title"`
	ContentMD string `json:"content_md"`
	Status    string `json:"status"`     // draft, published, scheduled
	PublishAt string `json:"publish_at"` // ISO8601, for scheduled
}

type UpdateChapterRequest struct {
	Title     *string `json:"title"`
	ContentMD *string `json:"content_md"`
	Status    *string `json:"status"`
	PublishAt *string `json:"publish_at"`
}

type CreateCommentRequest struct {
	Body     string  `json:"body"`
	ParentID *string `json:"parent_id"`
}

type CreateReviewRequest struct {
	RatingStory     int    `json:"rating_story"`
	RatingStyle     int    `json:"rating_style"`
	RatingGrammar   int    `json:"rating_grammar"`
	RatingCharacter int    `json:"rating_character"`
	Title           string `json:"title"`
	Body            string `json:"body"`
}

type CreateReportRequest struct {
	TargetType string `json:"target_type"`
	TargetID   string `json:"target_id"`
	Reason     string `json:"reason"`
	Details    string `json:"details"`
}

type UpdateReportStatusRequest struct {
	Status string `json:"status"`
	Action string `json:"action"`
	Reason string `json:"reason"`
}

type SuspendUserRequest struct {
	Reason string `json:"reason"`
}

type UpdateProgressRequest struct {
	ChapterNumber  int     `json:"chapter_number"`
	ScrollPosition float64 `json:"scroll_position"`
}

// ===================== API Responses =====================

type PaginatedResponse struct {
	Data       any `json:"data"`
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type NovelDetailResponse struct {
	Novel    NovelWithGenres   `json:"novel"`
	Chapters []ChapterListItem `json:"chapters"`
}

type ChapterReadResponse struct {
	Chapter       Chapter `json:"chapter"`
	NovelTitle    string  `json:"novel_title"`
	NovelSlug     string  `json:"novel_slug"`
	NovelLanguage string  `json:"novel_language"`
	PrevChapter   *int    `json:"prev_chapter"`
	NextChapter   *int    `json:"next_chapter"`
	TotalChaps    int     `json:"total_chapters"`
}

type AuthResponse struct {
	User        UserPublic `json:"user"`
	AccessToken string     `json:"access_token,omitempty"`
	CSRFToken   string     `json:"csrf_token,omitempty"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
