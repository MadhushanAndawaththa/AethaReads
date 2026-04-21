# AethaReads

A full-stack web novel reading platform supporting multilingual content, a creator studio for authors, and community engagement features. Built for performance with server-side rendering, Redis caching, and a clean reading experience across devices.

---

## Stack

| Layer       | Technology         | Role                                     |
|-------------|--------------------|------------------------------------------|
| Frontend    | Next.js 15 (App Router) | SSR, ISR, SEO, TypeScript           |
| Styling     | Tailwind CSS       | Mobile-first responsive UI               |
| Backend     | Go + Fiber         | High-performance REST API                |
| Database    | PostgreSQL 16      | Primary relational store                 |
| Cache       | Redis 7            | Hot-path caching, session support        |
| Auth        | JWT + Cookie       | Secure HttpOnly cookies, token refresh   |
| Containers  | Docker Compose     | Single-command local setup               |

---

## Architecture

```
┌─────────────────────┐       ┌────────────────────┐       ┌───────────────┐
│    Next.js 15       │──────▶│    Go (Fiber)      │──────▶│  PostgreSQL   │
│  App Router / SSR   │       │    REST API        │       │  Port 5432    │
│  Port 3001          │       │    Port 8080       │──────▶┌───────────────┐
└─────────────────────┘       └────────────────────┘       │     Redis     │
                                                            │  Port 6379   │
                                                            └───────────────┘
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Or: Go 1.22+, Node.js 20+, PostgreSQL 16+, Redis 7+

### Docker Compose (Recommended)

```bash
git clone https://github.com/MadhushanAndawaththa/AethaReads.git
cd AethaReads
docker compose up --build
```

| Service      | URL                              |
|--------------|----------------------------------|
| Frontend     | http://localhost:3001            |
| Backend API  | http://localhost:8080/api/health |
| PostgreSQL   | localhost:5433                   |
| Redis        | localhost:6379                   |

### Manual Setup

#### Backend

```bash
cd backend
cp .env.example .env       # configure DATABASE_URL, REDIS_URL, JWT_SECRET
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

---

## Features

### For Readers
- **Immersive chapter reader** — adjustable font size, line height, width, and three themes (Light / Dark / Sepia)
- **In-chapter translation** — translate any chapter to Sinhala or English; preference persists per novel
- **Language-aware browse** — filter novels by original language (English, Sinhala, Bilingual)
- **Personal library** — follow novels, track reading progress, resume where you left off
- **Community** — post reviews with star ratings and chapter-level comments
- **Search** — live search modal with keyboard navigation

### For Authors
- **Creator studio dashboard** — manage novels, chapters, and metadata from a dedicated side-nav workspace
- **Novel metadata editor** — edit title, description, cover, status, language, and genres
- **Chapter management** — publish, draft, and delete chapters; markdown content entry
- **Author profile** — set display name, bio, avatar, brand colour, website, and social links
- **Profile completion indicator** — visibility score to guide profile quality

### Platform
- **Secure authentication** — JWT in HttpOnly cookies, automatic silent refresh, Google OAuth
- **Content safety** — DOMPurify sanitization on all rendered chapter and translated HTML
- **Redis caching** — catalog and chapter responses served in under 20 ms on cache hits
- **Public author profiles** — brand-coloured hero, social links, and novel showcase
- **Mobile-first** — bottom navigation, 44 px touch targets, responsive card grids

---

## API Reference

### Public

| Method | Endpoint                                 | Description                    |
|--------|------------------------------------------|--------------------------------|
| GET    | `/api/health`                            | Health check                   |
| GET    | `/api/novels`                            | Paginated novel catalog        |
| GET    | `/api/novels/:slug`                      | Novel detail with chapter list |
| GET    | `/api/novels/:slug/chapters/:number`     | Chapter content                |
| GET    | `/api/search?q=`                         | Novel search                   |
| GET    | `/api/genres`                            | All genres                     |
| GET    | `/api/users/:username`                   | Public author profile          |

### Query Parameters — `GET /api/novels`

| Param      | Default   | Options                                          |
|------------|-----------|--------------------------------------------------|
| `page`     | `1`       | Any positive integer                             |
| `per_page` | `20`      | 1–50                                             |
| `sort`     | `updated` | `updated`, `popular`, `rating`, `title`, `newest` |
| `status`   | `all`     | `all`, `ongoing`, `completed`                    |
| `genre`    | —         | Genre slug                                       |
| `language` | —         | `en`, `si`, `bilingual`                          |

### Authenticated

| Method | Endpoint                        | Description                        |
|--------|---------------------------------|------------------------------------|
| POST   | `/api/auth/register`            | Create account                     |
| POST   | `/api/auth/login`               | Login, receive cookie tokens       |
| POST   | `/api/auth/refresh`             | Silently refresh access token      |
| POST   | `/api/auth/logout`              | Invalidate session                 |
| GET    | `/api/auth/me`                  | Current user info                  |
| GET    | `/api/user/profile`             | Current user + author settings     |
| PUT    | `/api/user/profile`             | Update profile and author settings |
| POST   | `/api/author/become`            | Upgrade account to author role     |
| GET    | `/api/author/novels`            | List author's own novels           |
| GET    | `/api/author/novels/:id`        | Single author-owned novel detail   |
| POST   | `/api/author/novels`            | Create novel                       |
| PUT    | `/api/author/novels/:id`        | Update novel metadata              |
| DELETE | `/api/author/novels/:id`        | Delete novel                       |
| POST   | `/api/author/novels/:id/chapters` | Create chapter                   |
| PUT    | `/api/author/chapters/:id`      | Update chapter                     |
| DELETE | `/api/author/chapters/:id`      | Delete chapter                     |

---

## Project Structure

```
AethaReads/
├── backend/
│   ├── cmd/server/main.go              # Entry point
│   ├── internal/
│   │   ├── cache/cache.go              # Redis caching layer
│   │   ├── config/config.go            # Environment configuration
│   │   ├── database/
│   │   │   ├── postgres.go             # Connection + pool setup
│   │   │   ├── redis.go                # Redis connection
│   │   │   ├── migrations.go           # Schema migration runner
│   │   │   └── seed.go                 # Development seed data
│   │   ├── handlers/                   # HTTP request handlers
│   │   ├── middleware/                 # JWT auth, role guards
│   │   ├── models/models.go            # Domain models and request types
│   │   ├── repository/                 # Data access layer
│   │   └── router/router.go            # Route registration
│   ├── migrations/                     # SQL migration files (up/down)
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root layout + providers
│   │   │   ├── page.tsx                # Landing page
│   │   │   ├── browse/page.tsx         # Novel catalog + filters
│   │   │   ├── novel/[slug]/           # Novel detail page
│   │   │   │   └── [number]/page.tsx   # Chapter reader
│   │   │   ├── dashboard/              # Author creator studio
│   │   │   │   ├── layout.tsx          # Dashboard shell wrapper
│   │   │   │   ├── page.tsx            # Overview workspace
│   │   │   │   ├── profile/page.tsx    # Author profile settings
│   │   │   │   └── novel/[id]/         # Novel studio + chapter list
│   │   │   ├── user/[username]/        # Public author profile
│   │   │   ├── library/page.tsx        # Reader library
│   │   │   └── auth/                   # Login / register / callback
│   │   ├── components/
│   │   │   ├── AuthProvider.tsx        # Auth context + token refresh
│   │   │   ├── ChapterReader.tsx       # Full reading UI with translation
│   │   │   ├── DashboardShell.tsx      # Creator studio side nav
│   │   │   ├── Header.tsx              # Top navigation
│   │   │   ├── NovelCard.tsx           # Browse grid card
│   │   │   ├── CommentSection.tsx      # Chapter comments
│   │   │   ├── ReviewSection.tsx       # Novel reviews
│   │   │   ├── SearchModal.tsx         # Live search overlay
│   │   │   └── TranslateButton.tsx     # In-chapter translation control
│   │   └── lib/
│   │       ├── api.ts                  # Typed API client with auth retry
│   │       ├── security.ts             # DOMPurify sanitization helpers
│   │       ├── types.ts                # TypeScript domain types
│   │       └── utils.ts                # Shared utilities
│   ├── tests/e2e/                      # Playwright end-to-end specs
│   ├── Dockerfile
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── vitest.config.ts
│   └── package.json
└── docker-compose.yml
```

---

## Testing

```bash
# Unit tests (Vitest)
cd frontend
npm run test:unit

# End-to-end tests (Playwright) — requires running stack
npx playwright test
```

End-to-end coverage includes the author creation flow, Sinhala novel publishing, multilingual browse, translation rendering safety, and community library interactions.

---

## License

MIT
