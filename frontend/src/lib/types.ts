// API Types matching the Go backend models

export interface Novel {
  id: string;
  title: string;
  slug: string;
  author: string;
  artist: string;
  description: string;
  cover_url: string;
  status: string;
  novel_type: string;
  year: number;
  rating: number;
  views: number;
  chapter_count: number;
  created_at: string;
  updated_at: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface NovelWithGenres extends Novel {
  genres: Genre[];
}

export interface Chapter {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  views: number;
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
  created_at: string;
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
  prev_chapter: number | null;
  next_chapter: number | null;
  total_chapters: number;
}

export interface SearchResponse {
  data: Novel[];
  query: string;
}

export type ReadingTheme = 'light' | 'dark' | 'sepia';

export interface ReadingSettings {
  theme: ReadingTheme;
  fontSize: number;
  lineHeight: number;
  fontFamily: 'sans' | 'serif';
  maxWidth: number;
}
