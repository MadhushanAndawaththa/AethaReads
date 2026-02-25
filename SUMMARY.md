# AethaReads — Project Summary

> A high-performance, SEO-optimized web novel reading platform inspired by wtr-lab.com.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Backend Design](#backend-design)
5. [Frontend Design](#frontend-design)
6. [Database Schema](#database-schema)
7. [Caching Strategy](#caching-strategy)
8. [API Reference](#api-reference)
9. [SEO Strategy](#seo-strategy)
10. [Infrastructure & Deployment](#infrastructure--deployment)
11. [Security Measures](#security-measures)
12. [Project Structure](#project-structure)
13. [What Was Implemented (V1)](#what-was-implemented-v1)
14. [What to Implement Next (V2 Roadmap)](#what-to-implement-next-v2-roadmap)
15. [Architecture Decisions & Trade-offs](#architecture-decisions--trade-offs)

---

## Overview

AethaReads is a full-stack web novel reading platform built for **speed**, **SEO**, and **mobile-first responsiveness**. It serves translated/original web novels with a distraction-free reading experience. The project uses a monorepo structure with a Go backend and Next.js frontend, connected through a REST API with Redis caching.

**Key Priorities:**
- Sub-20ms cached chapter reads
- Google-indexable novel/chapter pages with structured data
- Mobile-first responsive design with reader customization
- Clean, scalable codebase following Go and React best practices

---

## Tech Stack

| Layer          | Technology                        | Why                                                              |
|----------------|-----------------------------------|------------------------------------------------------------------|
| **Backend**    | Go 1.22 + Fiber v2                | Raw speed, low memory footprint, excellent concurrency           |
| **Frontend**   | Next.js 15 + React 19             | SSR/ISR for SEO, App Router for modern patterns                  |
| **Database**   | PostgreSQL 16                     | ACID compliance, full-text search, JSON support                  |
| **Cache**      | Redis 7                           | In-memory speed for hot chapter reads                            |
| **Styling**    | Tailwind CSS 3.4                  | Utility-first, mobile-first, custom theming                      |
| **ORM/Driver** | sqlx + lib/pq                     | Type-safe queries without ORM overhead                           |
| **Container**  | Docker + Docker Compose           | Reproducible environments, single-command deployment             |

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│             │     │              │     │              │
│   Next.js   │────▶│   Go/Fiber   │────▶│  PostgreSQL  │
│  Frontend   │     │   Backend    │     │              │
│  (SSR/ISR)  │     │              │     └──────────────┘
│             │     │              │
└─────────────┘     │              │     ┌──────────────┐
   Port 3000        │              │────▶│    Redis      │
                    │              │     │   (Cache)     │
                    └──────────────┘     └──────────────┘
                       Port 8080           Port 6379
```

**Data Flow:**
1. Browser requests a page from Next.js (SSR or ISR-cached)
2. Next.js server components call the Go backend API
3. Go backend checks Redis cache first (hot path)
4. On cache miss, queries PostgreSQL and populates Redis
5. Response flows back through Next.js SSR → HTML to browser

---

## Backend Design

### Layered Architecture

```
cmd/server/main.go          → Entry point, wiring, graceful shutdown
internal/config/             → Environment-based configuration
internal/database/           → PostgreSQL, Redis connections, migrations, seeds
internal/models/             → Data models with JSON/DB struct tags
internal/repository/         → Data access layer (SQL queries)
internal/cache/              → Redis cache service (get/set/invalidate/prewarm)
internal/handlers/           → HTTP handlers (request/response logic)
internal/router/             → Route definitions + middleware stack
```

### Middleware Stack (order matters)
1. **Recover** — Catches panics, returns 500 instead of crashing
2. **Logger** — Request logging with latency tracking
3. **CORS** — Configured allowed origins
4. **Compress** — Brotli/gzip compression at best-speed level
5. **Rate Limiter** — 100 requests/minute per IP (sliding window)

### Key Design Patterns
- **Repository Pattern** — Clean separation of SQL from business logic
- **Context Propagation** — All DB queries use `context.Context` for cancellation
- **Graceful Shutdown** — Handles SIGINT/SIGTERM to drain connections before exit
- **Async View Counting** — View increments run in goroutines with panic recovery
- **Cache-Aside Pattern** — Check cache → miss → fetch DB → populate cache

### Connection Pool Settings
| Setting             | Value    | Rationale                                      |
|---------------------|----------|-------------------------------------------------|
| MaxOpenConns        | 50       | Handles concurrent request load                 |
| MaxIdleConns        | 25       | Keeps warm connections ready                     |
| ConnMaxLifetime     | 5 min    | Prevents stale connections to load-balanced DBs  |

---

## Frontend Design

### Page Architecture (App Router)

| Route                          | Rendering | Revalidation | Purpose                    |
|--------------------------------|-----------|--------------|----------------------------|
| `/`                            | SSR + ISR | 60s          | Home — popular & recent    |
| `/browse`                      | SSR + ISR | 60s          | Catalog with filters       |
| `/novel/[slug]`                | SSR + ISR | 300s (5min)  | Novel detail + chapter list|
| `/novel/[slug]/[number]`       | SSR + ISR | 3600s (1hr)  | Chapter reader             |

### Component Hierarchy

```
RootLayout
├── ThemeProvider (context: light/dark/sepia)
├── Header (hidden on reader pages)
├── Page Content
│   ├── HomePage → NovelCard grid
│   ├── BrowsePage → BrowseFilters + NovelCard grid + Pagination
│   ├── NovelPage → Novel detail + chapter list
│   └── ChapterPage → ChapterReader
│       ├── Top control bar (auto-hide on scroll)
│       ├── Settings panel (font/size/theme/width)
│       ├── Content area (customizable typography)
│       └── Bottom mobile nav
├── SearchModal (debounced 300ms, keyboard ESC)
└── BottomNav (mobile only, hidden on reader)
```

### Reader Features
- **3 Themes:** Light, Dark, Sepia — each with CSS custom properties
- **Customizable:** Font size (14-28px), line height (1.2-2.4), max width (500-1000px), font family (serif/sans)
- **Settings Persistence:** Stored in localStorage, restored on mount
- **Auto-hiding Controls:** Top/bottom bars hide on scroll down, reappear on scroll up
- **Keyboard Navigation:** ← Previous chapter, → Next chapter
- **Mobile Optimized:** Bottom floating nav bar for quick chapter switching

---

## Database Schema

### Tables

```sql
novels          — Core novel entity (title, slug, author, status, views, rating)
genres          — Genre/tag lookup (action, fantasy, romance, etc.)
novel_genres    — Many-to-many junction (novel_id, genre_id)
chapters        — Chapter content (novel_id, chapter_number, title, content, word_count)
bookmarks       — Reading progress per session (session_id, novel_id, scroll_position)
```

### Key Indexes
- `idx_novels_slug` — Fast slug-based lookups (novel detail pages)
- `idx_novels_views DESC` — Popular novels sorting
- `idx_novels_updated DESC` — Recent updates sorting
- `idx_chapters_novel_number` — Composite index for chapter lookup by novel + number
- `idx_bookmarks_session` — Session-based bookmark retrieval

### ID Strategy
All primary keys use **UUID v4** (`uuid_generate_v4()`), not sequential integers. This prevents:
- Enumeration attacks (guessing IDs)
- Merge conflicts in distributed systems
- Information leakage about record counts

---

## Caching Strategy

### Cache Layers

| Data            | Redis TTL  | ISR Revalidation | Rationale                                |
|-----------------|------------|-------------------|------------------------------------------|
| Chapter content | 1 hour     | 1 hour            | Chapters rarely change after publishing  |
| Novel detail    | 30 min     | 5 min             | Metadata updates more frequently         |
| Catalog pages   | 15 min     | 60s               | Catalog needs fresher sort/filter data   |

### Prewarming
On server startup, the 100 most recently updated chapters are loaded into Redis. This ensures the most likely to be read content has zero cold-start latency.

### Invalidation
- `InvalidateNovel(slug)` — Deletes specific novel cache
- `InvalidateCatalog()` — SCAN-based deletion of all `catalog:*` keys

### Cache Key Patterns
```
chapter:{novel_id}:{chapter_number}
novel:{slug}
catalog:{page}:{per_page}:{sort}:{status}:{genre}
```

---

## API Reference

### Endpoints

| Method | Path                                    | Description                 |
|--------|-----------------------------------------|-----------------------------|
| GET    | `/api/health`                           | Health check                |
| GET    | `/api/novels`                           | Paginated novel catalog     |
| GET    | `/api/novels/:slug`                     | Novel detail with chapters  |
| GET    | `/api/novels/:slug/chapters/:number`    | Read a chapter              |
| GET    | `/api/search?q=...`                     | Search novels               |
| GET    | `/api/genres`                           | List all genres             |

### Query Parameters (GET /api/novels)

| Param     | Default   | Options                                      |
|-----------|-----------|----------------------------------------------|
| `page`    | 1         | Any positive integer                         |
| `per_page`| 20        | 1–50                                         |
| `sort`    | updated   | `updated`, `popular`, `rating`, `title`, `newest` |
| `status`  | all       | `all`, `ongoing`, `completed`, `hiatus`      |
| `genre`   | (empty)   | Any genre slug (e.g., `action`, `fantasy`)   |

### Response Shapes

**Paginated Response:**
```json
{
  "data": [...],
  "page": 1,
  "per_page": 20,
  "total": 42,
  "total_pages": 3
}
```

**Chapter Read Response:**
```json
{
  "chapter": { "id": "...", "content": "...", "word_count": 2500 },
  "novel_title": "The Celestial Throne",
  "novel_slug": "the-celestial-throne",
  "prev_chapter": 4,
  "next_chapter": 6,
  "total_chapters": 25
}
```

---

## SEO Strategy

### Server-Side Rendering
All pages are server-rendered by Next.js with proper `<title>`, `<meta>` tags, and Open Graph metadata generated per page.

### JSON-LD Structured Data
- **Novel pages** → `schema.org/Book` (title, author, genre, chapter count)
- **Chapter pages** → `schema.org/Chapter` (position, word count, parent book)

### ISR (Incremental Static Regeneration)
Pages are statically generated on first request, then revalidated at configured intervals. This gives CDN-like speed with dynamic freshness.

### URL Structure
```
/novel/the-celestial-throne              → Novel detail (slug-based, readable)
/novel/the-celestial-throne/1            → Chapter 1 (numeric, sequential)
/browse?genre=fantasy&sort=popular       → Filterable catalog
```

---

## Infrastructure & Deployment

### Docker Compose Services

| Service    | Image              | Port  | Healthcheck              |
|------------|--------------------|-------|--------------------------|
| `postgres` | postgres:16-alpine | 5433  | `pg_isready`             |
| `redis`    | redis:7-alpine     | 6379  | `redis-cli ping`         |
| `backend`  | Multi-stage Go     | 8080  | HTTP `/api/health`       |
| `frontend` | Multi-stage Node   | 3000  | —                        |

### Docker Optimizations
- **Multi-stage builds** — Build dependencies don't ship in production images
- **Alpine base** — Minimal image size (~15MB for Go binary)
- **Binary stripping** — `-ldflags="-s -w"` removes debug symbols
- **Standalone Next.js** — `output: 'standalone'` for minimal Node.js deployment

### Quick Start
```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8080/api/health
```

---

## Security Measures

| Measure                     | Implementation                                        |
|-----------------------------|-------------------------------------------------------|
| SQL Injection Prevention    | Parameterized queries everywhere (including LIMIT)    |
| Rate Limiting               | 100 req/min per IP, sliding window algorithm          |
| CORS                        | Configurable allowed origins                          |
| No Server Header Leak       | Fiber's ServerHeader left empty (default)             |
| Panic Recovery              | Global recover middleware + goroutine defer/recover   |
| Input Validation            | Query param bounds checking (page, per_page)          |
| UUID Primary Keys           | Non-enumerable, non-sequential identifiers            |
| Environment Config          | Secrets loaded from environment variables, not code   |

---

## Project Structure

```
AethaReads/
├── docker-compose.yml
├── .gitignore
├── LICENSE (MIT)
├── README.md
├── SUMMARY.md
│
├── backend/
│   ├── Dockerfile
│   ├── go.mod / go.sum
│   ├── .env.example
│   ├── .dockerignore
│   ├── cmd/server/main.go
│   └── internal/
│       ├── config/config.go
│       ├── database/
│       │   ├── postgres.go
│       │   ├── redis.go
│       │   ├── migrations.go
│       │   └── seed.go
│       ├── models/models.go
│       ├── repository/
│       │   ├── novel_repo.go
│       │   └── chapter_repo.go
│       ├── cache/cache.go
│       ├── handlers/
│       │   ├── novel_handler.go
│       │   └── health.go
│       └── router/router.go
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── .dockerignore
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── not-found.tsx
        │   ├── globals.css
        │   ├── browse/page.tsx
        │   └── novel/[slug]/
        │       ├── page.tsx
        │       └── [number]/page.tsx
        ├── components/
        │   ├── ChapterReader.tsx
        │   ├── Header.tsx
        │   ├── BottomNav.tsx
        │   ├── ThemeProvider.tsx
        │   ├── NovelCard.tsx
        │   ├── SearchModal.tsx
        │   ├── BrowseFilters.tsx
        │   └── Pagination.tsx
        └── lib/
            ├── api.ts
            ├── types.ts
            └── utils.ts
```

---

## What Was Implemented (V1)

### Backend
- [x] RESTful API with 6 endpoints (novels, chapters, search, genres, health)
- [x] PostgreSQL schema with 5 tables and performance indexes
- [x] Redis caching with TTL-based expiration and cache prewarming
- [x] Rate limiting (100 req/min/IP sliding window)
- [x] CORS, compression (Brotli), panic recovery middleware
- [x] Seed data: 6 novels, 12 genres, 30 chapters
- [x] Graceful shutdown with OS signal handling
- [x] Context propagation through all layers

### Frontend
- [x] Home page with popular + recently updated grids
- [x] Browse page with sort, status, and genre filters + pagination
- [x] Novel detail page with chapter list and Start Reading CTA
- [x] Full chapter reader with customizable settings
- [x] Light / Dark / Sepia themes with CSS custom properties
- [x] Debounced search modal (300ms)
- [x] Mobile-first responsive design with bottom navigation
- [x] JSON-LD structured data on novel and chapter pages
- [x] OpenGraph metadata for social sharing
- [x] ISR with tiered revalidation (60s → 5min → 1hr)

### Infrastructure
- [x] Docker Compose for full-stack orchestration
- [x] Multi-stage Dockerfiles for optimized images
- [x] Git-ready with `.gitignore`, `.dockerignore`, MIT License

---

## What to Implement Next (V2 Roadmap)

### High Priority
- [ ] **User Authentication** — OAuth2 (Google/GitHub) + JWT sessions
- [ ] **Bookmarks & Reading Progress** — Track last-read chapter, scroll position per user
- [ ] **Admin Dashboard** — CRUD interface for novels, chapters, genres with rich text editor
- [ ] **Content Sanitization** — Server-side HTML sanitization (e.g., bluemonday for Go) before storing chapter content to prevent XSS via `dangerouslySetInnerHTML`
- [ ] **Full-Text Search** — Replace ILIKE with PostgreSQL `tsvector`/`tsquery` + GIN index for proper search ranking

### Medium Priority
- [ ] **Reading History** — Client-side + server-synced reading history
- [ ] **Favorites / Library** — Save novels to personal library
- [ ] **Comments System** — Chapter-level discussion threads
- [ ] **Novel Ratings** — User ratings with aggregation
- [ ] **Cover Image Upload** — S3/R2 object storage for cover images
- [ ] **Structured Logging** — Replace `log` with `slog` (Go 1.21+ structured logger)
- [ ] **Interface-Based DI** — Define repository interfaces for unit testability
- [ ] **Database Migrations Tool** — Use golang-migrate for versioned schema migrations

### Lower Priority
- [ ] **Reading Lists / Collections** — Curated novel lists
- [ ] **Notification System** — New chapter alerts (WebSocket or SSE)
- [ ] **API Pagination Cursors** — Cursor-based pagination for large datasets
- [ ] **CDN Integration** — CloudFlare/Vercel Edge caching for static assets
- [ ] **Monitoring** — Prometheus metrics + Grafana dashboards
- [ ] **E2E Tests** — Playwright for frontend, Go test suite for backend
- [ ] **CI/CD Pipeline** — GitHub Actions for lint, test, build, deploy

---

## Architecture Decisions & Trade-offs

| Decision                              | Rationale                                                      | Trade-off                                          |
|---------------------------------------|----------------------------------------------------------------|----------------------------------------------------|
| Go + Fiber over Node.js               | 10-50x lower latency for cached reads, tiny memory footprint   | Smaller ecosystem than Node.js                     |
| sqlx over GORM                        | Full SQL control, no ORM magic, better performance             | More boilerplate for complex queries               |
| Redis cache-aside vs. write-through   | Simpler implementation, handles cache misses gracefully        | Brief window of stale data after DB write           |
| ISR over SSG                          | Dynamic catalog doesn't fit full SSG; ISR gives CDN speed     | First request after revalidation is slower          |
| UUID v4 over sequential IDs           | Non-enumerable, distributed-safe                               | Slightly larger storage, worse index locality       |
| Monorepo over separate repos          | Simpler CI/CD, atomic commits across frontend+backend         | Larger clone size, shared git history              |
| `log.Fatalf` for DB connection        | Server can't function without DB; fail-fast is correct here    | Not suitable for optional services                 |
| Inline SQL migrations                 | Simple for V1, no extra tooling needed                         | No rollback capability, harder to track changes    |
| `dangerouslySetInnerHTML` for content  | Chapter content may contain HTML formatting                    | Requires server-side sanitization (V2 item)        |

---

*Last updated: Project V1 complete. Ready for production deployment and V2 feature development.*
