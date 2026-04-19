import type {
  Novel,
  NovelDetailResponse,
  ChapterReadResponse,
  PaginatedResponse,
  SearchResponse,
  Genre,
  AuthResponse,
  User,
  Comment,
  Review,
  Notification,
  ReadingProgress,
  Chapter,
  ChapterListItem,
} from './types';

// Server-side fetcher: full URL so Next.js server (inside Docker) can reach the backend directly.
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

// Client-side fetcher: relative path so the browser sends the request to the
// Next.js server, which rewrites /api/* → backend via the proxy rule in
// next.config.js. This avoids both CORS issues and Docker hostname resolution.
async function clientFetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API Error: ${res.status}`);
  }
  return res.json();
}

async function authFetcher<T>(url: string, options?: RequestInit): Promise<T> {
  return clientFetcher<T>(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
}

export const api = {
  // ── Public Novels ────────────────
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

  search: (query: string) =>
    clientFetcher<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`),

  getGenres: () =>
    fetcher<{ data: Genre[] }>('/api/genres'),

  // ── Auth ────────────────
  register: (email: string, username: string, password: string) =>
    authFetcher<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),

  login: (email: string, password: string) =>
    authFetcher<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  refresh: () =>
    authFetcher<AuthResponse>('/api/auth/refresh', { method: 'POST' }),

  logout: () =>
    authFetcher<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  getMe: () =>
    authFetcher<{ user: User }>('/api/auth/me'),

  // ── Author ────────────────
  getMyNovels: () =>
    authFetcher<{ data: Novel[] }>('/api/author/novels'),

  createNovel: (data: {
    title: string; description: string; cover_url: string;
    status: string; novel_type: string; genre_ids: string[];
  }) =>
    authFetcher<Novel>('/api/author/novels', {
      method: 'POST', body: JSON.stringify(data),
    }),

  updateNovel: (id: string, data: Record<string, unknown>) =>
    authFetcher<Novel>(`/api/author/novels/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  deleteNovel: (id: string) =>
    authFetcher<{ message: string }>(`/api/author/novels/${id}`, { method: 'DELETE' }),

  getMyChapters: (novelId: string) =>
    authFetcher<{ data: ChapterListItem[] }>(`/api/author/novels/${novelId}/chapters`),

  createChapter: (novelId: string, data: {
    title: string; content_md: string; status: string;
  }) =>
    authFetcher<Chapter>(`/api/author/novels/${novelId}/chapters`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  updateChapter: (chapterId: string, data: Record<string, unknown>) =>
    authFetcher<Chapter>(`/api/author/chapters/${chapterId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  deleteChapter: (chapterId: string) =>
    authFetcher<{ message: string }>(`/api/author/chapters/${chapterId}`, { method: 'DELETE' }),

  getAuthorStats: () =>
    authFetcher<{ total_novels: number; total_chapters: number; total_views: number; total_follows: number }>('/api/author/stats'),

  becomeAuthor: () =>
    authFetcher<{ message: string; role: string }>('/api/author/become', { method: 'POST' }),

  // ── Comments ────────────────
  getComments: (chapterId: string, page = 1) =>
    clientFetcher<PaginatedResponse<Comment>>(`/api/chapters/${chapterId}/comments?page=${page}`),

  createComment: (chapterId: string, body: string, parentId?: string) =>
    authFetcher<Comment>(`/api/chapters/${chapterId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, parent_id: parentId }),
    }),

  deleteComment: (commentId: string) =>
    authFetcher<{ message: string }>(`/api/comments/${commentId}`, { method: 'DELETE' }),

  // ── Reviews ────────────────
  getReviews: (slug: string, page = 1) =>
    clientFetcher<PaginatedResponse<Review>>(`/api/novels/${slug}/reviews?page=${page}`),

  createReview: (slug: string, data: {
    rating_story: number; rating_style: number;
    rating_grammar: number; rating_character: number;
    title: string; body: string;
  }) =>
    authFetcher<Review>(`/api/novels/${slug}/reviews`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  voteReview: (reviewId: string, helpful: boolean) =>
    authFetcher<{ message: string }>(`/api/reviews/${reviewId}/vote`, {
      method: 'POST', body: JSON.stringify({ helpful }),
    }),

  // ── Follows ────────────────
  followNovel: (slug: string) =>
    authFetcher<{ message: string; following: boolean }>(`/api/novels/${slug}/follow`, { method: 'POST' }),

  unfollowNovel: (slug: string) =>
    authFetcher<{ message: string; following: boolean }>(`/api/novels/${slug}/follow`, { method: 'DELETE' }),

  checkFollowing: (slug: string) =>
    authFetcher<{ following: boolean }>(`/api/novels/${slug}/following`),

  getFollowedNovels: () =>
    authFetcher<{ data: Novel[] }>('/api/user/follows'),

  // ── Notifications ────────────────
  getNotifications: (limit = 50) =>
    authFetcher<{ data: Notification[]; unread_count: number }>(`/api/user/notifications?limit=${limit}`),

  markNotificationsRead: () =>
    authFetcher<{ message: string }>('/api/user/notifications/read', { method: 'POST' }),

  // ── Reading Progress ────────────────
  updateProgress: (slug: string, chapterNumber: number, scrollPosition: number) =>
    authFetcher<{ message: string }>(`/api/novels/${slug}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ chapter_number: chapterNumber, scroll_position: scrollPosition }),
    }),

  getProgress: (slug: string) =>
    authFetcher<{ progress: ReadingProgress | null }>(`/api/novels/${slug}/progress`),

  getAllProgress: () =>
    authFetcher<{ data: ReadingProgress[] }>('/api/user/progress'),
};
