import { api } from '@/lib/api';
import { NovelCard } from '@/components/NovelCard';
import { ContinueReadingSection } from '@/components/ContinueReadingSection';
import Link from 'next/link';
import type { Novel } from '@/lib/types';

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function HomePage() {
  let novels: Novel[];
  try {
    const res = await api.getNovels({ page: 1, per_page: 12, sort: 'popular' });
    novels = res.data;
  } catch {
    novels = [];
  }

  let recentNovels: Novel[];
  try {
    const res = await api.getNovels({ page: 1, per_page: 6, sort: 'updated' });
    recentNovels = res.data;
  } catch {
    recentNovels = [];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">
      {/* Hero */}
      <section className="text-center py-10 md:py-16">
        <h1 className="text-3xl md:text-5xl font-bold mb-3">
          Read Web Novels <span className="text-brand-500">Anytime</span>
        </h1>
        <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-sm md:text-base">
          Discover thousands of web novels with a clean, distraction-free reading experience optimized for mobile.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/browse" className="btn-primary text-sm">
            Browse All Novels
          </Link>
        </div>
      </section>

      {/* Continue Reading (client-side, only for logged-in users) */}
      <ContinueReadingSection />

      {/* Popular Novels */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold">🔥 Popular Novels</h2>
          <Link
            href="/browse?sort=popular"
            className="text-xs text-brand-500 hover:text-brand-400 font-medium"
          >
            View All →
          </Link>
        </div>
        {novels.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
            {novels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center text-[var(--text-muted)]">
            <p className="text-lg mb-2">No novels yet</p>
            <p className="text-sm">Start the backend server and seed data to see novels here.</p>
          </div>
        )}
      </section>

      {/* Recently Updated */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold">📝 Recently Updated</h2>
          <Link
            href="/browse?sort=updated"
            className="text-xs text-brand-500 hover:text-brand-400 font-medium"
          >
            View All →
          </Link>
        </div>
        {recentNovels.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
            {recentNovels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-[var(--text-muted)]">
            <p className="text-sm">No updates yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
