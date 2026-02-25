import type {
  Novel,
  NovelDetailResponse,
  ChapterReadResponse,
  PaginatedResponse,
  SearchResponse,
  Genre,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Client-side fetcher (no caching)
async function clientFetcher<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Novels
  getNovels: (params?: {
    page?: number;
    per_page?: number;
    sort?: string;
    status?: string;
    genre?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.per_page) searchParams.set('per_page', String(params.per_page));
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.genre) searchParams.set('genre', params.genre);
    const qs = searchParams.toString();
    return fetcher<PaginatedResponse<Novel>>(`/api/novels${qs ? `?${qs}` : ''}`);
  },

  getNovelBySlug: (slug: string) =>
    fetcher<NovelDetailResponse>(`/api/novels/${slug}`),

  getChapter: (slug: string, number: number) =>
    fetcher<ChapterReadResponse>(`/api/novels/${slug}/chapters/${number}`),

  // Search (client-side only)
  search: (query: string) =>
    clientFetcher<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`),

  // Genres
  getGenres: () =>
    fetcher<{ data: Genre[] }>('/api/genres'),
};
