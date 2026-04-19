MASTER PROMPT — AethaReads V2 (RoyalRoad × WTR Hybrid)

I am building AethaReads (Aetha.lk) — a high-performance Sri Lankan web novel platform evolving from a static reader into an author-centric community ecosystem.

The product must combine:

The minimalist, ultra-smooth reading experience of wtr-lab.com

The deep submission + community ecosystem of royalroad.com

Mobile-first UX

Sub-50ms API response targets

Optimized for Sri Lankan ISP latency (Singapore-based edge caching)

🔧 TECH STACK (MANDATORY)

Backend:

Go (Fiber)

PostgreSQL

Redis

JWT (golang-jwt)

Google OAuth2 (Primary Auth Method)

Frontend:

Next.js 15 (App Router)

Server Components + Streaming SSR

View Transitions API

Secure HTTP-only cookie auth

Mobile-first UI

Deployment Context:

Singapore-based infrastructure

Edge caching for public content

Redis for hot queries

🎯 OBJECTIVE

Generate:

Detailed technical architecture

PostgreSQL schema (optimized)

Go (Fiber) handler + repository structure

Next.js App Router implementation patterns

Redis caching strategy

Query optimization strategy

Example production-ready code for critical flows

Performance strategy for sub-50ms responses

🔐 1. Identity & Role Management
Requirements

Hybrid Authentication:

Google OAuth2 (primary)

JWT issued by backend

Secure HTTP-only cookie

User Roles:

READER

AUTHOR

ADMIN

Users table must support:

username (unique)

role

achievements

primary_brand_color (for authors)

soft deletes (deleted_at)

Features

Follow novels

Public profile: /user/[username]

Reading List

Authored Works

Achievements

Role-based route guards

Middleware for protected routes

Deliverables

users table schema

OAuth flow

JWT middleware

Fiber auth handler

Next.js protected layout example

✍️ 2. Author Dashboard (Creator Studio)

Private dashboard for AUTHORS only.

Novel Creation

Multi-step form:

Fields:

Title

Synopsis

Tags (max 5)

Genres

Content Warnings

Status (Ongoing / Completed)

Cover:

Either S3/R2 upload

OR URL

OR default placeholder themes

Chapter Management

Draft / Published toggle

Scheduled publishing (6PM SL Time)

Markdown editor

Slug-based routing

Analytics Dashboard

Show per-novel:

Total views

Followers

Average rating

Revenue-ready structure (future proof)

Must use optimized SQL aggregations.

Deliverables

novels table

chapters table

author_handler.go

scheduling logic

analytics query examples

💬 3. Community & Engagement Layer
Nested Comment System

Requirements:

Recursive comments

Author badge

Soft deletes

Pagination

Must NOT slow chapter loading

Implementation:

Recursive CTE in PostgreSQL

Redis cache Top 10 comments per chapter

Review System

Weighted rating:

Story

Style

Grammar

Character

System must:

Calculate weighted average

Support “Was this helpful?” voting

Prevent spam

Follow & Notifications

Follow novel

On chapter publish:

Add notification row

Push to Activity Feed

Trigger email

Activity Stream

Homepage sidebar:

Recent Reviews

New Authors

Latest Chapters

Cached aggressively in Redis.

Deliverables

comments table

reviews table

follows table

notifications table

Recursive CTE query

Redis caching logic

📖 4. High-Performance Reader (WTR-Lab Feel)
Features

View Transitions API for seamless navigation

Streaming SSR

Infinite Scroll mode (optional toggle)

Reading Progress Sync:

Save current_chapter

Save scroll_position

Throttled every 30 seconds

Stored in PostgreSQL

Constraints

No white flash between chapters

Sub-100ms perceived transitions

Comments load lazily (separate request)

Deliverables

reading_progress table

example View Transition implementation

streaming example in Next.js

throttled progress sync logic

🗄️ 5. Database Architecture & Optimization

Provide complete SQL schema including:

Tables:

users

novels

chapters

comments

reviews

review_votes

follows

notifications

reading_progress

Constraints:

Proper foreign keys

Soft delete support

GIN index for full-text search (Sri Lankan titles)

Composite indexes where needed

Performance:

Trending query optimization

Caching strategy for:

Trending novels

Activity feed

Top comments

⚡ Performance Strategy

Explain:

Redis caching layers

Cache invalidation strategy

N+1 query prevention

Streaming vs blocking queries

Indexing decisions

Query plan examples

Target:

Sub-50ms API responses for hot endpoints

Sub-150ms cold responses

📁 Backend Structure (Required)
internal/
  handlers/
    auth_handler.go
    author_handler.go
    community_handler.go
  repository/
    user_repo.go
    author_repo.go
    community_repo.go
  middleware/
    jwt_middleware.go
📱 UX Constraints

Mobile-first layout

Avoid heavy client JS

SSR-first

Lazy load non-critical components

No blocking on comments

📦 OUTPUT FORMAT REQUIRED

Copilot must respond with:

High-level architecture diagram explanation

Database schema (SQL)

Go backend implementation snippets

Next.js frontend patterns

Redis strategy

Performance reasoning

Deployment notes (Singapore edge optimization)

🚨 Strict Rules

All queries must be production-grade

Avoid ORM abstraction where raw SQL is better

Optimize for Sri Lankan network conditions

Prioritize perceived performance

Think like a scalable startup preparing for 100k MAU