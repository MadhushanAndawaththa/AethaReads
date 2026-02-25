'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Genre } from '@/lib/types';

interface BrowseFiltersProps {
  currentSort: string;
  currentStatus: string;
  currentGenre: string;
  genres: Genre[];
}

export function BrowseFilters({ currentSort, currentStatus, currentGenre, genres }: BrowseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== 'all' && value !== '') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  }

  const sortOptions = [
    { label: 'Latest', value: 'updated' },
    { label: 'Popular', value: 'popular' },
    { label: 'Rating', value: 'rating' },
    { label: 'A-Z', value: 'title' },
    { label: 'New', value: 'newest' },
  ];

  const statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Ongoing', value: 'ongoing' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <div className="space-y-4">
      {/* Sort pills */}
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wider">Sort By</p>
        <div className="flex flex-wrap gap-2">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParam('sort', opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                currentSort === opt.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status pills */}
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wider">Status</p>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParam('status', opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                currentStatus === opt.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genre pills */}
      {genres.length > 0 && (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wider">Genre</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateParam('genre', '')}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                !currentGenre
                  ? 'bg-brand-600 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              All
            </button>
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => updateParam('genre', g.slug)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  currentGenre === g.slug
                    ? 'bg-brand-600 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
