// API Types matching the Go backend models

export type NovelLanguage = 'en' | 'si' | 'bilingual';

export interface Novel {
  id: string;
  title: string;
  slug: string;
  author: string;
  author_id?: string;
  artist: string;
  description: string;
  cover_url: string;
  status: string;
  language: NovelLanguage;
  novel_type: string;
  year: number;
  rating: number;
  views: number;
  chapter_count: number;
  follower_count: number;
  created_at: string;
  updated_at: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface ContentWarning {
  id: string;
  name: string;
  description: string;
}

export interface NovelWithGenres extends Novel {
  genres: Genre[];
  warnings: ContentWarning[];
}

export interface AuthorProfileSettings {
  user_id: string;
  brand_color: string;
  website_url: string;
  social_links: string;
  total_views: number;
  total_followers: number;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
  content_md?: string;
  word_count: number;
  views: number;
  status: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChapterListItem {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  word_count: number;
  views: number;
  status: string;
  published_at?: string;
  created_at: string;
}

export type ChapterBulkAction = 'publish' | 'draft' | 'delete';

export interface BulkChapterActionResponse {
  message: string;
  count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface NovelDetailResponse {
  novel: NovelWithGenres;
  chapters: ChapterListItem[];
}

export interface ChapterReadResponse {
  chapter: Chapter;
  novel_title: string;
  novel_slug: string;
  novel_language: NovelLanguage;
  prev_chapter: number | null;
  next_chapter: number | null;
  total_chapters: number;
}

export interface SearchResponse {
  data: Novel[];
  query: string;
}

// ===================== Auth & User =====================

export interface User {
  id: string;
  email?: string;
  username: string;
  display_name: string;
  avatar_url: string;
  role: string;
  bio: string;
  email_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token?: string;
  csrf_token?: string;
}

// ===================== Community =====================

export interface Comment {
  id: string;
  chapter_id: string;
  user_id: string;
  parent_id?: string;
  path: string;
  depth: number;
  body: string;
  upvotes: number;
  downvotes: number;
  username: string;
  display_name: string;
  avatar_url: string;
  user_role: string;
  hidden?: boolean;
  hidden_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  novel_id: string;
  user_id: string;
  rating_story: number;
  rating_style: number;
  rating_grammar: number;
  rating_character: number;
  overall_rating: number;
  title: string;
  body: string;
  helpful_count: number;
  username: string;
  display_name: string;
  avatar_url: string;
  hidden?: boolean;
  hidden_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string;
  status: string;
  reviewed_by?: string | null;
  reporter_username?: string;
  reporter_display_name?: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details: string;
  created_at: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  postgres: boolean;
  redis: boolean;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  novel_id: string;
  novel_slug: string;
  novel_title: string;
  chapter_number: number;
  scroll_position: number;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  role: string;
  bio: string;
  created_at: string;
  novel_count?: number;
  follower_count?: number;
  author_profile?: AuthorProfileSettings;
}

export interface CurrentProfileResponse {
  user: User;
  author_profile: AuthorProfileSettings;
}

export type ReadingTheme = 'light' | 'dark' | 'sepia';

export interface ReadingSettings {
  theme: ReadingTheme;
  fontSize: number;
  lineHeight: number;
  fontFamily: 'sans' | 'serif';
  maxWidth: number;
}
