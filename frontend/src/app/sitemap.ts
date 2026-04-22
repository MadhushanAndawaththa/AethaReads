import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aethareads.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Novel {
  slug: string;
  updated_at: string;
}

interface PaginatedResponse {
  data: Novel[];
  total: number;
  page: number;
  per_page: number;
}

async function fetchAllNovelSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const PAGE_SIZE = 100;
  const results: { slug: string; updatedAt: string }[] = [];
  let page = 1;

  while (true) {
    try {
      const res = await fetch(
        `${API_URL}/api/novels?page=${page}&per_page=${PAGE_SIZE}&status=ongoing,completed`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) break;
      const json: PaginatedResponse = await res.json();
      const novels = json.data ?? [];
      for (const n of novels) {
        results.push({ slug: n.slug, updatedAt: n.updated_at });
      }
      if (novels.length < PAGE_SIZE) break;
      page++;
    } catch {
      break;
    }
  }
  return results;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/browse`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/library`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/auth/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const novels = await fetchAllNovelSlugs();
  const novelPages: MetadataRoute.Sitemap = novels.map(({ slug, updatedAt }) => ({
    url: `${BASE_URL}/novel/${slug}`,
    lastModified: new Date(updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...novelPages];
}
