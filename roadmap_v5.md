# AethaReads V5 Roadmap

## Production Launch, Community, and Operations

This roadmap starts from the current shipped state, not from the older V3/V4 assumptions. The goal is to turn AethaReads into a launch-ready reading and writing platform with strong operational safety, stronger creator workflows, and community features that improve retention without overcomplicating the product.

---

## Product Goal

Launch AethaReads as a reliable bilingual web platform where:

- readers can discover, follow, read, review, and discuss novels without friction,
- authors can publish and manage novels with confidence,
- the platform can survive real traffic, abuse, mistakes, and content moderation load,
- the first public release builds the foundations for a real long-term community.

---

## Launch Principles

- Ship complete loops, not isolated features.
- Prioritize trust, reliability, and retention over novelty.
- Keep the reader experience fast even as community features grow.
- Keep creator workflows simple enough for solo authors and small teams.
- Treat moderation, observability, and recovery as product requirements, not admin afterthoughts.

---

## Phase 0 - Launch Gate Definition

Before adding more surface area, define what "launch-ready" means.

- [ ] Freeze a clear launch scope for reader, author, and admin experiences.
- [ ] Split all remaining work into `must launch`, `can launch`, and `post-launch`.
- [ ] Add a release checklist covering security, backups, performance, moderation, legal pages, and support workflows.
- [ ] Add owner, priority, and completion criteria to every launch-blocking item.
- [ ] Define rollback rules for bad deploys, bad migrations, and broken auth flows.

### Launch Exit Criteria

- No unresolved P0 security or data-loss risks.
- New reader and author can complete their primary flow without manual intervention.
- Production deploy, rollback, and restore steps are documented and tested.

---

## Phase 1 - Security, Trust, and Abuse Resistance

These are hard launch blockers.

- [ ] Add CSRF protection for all state-changing cookie-authenticated requests.
- [ ] Add Content Security Policy headers and tighten allowed asset/script origins.
- [ ] Replace the current broad rate limiter with route-aware policies for auth, comments, reviews, follows, and profile updates.
- [ ] Add brute-force protection and lockout/backoff rules for login and registration.
- [ ] Add email verification for password-based registration before community actions become fully available.
- [ ] Add password reset and account recovery flows.
- [ ] Add audit logs for sensitive account actions: login, password reset, role change, profile update, and publish/delete actions.
- [ ] Add author/community moderation tools: delete, hide, suspend, and review flagged content.
- [ ] Add report flows for comments, reviews, profiles, and novels.

### Security Exit Criteria

- Critical auth and community endpoints are protected by CSRF and tuned rate limits.
- Moderators can respond to abusive content without database intervention.
- Incident investigation has enough logs to explain who changed what and when.

---

## Phase 2 - Production Operations and Reliability

This phase makes the system survivable in production.

- [ ] Add environment-specific production config with secure defaults.
- [ ] Add structured application logging for frontend and backend.
- [ ] Add uptime checks, error alerting, and performance dashboards.
- [ ] Add database backup automation and restore drills.
- [ ] Add Redis failure strategy and graceful degradation rules.
- [ ] Add migration runbooks and recovery steps for partial failures.
- [ ] Add health endpoints that verify downstream dependencies, not just process uptime.
- [ ] Add request tracing or correlation IDs across frontend, backend, and database logs.
- [ ] Add staging environment parity for release testing.
- [ ] Add deploy pipeline checks: tests, build, migrations, smoke tests, rollback hooks.

### Operations Exit Criteria

- A deploy can be observed, verified, and rolled back safely.
- A backup restore has been tested successfully.
- Operators can distinguish app bugs, infra failures, and abuse spikes quickly.

---

## Phase 3 - Author Workflow Completion

The platform cannot launch seriously for writers until the publishing loop is dependable.

- [ ] Add chapter autosave and draft recovery.
- [ ] Add scheduled publishing with timezone-aware author controls.
- [ ] Add a chapter command center with filters, bulk actions, and safer delete/publish flows.
- [ ] Add editorial validation before publish: missing title, empty content, malformed markdown, suspicious pasted HTML.
- [ ] Add richer metadata controls: tags, warnings, maturity labels, cadence, visibility.
- [ ] Add cover upload/storage flow instead of URL-only dependency.
- [ ] Add version history for chapters and critical novel metadata.
- [ ] Add author notifications for review/comment activity and scheduled release issues.
- [ ] Replace browser `alert` and `confirm` flows with in-app dialogs and toast feedback.

### Author Exit Criteria

- An author can create a novel, draft chapters, schedule release, edit profile, and recover from mistakes.
- Publishing mistakes do not force database fixes or manual developer support.

---

## Phase 4 - Reader Retention and Community Loops

This phase turns the product from a reader app into a community platform.

- [ ] Finish shelves and reading states: Following, Reading, Finished, Dropped, Plan to Read.
- [ ] Improve continue-reading with next unread chapter and series progress.
- [ ] Add release notifications in-app first, email digest second.
- [ ] Add spoiler-aware reviews and comments.
- [ ] Add author responses to reviews.
- [ ] Add author announcements tied to each novel.
- [ ] Add comment moderation tools for authors.
- [ ] Add activity feed blocks that are useful and compact: new chapter, review, follow, announcement.
- [ ] Add richer public profiles for authors and readers with trust signals and selected public activity.
- [ ] Add community guidelines, moderation policy, and visible enforcement states.

### Community Exit Criteria

- Readers have a reason to return besides manual bookmarking.
- Authors can talk to readers without needing external platforms only.
- Community features increase retention without slowing core reading flows.

---

## Phase 5 - Discovery, SEO, and Acquisition

Launch needs acquisition loops, not just a catalog page.

- [ ] Add sitemap generation for novels, chapters, and author pages.
- [ ] Convert public author profiles to SSR with metadata.
- [ ] Remove unnecessary `unoptimized` image usage and configure allowed remote hosts.
- [ ] Add discovery rails: trending, rising, recently updated, completed, Sinhala picks.
- [ ] Add stronger browse filters: language, genre, tags, completion state, rating band, word count, update cadence.
- [ ] Add ranking logic that balances freshness, follows, ratings, and recent reading velocity.
- [ ] Add landing pages for Sinhala originals, bilingual works, and finished series.
- [ ] Add Open Graph image generation for novel and author pages.
- [ ] Add search improvements: typo tolerance, tag-aware queries, author search, language-aware ranking.

### Discovery Exit Criteria

- Search and browse can surface the right work for both new and returning readers.
- Public pages are indexable, shareable, and visually credible.

---

## Phase 6 - Launch Quality and Growth Readiness

This is the final polish before public launch.

- [ ] Add end-to-end coverage for auth, publishing, profile editing, follows, comments, reviews, and library flows.
- [ ] Add smoke tests for production build, migrations, and health checks.
- [ ] Add accessibility pass for navigation, forms, dialogs, keyboard flows, and screen-reader labels.
- [ ] Add performance budgets for chapter pages, browse, and dashboard routes.
- [ ] Add legal and support surfaces: Terms, Privacy, Contact, DMCA/content policy, moderation appeals.
- [ ] Add analytics for acquisition, retention, and creator success metrics.
- [ ] Add admin dashboard basics: flagged content queue, user lookup, novel lookup, moderation actions, platform health snapshot.
- [ ] Prepare a soft-launch plan: invite-only authors, limited beta readers, feedback intake, rollback window.

### Launch Exit Criteria

- Beta users can use the platform without developer supervision.
- The team can see failures, respond to abuse, and recover from incidents.
- The core loops are stable: discover -> read -> follow/review -> return, and create -> publish -> engage -> iterate.

---

## Recommended Build Order

1. Security and recovery fundamentals.
2. Production operations and release safety.
3. Author workflow completion.
4. Reader retention and community loops.
5. Discovery and SEO.
6. Admin/moderation polish and soft-launch preparation.

---

## Features To Delay Until After Launch

- Native mobile app.
- Premium monetization and payouts.
- Heavy gamification.
- Real-time chat or book clubs.
- Complex recommendation engines beyond practical heuristics.

These are useful later, but they are not required to launch a trustworthy reading and writing platform.

---

## Success Metrics

- **Reader retention**: returning readers, chapters per session, follow-to-return rate.
- **Author success**: active authors, chapters published per week, draft-to-publish conversion.
- **Community health**: comment/review participation, report resolution time, moderation load.
- **Operational quality**: deploy success rate, restore confidence, alert response time, auth failure rate.
- **Discovery quality**: browse-to-read conversion, search success, first-chapter completion.