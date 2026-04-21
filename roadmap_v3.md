# AethaReads V3 Roadmap

## V2.5 — Bug Fixes & UX Polish (Current Session)

### Issues Fixed

#### Critical
- **NovelCard overlapping on mobile**: Cards at 3-column grid on small phones caused badge overlap and unreadable text. Changed to 2-col mobile → 3-col sm → progressive breakpoints.
- **SearchModal broken centering**: Conflicting `mx-auto` and `mx-4` meant the modal was never centered. Fixed with `px-4` wrapper.
- **Missing safe-area-bottom**: iPhones with notch/home indicator had content clipped behind the bottom nav. Added proper CSS `env(safe-area-inset-bottom)`.
- **Touch target rule too aggressive**: Every `<a>` and `<button>` on touch devices got 44x44px min size, distorting card layouts, badges, and inline links. Scoped to interactive controls only.

#### High Priority
- **Header dropdown invisible hover**: Menu items had `hover:bg-[var(--bg-secondary)]` matching the dropdown background. Added `--bg-hover` CSS variable for distinct hover state across all themes.
- **Hardcoded `bg-purple-600` avatar**: Replaced with `bg-brand-600` for theme consistency.
- **ChapterReader full page reload on navigation**: Arrow key shortcuts used `window.location.href` causing full reload, losing client state. Switched to `router.push()`.
- **Keyboard shortcuts fire while typing**: ArrowLeft/Right shortcuts fired even in comment textarea. Added input element guard.
- **Division by zero in progress sync**: Short chapters where `scrollHeight == innerHeight` produced `NaN`. Added zero-division guard.
- **ThemeProvider SSR wrapper**: Extra `<div className="dark">` broke flex layout. Replaced with Fragment.

#### Medium Priority
- **BottomNav missing links**: Mobile users only had Home and Browse. Added Library and Dashboard for authenticated users.
- **Dashboard auto-promotes readers**: Visiting `/dashboard` silently changed role to author. Added explicit consent dialog.
- **SearchModal accessibility**: Added `role="dialog"`, `aria-modal="true"`, `aria-label`.
- **NovelCard responsive sizing**: Badges, text, and padding now scale up with `sm:` breakpoints for better readability.
- **Reduced motion support**: Added `prefers-reduced-motion: reduce` media query to disable animations.

### New Features Added
- **Sinhala language support**: Added Noto Sans Sinhala font, `.sinhala-text` CSS class, font-family in Tailwind config.
- **In-reader translation (Sinhala ↔ English)**: TranslateButton component in ChapterReader allows readers to translate content between Sinhala and English. Preserves original content for instant restoration.
- **Homepage messaging**: Updated hero text and metadata to reflect bilingual support.

---

## V3 — Full Feature Roadmap

### Phase 1: Core Platform Improvements

#### 1.1 Content Security
- [ ] **HTML sanitization (DOMPurify)**: Sanitize chapter content client-side with DOMPurify before rendering via `dangerouslySetInnerHTML`. Defense-in-depth against XSS.
- [ ] **Rate limiting**: Add rate limiting on auth, comment, review, and follow endpoints to prevent abuse.
- [ ] **CSRF protection**: Add CSRF tokens for state-changing operations.
- [ ] **Content Security Policy**: Implement CSP headers to prevent script injection.

#### 1.2 Authentication & Session Management
- [ ] **Auto token refresh**: Implement 401 interceptor in `clientFetcher` that automatically calls `api.refresh()` and retries the failed request.
- [ ] **OAuth providers**: Google, Discord, and Facebook login for frictionless onboarding.
- [ ] **Email verification**: Require email verification on registration.
- [ ] **Password reset flow**: Forgot password → email → reset page.
- [ ] **Session management**: Show active sessions, allow revoking from other devices.

#### 1.3 Performance
- [ ] **Next.js Image optimization**: Remove `unoptimized` flag from all `<Image>` components. Configure `remotePatterns` in `next.config.js` for external image hosts.
- [ ] **Lazy load comments/reviews**: Load comment and review sections on-demand (pagination) instead of full fetch.
- [ ] **Service Worker / PWA**: Add manifest.json and service worker for offline reading of cached chapters.
- [ ] **Reduce notification polling**: Move from 60s polling to 5-minute intervals, or implement SSE/WebSocket for real-time.

### Phase 2: Sinhala-First Experience

#### 2.1 Internationalization (i18n)
- [ ] **Full i18n framework**: Integrate `next-intl` or `react-i18next` for complete UI translation (navigation, buttons, labels, error messages).
- [ ] **Sinhala UI locale**: Translate entire UI into Sinhala with locale switcher in Header.
- [ ] **URL-based locale**: `/si/novel/...` and `/en/novel/...` URL structure with proper SEO hreflang tags.
- [ ] **RTL-ready layout**: Ensure layout components handle bidirectional text correctly.

#### 2.2 Translation Engine
- [ ] **Production translation API**: Replace Google Translate free endpoint with official Cloud Translation API (or LibreTranslate self-hosted).
- [ ] **Cached translations**: Store translated chapters in database to avoid re-translating on every read.
- [ ] **Auto-detect language**: Detect chapter language automatically and show appropriate translation options.
- [ ] **Translation quality feedback**: Allow readers to suggest corrections to machine translations.
- [ ] **Paragraph-level translation**: Click on individual paragraphs to translate inline, preserving reading flow.

#### 2.3 Sinhala Content Creation
- [ ] **Sinhala-optimized editor**: Add Sinhala keyboard input support and Unicode text editor for authors writing in Sinhala.
- [ ] **Language metadata on novels**: Add `language` field to novels (en, si, bilingual) for filtering and search.
- [ ] **Bilingual chapter support**: Allow authors to publish chapters in both languages side-by-side.

### Phase 3: Community & Engagement

#### 3.1 Social Features
- [ ] **User-to-user following**: Follow other users/authors for feed updates.
- [ ] **Reading lists**: Create custom public/private reading lists ("Want to Read", "Favorites", etc.).
- [ ] **Activity feed**: Show recent activity from followed users and novels.
- [ ] **Author announcements**: Authors can post updates/announcements on their novels.
- [ ] **Book clubs / Reading groups**: Community-driven discussion groups around novels.

#### 3.2 Gamification & Retention
- [ ] **Reading streaks**: Track daily reading streaks with visual calendar.
- [ ] **Achievement badges**: Unlock badges for milestones (first review, 100 chapters read, etc.).
- [ ] **XP / Reputation system**: Earn points for reviews, comments, reading — unlock profile customization.
- [ ] **Daily recommendations**: Personalized novel recommendations based on reading history and preferences.

#### 3.3 Enhanced Reviews
- [ ] **Review pagination**: Paginate reviews and comments (API already supports `page` param).
- [ ] **Sort/filter reviews**: By date, rating, helpful count.
- [ ] **Spoiler tags**: Allow marking reviews/comments as containing spoilers.
- [ ] **Author responses**: Authors can officially respond to reviews.

### Phase 4: Author Tools

#### 4.1 Writing Experience
- [ ] **Rich text editor**: Replace plain textarea with a rich text editor (TipTap or Slate) supporting formatting, images, and Sinhala input.
- [ ] **Draft autosave**: Auto-save drafts every 30 seconds to prevent data loss.
- [ ] **Chapter scheduling**: Schedule chapters for future publication.
- [ ] **Bulk chapter upload**: Upload multiple chapters at once from file (EPUB, DOCX, TXT).
- [ ] **Version history**: Track chapter revisions with diff view and rollback.

#### 4.2 Analytics
- [ ] **Reader analytics dashboard**: Detailed graphs for views, followers, retention per chapter.
- [ ] **Chapter performance**: Identify drop-off points where readers stop reading.
- [ ] **Demographic insights**: Anonymous reader demographics (language preference, reading time, device).

#### 4.3 Monetization (Future)
- [ ] **Premium chapters**: Allow authors to mark chapters as premium (paywall).
- [ ] **Tip/donation system**: Readers can tip authors for chapters they enjoyed.
- [ ] **Ad-supported free reading**: Optional ad-supported tier for free readers.
- [ ] **Author revenue dashboard**: Track earnings, payouts, and subscriber counts.

### Phase 5: Platform Scalability

#### 5.1 Infrastructure
- [ ] **CDN for images**: Move novel cover images to a CDN (CloudFront, Cloudflare R2).
- [ ] **Full-text search**: Implement Elasticsearch or Meilisearch for advanced novel/chapter search.
- [ ] **Database optimization**: Add read replicas, connection pooling, query optimization for scale.
- [ ] **Caching layer**: Expand Redis caching for popular novels, chapter content, search results.

#### 5.2 Mobile App
- [ ] **React Native app**: Build a native mobile app sharing the same API.
- [ ] **Offline reading**: Download chapters for offline reading with sync.
- [ ] **Push notifications**: Native push notifications for new chapters, replies, follows.

#### 5.3 SEO & Discovery
- [ ] **Server-side rendering for user profiles**: Convert user profile page from client-side to SSR with `generateMetadata`.
- [ ] **Structured data (JSON-LD)**: Add Book/CreativeWork schema for novel pages.
- [ ] **Sitemap generation**: Auto-generate sitemap.xml for all novels and chapters.
- [ ] **Open Graph images**: Dynamic OG images for novel pages with cover art.

---

## Priority Matrix

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| P0 | DOMPurify XSS protection | Critical security | Low |
| P0 | Auto token refresh | Auth reliability | Medium |
| P1 | Full i18n framework | Sinhala market | High |
| P1 | Production translation API | Reader experience | Medium |
| P1 | Rich text editor for authors | Author experience | High |
| P1 | Next.js Image optimization | Performance | Low |
| P2 | PWA / offline reading | Mobile UX | Medium |
| P2 | Reading lists & activity feed | Engagement | High |
| P2 | Author analytics dashboard | Author retention | High |
| P2 | OAuth providers | Onboarding | Medium |
| P3 | Gamification (streaks, badges) | Retention | High |
| P3 | Mobile app (React Native) | Market reach | Very High |
| P3 | Monetization features | Revenue | Very High |
| P3 | Full-text search | Discovery | High |

---

## Technical Debt

- Remove `unoptimized` from all `<Image>` components
- Wrap `loadData` functions in `useCallback` (React strict mode warnings)
- Remove unused `novelSlug` hack in CommentSection
- Add error toast notifications for failed API calls (follow, vote, delete)
- Add Suspense boundaries and skeleton UI for client-fetching pages
- Move from `console.error` to proper error state management
- Add `aria-label` to Pagination nav and `aria-current="page"` to active page
- Add keyboard navigation to NotificationBell and Header dropdowns

---

## V3 Completion Gate

V4 should not be treated as started until every unchecked V3 item above and every item in Technical Debt is either shipped or explicitly descoped. The current codebase already has some partial groundwork, but those items are not complete until they are fully wired end-to-end with UI, backend validation, and tests.

### Already Partially Present But Not Fully Complete

- **Language metadata** exists in the novel model and author create flow, but it still needs stronger filtering, editing UX, validation, and discoverability across browse, search, and author tooling.
- **401 refresh retry** already exists in `clientFetcher`, but the roadmap item is only complete when auth refresh is verified across all protected flows, error states are clean, and expired-session UX is predictable.
- **Reader translation** is working as a UX feature, but production translation, caching, and language detection remain separate roadmap items.

### Required Finish Order

1. **Security and auth hardening**: DOMPurify, rate limiting, CSRF, stable refresh behavior, and proper error-state handling.
2. **Platform quality**: Image optimization, skeletons/Suspense, accessibility fixes, keyboard navigation, and removal of temporary hacks.
3. **Content model completion**: Language metadata, production-grade translation flow, and a clean genre/tag taxonomy.
4. **Author reliability**: Autosave, better draft handling, safer chapter publishing, and dashboard usability fixes.

---

## V4 — Creator Studio, Discovery, and Growth

### Product Goal

Make AethaReads feel like a focused, bilingual web novel platform with a professional author workspace, a cleaner reader experience, and stronger discovery loops. Borrow the best proven ideas from successful fiction platforms such as Royal Road and modern reader tools such as WTR-Lab, but keep the implementation lean: fewer moving parts, better defaults, clearer workflows.

### Core Product Principles

- **Simple, powerful defaults**: Advanced when needed, not crowded by default.
- **Creator-first workflow**: Publishing, scheduling, tagging, editing, and analytics should feel like a workspace, not a list of forms.
- **Reader retention before gimmicks**: Continue reading, release notifications, shelves, reviews, and discovery matter more than flashy social features.
- **Sinhala-first differentiation**: Bilingual tools, Sinhala UX polish, and localized discovery should be a product advantage.
- **Ship complete loops**: Every feature should connect to acquisition, retention, or creator success.

### Current Gaps Observed In The App

- **Dashboard** is still a flat page with top stats and a basic novel list, not a real author workspace.
- **Chapter management** supports create/edit/delete, but lacks bulk actions, scheduling, ordering tools, and editorial visibility.
- **Genres** exist, but there is no separate lightweight tag system for tropes, themes, warnings, or discoverability.
- **Profiles** are minimal and do not yet showcase author credibility, release cadence, featured works, or reader identity.
- **Navigation** inside author tools is page-to-page rather than a cohesive side-nav dashboard.

### Phase 0: Finish V3 Properly

- [ ] Close every unchecked V3 roadmap item before declaring V4 in progress.
- [ ] Close every Technical Debt item listed above.
- [ ] Add a small release checklist for security, performance, accessibility, and author workflows.
- [ ] Add regression coverage for auth, reader translation, author CRUD, and profile pages.

### Phase 1: Professional Author Dashboard

#### 1.1 Dashboard Shell And Navigation
- [ ] Add a **persistent dashboard shell** with desktop side nav and mobile drawer.
- [ ] Side nav sections: **Overview**, **Novels**, **Chapters**, **Drafts**, **Schedule**, **Tags & Genres**, **Analytics**, **Readers**, **Profile**, **Settings**.
- [ ] Add a dashboard top bar with quick actions, breadcrumbs, notifications, and a global search command.
- [ ] Use a professional layout with consistent panels, empty states, filters, and bulk-action bars.

#### 1.2 Overview Workspace
- [ ] Add a creator home showing total novels, draft chapters, scheduled releases, unread notifications, and growth trends.
- [ ] Add a **recent activity feed** for new followers, new reviews, new comments, and recently published chapters.
- [ ] Add a **health checklist** for each novel: missing cover, weak synopsis, missing tags, missing language, no recent updates, no chapters published.
- [ ] Add quick actions: **New Novel**, **New Chapter**, **Schedule Release**, **Edit Profile**, **Review Comments**.

#### 1.3 Professional UX Standards
- [ ] Replace browser alerts/confirms with in-app dialogs, toasts, and inline error states.
- [ ] Add loading skeletons and optimistic UI for safe actions.
- [ ] Add keyboard shortcuts for author workflows: new chapter, save draft, search, preview, publish.

### Phase 2: Novel Operations And Metadata Management

#### 2.1 Full Novel Management
- [ ] Build a proper **Manage Novel** page with tabs: **Overview**, **Metadata**, **Chapters**, **Analytics**, **Readers**, **Settings**.
- [ ] Support editing title, slug, synopsis, cover, status, language, novel type, release cadence, and visibility.
- [ ] Add novel statuses beyond basic publish state: **draft**, **ongoing**, **completed**, **hiatus**, **stub**, **dropped**.
- [ ] Add a **preview card** that shows how the novel will appear in browse, search, and profile contexts.

#### 2.2 Genre And Tag System
- [ ] Keep **genres** as the primary classification system.
- [ ] Add a separate **tag** system for tropes and discovery: example categories include **isekai**, **academy**, **slow burn**, **time travel**, **OP protagonist**, **found family**.
- [ ] Add **content warning tags** and **maturity labels** with clear reader-facing badges.
- [ ] Add tag rules: max count, canonical slugs, synonym mapping, author suggestions, and moderation/admin review later.
- [ ] Add dashboard tools to manage genre/tag combinations and highlight missing or overused metadata.

#### 2.3 Novel Growth Tools
- [ ] Add custom **author note / elevator pitch** blocks for novel pages.
- [ ] Add **featured quote** or **hook line** for better conversion from browse to detail page.
- [ ] Add **SEO fields**: meta title override, meta description, Open Graph fallback copy.
- [ ] Add release cadence badges such as **Daily**, **Weekly**, **Irregular**, with optional next-release date.

### Phase 3: Chapter Studio And Editorial Workflow

#### 3.1 Chapter Command Center
- [ ] Replace the basic chapter list with a sortable table including chapter number, title, status, publish date, views, comments, and word count.
- [ ] Add filters for **draft**, **scheduled**, **published**, **needs review**, and **low-performing** chapters.
- [ ] Add bulk actions: publish, unpublish, delete, duplicate, move, renumber, export.
- [ ] Support drag-and-drop chapter ordering with safe renumbering.

#### 3.2 Better Writing Workflow
- [ ] Upgrade the editor to a richer Markdown-first workflow with toolbar, preview, autosave, and draft recovery.
- [ ] Add **pre-publication checks**: empty sections, missing title, suspicious formatting, unclosed markdown blocks.
- [ ] Add **chapter notes** before and after the chapter.
- [ ] Add scheduled publishing and timezone-aware release settings.
- [ ] Add duplicate chapter and split/merge helpers for long-form editing.

#### 3.3 Bilingual Authoring
- [ ] Add support for marking a chapter as **original language**, **translated**, or **bilingual pair**.
- [ ] Allow authors to connect paired Sinhala/English chapters.
- [ ] Add side-by-side metadata for translation source, translation quality, and editor notes.

### Phase 4: Advanced Profile And Reputation System

#### 4.1 Public Author Profiles
- [ ] Redesign the author profile into a richer public page with hero area, avatar, bio, socials, featured novels, stats, and pinned works.
- [ ] Add author trust signals: total reads, followers, total published chapters, completion rate, joined date, last update cadence.
- [ ] Add author sections: **About**, **Works**, **Announcements**, **Reading Lists**, **Reviews**, **Achievements**.
- [ ] Add optional links for Discord, Facebook, Patreon/Ko-fi, website, and contact preferences.

#### 4.2 Reader Profiles
- [ ] Expand reader profiles with favorite genres, shelves, recent reviews, reading streak, and followed authors.
- [ ] Add privacy controls so users can choose what is public.
- [ ] Add lightweight achievements and badges tied to real activity, not noisy gamification.

#### 4.3 Dashboard Profile Management
- [ ] Add a dedicated **Profile** section inside the dashboard to edit bio, avatar, banner, links, author tagline, and public preferences.
- [ ] Add profile preview modes for desktop and mobile.
- [ ] Add completion prompts so authors know what to fill in next.

### Phase 5: Reader Discovery And Retention

#### 5.1 Discovery Inspired By Successful Fiction Platforms
- [ ] Add discovery rails for **Trending**, **Best Rated**, **Rising Stars**, **Recently Updated**, **Completed Gems**, and **Sinhala Picks**.
- [ ] Add a stronger browse filter model: genre, tags, language, completion status, rating floor, update frequency, word count range.
- [ ] Add ranking pages that explain why a novel is ranking there: views, follows, rating velocity, recent update activity.
- [ ] Add richer review surfaces with rating breakdowns, spoiler tags, and verified-reader context.

#### 5.2 Retention Features Inspired By Modern Reader Tools
- [ ] Improve continue-reading with **next unread chapter**, **resume position**, and **series progress overview**.
- [ ] Add bookmarks per chapter and a lightweight notes/highlights system only if the base reader flow stays fast.
- [ ] Add reader release notifications by novel and optional email digest.
- [ ] Add shelf/list management: **Following**, **Plan to Read**, **Reading**, **Finished**, **Dropped**, plus custom lists later.

#### 5.3 Community Without Overcomplication
- [ ] Add author announcements tied to a novel.
- [ ] Add comment moderation tools for authors.
- [ ] Add lightweight reading groups only after shelves, notifications, and better reviews are stable.

### Phase 6: Growth Engine And Platform Success Levers

#### 6.1 Acquisition
- [ ] Build landing pages for Sinhala originals, translated novels, completed series, and top-rated newcomers.
- [ ] Add creator onboarding with sample novel setup, cover guidance, and metadata checklist.
- [ ] Add import helpers for authors migrating from Wattpad/Google Docs/manual markdown.

#### 6.2 Retention And Conversion
- [ ] Add weekly digest emails for followed novels and unread updates.
- [ ] Add release reminder nudges for authors who miss their cadence.
- [ ] Add onboarding quests for new readers and new authors, but keep them short and optional.
- [ ] Add novel-page conversion improvements: better hooks, better metadata, better first-chapter CTA.

#### 6.3 Platform Trust And Quality
- [ ] Add moderation workflows for tags, warnings, covers, and abusive behavior.
- [ ] Add author quality signals such as completion badge, consistent updater badge, and translated/original indicators.
- [ ] Add platform-level editorial collections for featured works and seasonal picks.

---

## Recommended V4 Build Order

1. Finish all V3 and Technical Debt items.
2. Ship the dashboard shell with side nav and a real Overview page.
3. Ship improved novel management with proper metadata, genre, and tag handling.
4. Ship the chapter command center with autosave, scheduling, preview, and bulk actions.
5. Ship advanced public profiles and dashboard profile editing.
6. Ship discovery rails, shelves, and release notifications.
7. Add deeper analytics, growth loops, and admin/moderation tools.

## Features To Avoid Overbuilding Early

- Do not build a heavy social network before discovery, library, and release notifications are excellent.
- Do not create multiple overlapping metadata systems; keep **genres** primary and **tags** secondary.
- Do not build complex gamification until reviews, follows, shelves, and profile identity are stable.
- Do not add mobile app scope before the web reader, dashboard, and SEO loops are strong.

## Success Metrics For This Roadmap

- **Reader retention**: More return sessions, more chapters per reader, better next-day/next-week retention.
- **Creator retention**: More active authors, more chapters published per month, fewer abandoned drafts.
- **Discovery quality**: Higher browse-to-read conversion and better first-chapter completion.
- **Profile trust**: More completed author profiles, more follows from profile pages, better credibility for new authors.
- **Operational quality**: Fewer broken states, fewer alert/confirm flows, fewer auth/session failures.
