package database

import (
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jmoiron/sqlx"
)

func RunMigrations(db *sqlx.DB) {
	driver, err := postgres.WithInstance(db.DB, &postgres.Config{})
	if err != nil {
		log.Fatalf("Migration driver error: %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"aetha_db",
		driver,
	)
	if err != nil {
		// Fallback to inline migration if files not found (e.g. running outside project root)
		log.Printf("⚠️  Could not load migration files: %v — running inline fallback", err)
		runInlineMigrations(db)
		return
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Migration failed: %v", err)
	}

	version, dirty, _ := m.Version()
	log.Printf("✅ Migrations at version %d (dirty: %v)", version, dirty)
}

// runInlineMigrations is a safety fallback for Docker where the working directory
// may not have the migrations folder accessible.
func runInlineMigrations(db *sqlx.DB) {
	schema := fmt.Sprintf(`
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
		author_id UUID,
		follower_count INT DEFAULT 0,
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
		content_md TEXT DEFAULT '',
		word_count INT DEFAULT 0,
		views BIGINT DEFAULT 0,
		status VARCHAR(20) NOT NULL DEFAULT 'published',
		published_at TIMESTAMPTZ DEFAULT NULL,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		UNIQUE(novel_id, chapter_number)
	);

	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		email VARCHAR(255) NOT NULL UNIQUE,
		username VARCHAR(50) NOT NULL UNIQUE,
		display_name VARCHAR(100) NOT NULL DEFAULT '',
		password_hash VARCHAR(255) DEFAULT NULL,
		avatar_url VARCHAR(1000) DEFAULT '',
		role VARCHAR(20) NOT NULL DEFAULT 'reader',
		bio TEXT DEFAULT '',
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		deleted_at TIMESTAMPTZ DEFAULT NULL
	);

	CREATE TABLE IF NOT EXISTS oauth_accounts (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		provider VARCHAR(50) NOT NULL,
		provider_id VARCHAR(255) NOT NULL,
		email VARCHAR(255) NOT NULL,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		UNIQUE(provider, provider_id)
	);

	CREATE TABLE IF NOT EXISTS refresh_tokens (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		token_hash VARCHAR(255) NOT NULL UNIQUE,
		expires_at TIMESTAMPTZ NOT NULL,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		revoked_at TIMESTAMPTZ DEFAULT NULL
	);

	CREATE TABLE IF NOT EXISTS author_profiles (
		user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
		brand_color VARCHAR(7) DEFAULT '#6366f1',
		website_url VARCHAR(500) DEFAULT '',
		social_links JSONB DEFAULT '{}',
		total_views BIGINT DEFAULT 0,
		total_followers INT DEFAULT 0,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS follows (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		UNIQUE(user_id, novel_id)
	);

	CREATE TABLE IF NOT EXISTS comments (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
		path TEXT NOT NULL DEFAULT '',
		depth INT NOT NULL DEFAULT 0,
		body TEXT NOT NULL,
		upvotes INT DEFAULT 0,
		downvotes INT DEFAULT 0,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		deleted_at TIMESTAMPTZ DEFAULT NULL
	);

	CREATE TABLE IF NOT EXISTS reviews (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		rating_story SMALLINT NOT NULL,
		rating_style SMALLINT NOT NULL,
		rating_grammar SMALLINT NOT NULL,
		rating_character SMALLINT NOT NULL,
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

	CREATE TABLE IF NOT EXISTS review_votes (
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
		helpful BOOLEAN NOT NULL,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		PRIMARY KEY (user_id, review_id)
	);

	CREATE TABLE IF NOT EXISTS notifications (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		type VARCHAR(50) NOT NULL,
		title VARCHAR(300) NOT NULL,
		body TEXT DEFAULT '',
		link VARCHAR(500) DEFAULT '',
		is_read BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS reading_progress (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
		chapter_number INT NOT NULL DEFAULT 1,
		scroll_position DECIMAL(10,4) DEFAULT 0,
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		UNIQUE(user_id, novel_id)
	);

	CREATE TABLE IF NOT EXISTS reports (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		target_type VARCHAR(20) NOT NULL,
		target_id UUID NOT NULL,
		reason VARCHAR(50) NOT NULL,
		details TEXT DEFAULT '',
		status VARCHAR(20) NOT NULL DEFAULT 'pending',
		reviewed_by UUID REFERENCES users(id),
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		resolved_at TIMESTAMPTZ DEFAULT NULL
	);

	-- Add FK from novels to users only if the column exists
	DO $$ BEGIN
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'novels' AND column_name = 'author_id'
		) THEN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'novels_author_id_fkey') THEN
				ALTER TABLE novels ADD CONSTRAINT novels_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;
			END IF;
		END IF;
	END $$;

	-- Key indexes
	CREATE INDEX IF NOT EXISTS idx_novels_slug ON novels(slug);
	CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
	CREATE INDEX IF NOT EXISTS idx_novels_views ON novels(views DESC);
	CREATE INDEX IF NOT EXISTS idx_novels_updated ON novels(updated_at DESC);
	-- Create index on novels.author_id only if the column exists
	DO $$ BEGIN
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'novels' AND column_name = 'author_id'
		) THEN
			CREATE INDEX IF NOT EXISTS idx_novels_author ON novels(author_id);
		END IF;
	END $$;
	CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
	CREATE INDEX IF NOT EXISTS idx_chapters_novel_number ON chapters(novel_id, chapter_number);
	CREATE INDEX IF NOT EXISTS idx_comments_chapter ON comments(chapter_id, created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_reviews_novel ON reviews(novel_id, overall_rating DESC);
	CREATE INDEX IF NOT EXISTS idx_follows_user ON follows(user_id);
	CREATE INDEX IF NOT EXISTS idx_follows_novel ON follows(novel_id);
	CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_progress_user ON reading_progress(user_id);
	`)

	_, err := db.Exec(schema)
	if err != nil {
		log.Fatalf("Inline migration failed: %v", err)
	}

	log.Println("✅ Inline database migrations completed")
}
