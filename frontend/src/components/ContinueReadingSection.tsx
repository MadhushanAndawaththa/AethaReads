'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';
import type { ReadingProgress } from '@/lib/types';

export function ContinueReadingSection() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    api.getAllProgress()
      .then((res) => setProgress((res.data || []).slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user]);

  if (!user || !loaded || progress.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-bold">📖 Continue Reading</h2>
        <Link href="/library" className="text-xs text-brand-500 hover:text-brand-400 font-medium">
          My Library →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {progress.map((p) => (
          <Link
            key={p.id}
            href={`/novel/${p.novel_slug}/${p.chapter_number}`}
            className="card p-3 flex flex-col gap-1.5 hover:border-brand-500/30 transition-all group"
          >
            <div className="text-xs font-medium text-[var(--text-primary)] group-hover:text-brand-500 transition-colors line-clamp-2 leading-snug">
              {p.novel_title || p.novel_slug}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">Ch. {p.chapter_number}</div>
            {p.scroll_position > 0 && (
              <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{ width: `${Math.min(p.scroll_position, 100)}%` }}
                />
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
