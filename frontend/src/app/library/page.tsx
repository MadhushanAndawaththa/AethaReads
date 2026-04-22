'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { Novel, ReadingProgress } from '@/lib/types';

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'reading' | 'following'>('reading');
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [followed, setFollowed] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    loadData();
  }, [user, authLoading, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progressRes, followedRes] = await Promise.all([
        api.getAllProgress(),
        api.getFollowedNovels(),
      ]);
      setProgress(progressRes.data || []);
      setFollowed(followedRes.data || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (!user && !authLoading)) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Library</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-xl p-1 mb-8 w-fit">
        {(['reading', 'following'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-150 ${
              tab === t
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-color)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t === 'reading' ? `Continue Reading (${progress.length})` : `Following (${followed.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 flex gap-4 animate-pulse">
              <div className="w-14 h-20 rounded-lg bg-[var(--bg-secondary)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4" />
                <div className="h-3 bg-[var(--bg-secondary)] rounded w-1/2" />
                <div className="h-3 bg-[var(--bg-secondary)] rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'reading' ? (
        progress.length === 0 ? (
          <EmptyState
            title="No reading history yet"
            message="Start reading a novel and your progress will appear here."
            action={{ label: 'Browse Novels', href: '/browse' }}
          />
        ) : (
          <div className="space-y-3">
            {progress.map((p) => (
              <ReadingProgressCard key={p.id} progress={p} />
            ))}
          </div>
        )
      ) : (
        followed.length === 0 ? (
          <EmptyState
            title="Not following any novels"
            message="Follow novels to get notified when new chapters are published."
            action={{ label: 'Discover Novels', href: '/browse' }}
          />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
            {followed.map((novel) => (
              <Link
                key={novel.id}
                href={`/novel/${novel.slug}`}
                className="card group overflow-hidden hover:border-brand-500/30 transition-all"
              >
                <div className="relative aspect-[3/4] bg-[var(--bg-secondary)] overflow-hidden">
                  {novel.cover_url ? (
                    <Image src={novel.cover_url} alt={novel.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="20vw" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-40">📖</div>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-semibold line-clamp-2 group-hover:text-brand-500 transition-colors">{novel.title}</h3>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{novel.chapter_count} ch.</p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function ReadingProgressCard({ progress }: { progress: ReadingProgress }) {
  return (
    <Link
      href={`/novel/${progress.novel_slug}/${progress.chapter_number}`}
      className="card p-4 flex items-center gap-4 hover:border-brand-500/30 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500 shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-brand-500 transition-colors">
          {progress.novel_title || progress.novel_slug}
        </p>
        <p className="text-xs text-[var(--text-muted)]">Chapter {progress.chapter_number}</p>
        {progress.scroll_position > 0 && (
          <div className="mt-1.5 h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full"
              style={{ width: `${Math.min(progress.scroll_position, 100)}%` }}
            />
          </div>
        )}
      </div>
      <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-brand-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action: { label: string; href: string } }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center text-3xl mx-auto mb-4">📚</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] mb-6">{message}</p>
      <Link href={action.href} className="btn-primary text-sm inline-flex">
        {action.label}
      </Link>
    </div>
  );
}
