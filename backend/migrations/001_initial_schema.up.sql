-- V1 baseline: novels, genres, chapters, bookmarks
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS novels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    author VARCHAR(255) NOT NULL DEFAULT 'Unknown',
    artist VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    cover_url VARCHAR(1000) DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'ongoing',
    novel_type VARCHAR(50) NOT NULL DEFAULT 'web_novel',
    year INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    views BIGINT DEFAULT 0,
    chapter_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS novel_genres (
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (novel_id, genre_id)
);

CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_number INT NOT NULL,
    title VARCHAR(500) NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    word_count INT DEFAULT 0,
    views BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(novel_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    scroll_position DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, novel_id)
);

-- V1 indexes
CREATE INDEX IF NOT EXISTS idx_novels_slug ON novels(slug);
CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
CREATE INDEX IF NOT EXISTS idx_novels_views ON novels(views DESC);
CREATE INDEX IF NOT EXISTS idx_novels_updated ON novels(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
CREATE INDEX IF NOT EXISTS idx_chapters_novel_number ON chapters(novel_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_bookmarks_session ON bookmarks(session_id);
