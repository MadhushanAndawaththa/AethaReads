import { api } from '@/lib/api';
import { NovelCard } from '@/components/NovelCard';
import { BrowseFilters } from '@/components/BrowseFilters';
import { Pagination } from '@/components/Pagination';
import type { Metadata } from 'next';
import type { Genre } from '@/lib/types';
import { SITE_NAME } from '@/lib/utils';

export const metadata: Metadata = {
  title: `Browse Novels | ${SITE_NAME}`,
  description: 'Browse our entire catalog of web novels. Filter by genre, status, and sort by popularity or latest updates.',
};

export const revalidate = 60;

interface BrowsePageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    status?: string;
    genre?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const sort = params.sort || 'updated';
  const status = params.status || 'all';
  const genre = params.genre || '';

  let novelsData;
  try {
    novelsData = await api.getNovels({
      page,
      per_page: 24,
      sort,
      status,
      genre,
    });
  } catch {
    novelsData = { data: [], page: 1, per_page: 24, total: 0, total_pages: 0 };
  }

  let genres: Genre[];
  try {
    const res = await api.getGenres();
    genres = res.data || [];
  } catch {
    genres = [];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Browse Novels</h1>

      <BrowseFilters
        currentSort={sort}
        currentStatus={status}
        currentGenre={genre}
        genres={genres}
      />

      {novelsData.data.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mt-6">
            {novelsData.data.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>

          {novelsData.total_pages > 1 && (
            <Pagination
              currentPage={novelsData.page}
              totalPages={novelsData.total_pages}
              basePath="/browse"
              params={{ sort, status, genre }}
            />
          )}
        </>
      ) : (
        <div className="card p-12 text-center text-[var(--text-muted)] mt-6">
          <p className="text-lg mb-2">No novels found</p>
          <p className="text-sm">Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}
