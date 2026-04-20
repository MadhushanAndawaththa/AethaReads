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
