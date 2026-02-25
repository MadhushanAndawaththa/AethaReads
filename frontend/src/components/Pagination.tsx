import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string>;
}

export function Pagination({ currentPage, totalPages, basePath, params }: PaginationProps) {
  function buildUrl(page: number): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all') searchParams.set(key, value);
    });
    searchParams.set('page', String(page));
    return `${basePath}?${searchParams.toString()}`;
  }

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8">
      {currentPage > 1 && (
        <Link
          href={buildUrl(currentPage - 1)}
          className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm hover:bg-[var(--border-color)] transition-colors"
        >
          ←
        </Link>
      )}

      {pages.map((p, i) => {
        if (p === '...') {
          return (
            <span key={`dots-${i}`} className="px-2 text-[var(--text-muted)]">
              ...
            </span>
          );
        }
        return (
          <Link
            key={p}
            href={buildUrl(p)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              p === currentPage
                ? 'bg-brand-600 text-white'
                : 'bg-[var(--bg-secondary)] hover:bg-[var(--border-color)]'
            }`}
          >
            {p}
          </Link>
        );
      })}

      {currentPage < totalPages && (
        <Link
          href={buildUrl(currentPage + 1)}
          className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm hover:bg-[var(--border-color)] transition-colors"
        >
          →
        </Link>
      )}
    </nav>
  );
}
