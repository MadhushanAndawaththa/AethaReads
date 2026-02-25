# Aetha — Web Novel Reading Platform

A high-performance web novel reading site built with **Go (Fiber)** + **Next.js 15** + **PostgreSQL** + **Redis**.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Next.js 15    │────▶│   Go (Fiber)     │────▶│  PostgreSQL  │
│   App Router    │     │   REST API       │     │  (Primary)   │
│   SSR + ISR     │     │   Port 8080      │     └──────────────┘
│   Port 3000     │     │                  │────▶┌──────────────┐
└─────────────────┘     └──────────────────┘     │    Redis     │
                                                  │  (Cache)     │
                                                  └──────────────┘
```

## Tech Stack

| Layer     | Technology         | Purpose                          |
|-----------|--------------------|----------------------------------|
| Frontend  | Next.js 15         | SSR, ISR, App Router, SEO        |
| Styling   | Tailwind CSS       | Mobile-first responsive UI       |
| Backend   | Go + Fiber         | High-perf REST API               |
| Database  | PostgreSQL 16      | Primary data store               |
| Cache     | Redis 7            | Hot chapter cache (<20ms reads)  |
| DevOps    | Docker Compose     | One-command local dev            |

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone and start everything
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api/health
- PostgreSQL: localhost:5433
- Redis: localhost:6379

### Option 2: Manual Setup

#### Prerequisites
- Go 1.22+
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

#### Backend

```bash
cd backend
cp .env.example .env       # Edit with your DB/Redis credentials
go mod tidy
go run ./cmd/server
```

#### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | `/api/health`                         | Health check             |
| GET    | `/api/novels`                         | Paginated novel catalog  |
| GET    | `/api/novels/:slug`                   | Novel detail + chapters  |
| GET    | `/api/novels/:slug/chapters/:number`  | Read chapter content     |
| GET    | `/api/search?q=...`                   | Search novels            |
| GET    | `/api/genres`                         | List all genres          |

### Query Parameters for `/api/novels`

| Param    | Default  | Options                                     |
|----------|----------|---------------------------------------------|
| page     | 1        | Page number                                 |
| per_page | 20       | Items per page (max 50)                     |
| sort     | updated  | `updated`, `popular`, `rating`, `title`, `newest` |
| status   | all      | `all`, `ongoing`, `completed`               |
| genre    | (empty)  | Genre slug                                  |

## Key Features

### Reading Mode
- Clean, distraction-free chapter reader
- Customizable: font size, line height, font family, max width
- 3 themes: Light, Dark, Sepia
- Auto-hiding controls on scroll
- Keyboard navigation (← → arrow keys)
- Mobile-optimized bottom navigation bar

### Performance
- **Redis caching** serves hot chapters in <20ms
- Cache prewarm on server startup
- Next.js **ISR** for novel landing pages (5 min revalidation)
- Chapter pages revalidated hourly
- Brotli compression on API responses
- Connection pooling (50 max connections)

### SEO
- Server-side rendered metadata (OpenGraph tags)
- JSON-LD structured data (Book + Chapter schemas)
- Dynamic routes: `/novel/[slug]` and `/novel/[slug]/[chapter-number]`
- Semantic HTML throughout

### Mobile-First
- Bottom navigation bar (thumb-friendly)
- 44px minimum touch targets
- Hidden scrollbars on mobile
- Responsive grid (3-col mobile → 6-col desktop)
- Slide-out settings panel

## Project Structure

```
Aetha_mine/
├── backend/
│   ├── cmd/server/main.go          # Entry point
│   ├── internal/
│   │   ├── cache/cache.go          # Redis cache service
│   │   ├── config/config.go        # Env configuration
│   │   ├── database/
│   │   │   ├── postgres.go         # DB connection
│   │   │   ├── redis.go            # Redis connection
│   │   │   ├── migrations.go       # Schema migrations
│   │   │   └── seed.go             # Sample data
│   │   ├── handlers/               # HTTP handlers
│   │   ├── models/models.go        # Data models
│   │   ├── repository/             # Data access layer
│   │   └── router/router.go        # Route definitions
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout
│   │   │   ├── page.tsx            # Home page
│   │   │   ├── browse/page.tsx     # Browse catalog
│   │   │   ├── novel/[slug]/
│   │   │   │   ├── page.tsx        # Novel detail
│   │   │   │   └── [number]/page.tsx  # Chapter reader
│   │   │   └── not-found.tsx
│   │   ├── components/
│   │   │   ├── BottomNav.tsx       # Mobile bottom nav
│   │   │   ├── BrowseFilters.tsx   # Filter controls
│   │   │   ├── ChapterReader.tsx   # Reading UI
│   │   │   ├── Header.tsx          # Top header
│   │   │   ├── NovelCard.tsx       # Novel grid card
│   │   │   ├── Pagination.tsx      # Page navigation
│   │   │   ├── SearchModal.tsx     # Search overlay
│   │   │   └── ThemeProvider.tsx   # Theme context
│   │   └── lib/
│   │       ├── api.ts              # API client
│   │       ├── types.ts            # TypeScript types
│   │       └── utils.ts            # Utilities
│   ├── Dockerfile
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
└── docker-compose.yml
```

## V2 Roadmap

The backend is structured modularly to support future additions:

- [ ] Translation Service module
- [ ] User authentication (JWT)
- [ ] Bookmark sync across devices
- [ ] Reading history
- [ ] Comments & ratings
- [ ] Admin panel for content management
- [ ] Web scraper integration
- [ ] Push notifications for updates

## License

MIT
