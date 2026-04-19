-- =====================================================
-- V2: Users, Auth, Author System, Community, Progress
-- =====================================================

-- 1. Users & Auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) DEFAULT NULL,  -- NULL for OAuth-only users
    avatar_url VARCHAR(1000) DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'reader'
        CHECK (role IN ('reader', 'author', 'moderator', 'admin')),
    bio TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,       -- 'google', 'github'
    provider_id VARCHAR(255) NOT NULL,   -- external user ID
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ DEFAULT NULL
);

-- 2. Author profiles (separate from users to avoid column bloat)
CREATE TABLE author_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    brand_color VARCHAR(7) DEFAULT '#6366f1',
    website_url VARCHAR(500) DEFAULT '',
    social_links JSONB DEFAULT '{}',
    total_views BIGINT DEFAULT 0,
    total_followers INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Link novels to author users (add author_id FK)
ALTER TABLE novels ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 4. Chapter enhancements for author workflow
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'scheduled', 'published'));
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS content_md TEXT DEFAULT '';  -- markdown source

-- 5. Content warnings / tags
CREATE TABLE content_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE novel_warnings (
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    warning_id UUID NOT NULL REFERENCES content_warnings(id) ON DELETE CASCADE,
    PRIMARY KEY (novel_id, warning_id)
);

-- 6. Follows
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, novel_id)
);

ALTER TABLE novels ADD COLUMN IF NOT EXISTS follower_count INT DEFAULT 0;

-- 7. Comments (materialized path for efficient tree queries)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    path TEXT NOT NULL DEFAULT '',         -- materialized path e.g. '001.005.012'
    depth INT NOT NULL DEFAULT 0 CHECK (depth <= 3),
    body TEXT NOT NULL,
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 8. Reviews (weighted multi-dimension ratings)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_story SMALLINT NOT NULL CHECK (rating_story BETWEEN 1 AND 5),
    rating_style SMALLINT NOT NULL CHECK (rating_style BETWEEN 1 AND 5),
    rating_grammar SMALLINT NOT NULL CHECK (rating_grammar BETWEEN 1 AND 5),
    rating_character SMALLINT NOT NULL CHECK (rating_character BETWEEN 1 AND 5),
    overall_rating DECIMAL(3,2) GENERATED ALWAYS AS (
        (rating_story + rating_style + rating_grammar + rating_character)::decimal / 4
    ) STORED,
    title VARCHAR(200) DEFAULT '',
    body TEXT DEFAULT '',
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(novel_id, user_id)
);

CREATE TABLE review_votes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    helpful BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, review_id)
);

-- 9. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,  -- 'new_chapter', 'review', 'comment_reply', 'follow'
    title VARCHAR(300) NOT NULL,
    body TEXT DEFAULT '',
    link VARCHAR(500) DEFAULT '',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Reading progress (synced from Redis buffer)
CREATE TABLE reading_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_number INT NOT NULL DEFAULT 1,
    scroll_position DECIMAL(10,4) DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, novel_id)
);

-- 11. Reports (moderation)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('novel', 'chapter', 'comment', 'review', 'user')),
    target_id UUID NOT NULL,
    reason VARCHAR(50) NOT NULL,
    details TEXT DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ DEFAULT NULL
);

-- =====================================================
-- Performance Indexes
-- =====================================================

-- Users
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;

-- OAuth
CREATE INDEX idx_oauth_user ON oauth_accounts(user_id);

-- Refresh tokens
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

-- Novel author
CREATE INDEX idx_novels_author ON novels(author_id) WHERE author_id IS NOT NULL;

-- Chapters scheduling
CREATE INDEX idx_chapters_scheduled ON chapters(published_at) WHERE status = 'scheduled';
CREATE INDEX idx_chapters_status ON chapters(novel_id, status);

-- Follows
CREATE INDEX idx_follows_user ON follows(user_id);
CREATE INDEX idx_follows_novel ON follows(novel_id);

-- Comments (materialized path for subtree queries)
CREATE INDEX idx_comments_chapter ON comments(chapter_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_path ON comments(chapter_id, path) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE deleted_at IS NULL;

-- Reviews
CREATE INDEX idx_reviews_novel ON reviews(novel_id, overall_rating DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_user ON reviews(user_id) WHERE deleted_at IS NULL;

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Reading progress
CREATE INDEX idx_progress_user ON reading_progress(user_id);

-- Reports
CREATE INDEX idx_reports_status ON reports(status, created_at DESC);

-- Full-text search: trigram index for Sinhala/Tamil/English titles
CREATE INDEX idx_novels_title_trgm ON novels USING GIN (title gin_trgm_ops);
CREATE INDEX idx_novels_author_trgm ON novels USING GIN (author gin_trgm_ops);
