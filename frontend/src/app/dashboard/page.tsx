'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { Novel } from '@/lib/types';
import { getLanguageLabel } from '@/lib/utils';

export default function DashboardPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [stats, setStats] = useState<{
    total_novels: number; total_chapters: number;
    total_views: number; total_follows: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthorPrompt, setShowAuthorPrompt] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [novelsRes, statsRes] = await Promise.all([
        api.getMyNovels(),
        api.getAuthorStats(),
      ]);
      setNovels(novelsRes.data || []);
      setStats(statsRes);
    } catch {
      // Failed to load dashboard data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (user.role === 'reader') {
      setShowAuthorPrompt(true);
      setLoading(false);
    } else {
      loadData();
    }
  }, [user, authLoading, router, loadData]);

  const handleBecomeAuthor = async () => {
    try {
      await api.becomeAuthor();
      await api.refresh();
      await refreshUser();
      setShowAuthorPrompt(false);
      setLoading(true);
      await loadData();
    } catch {
      // Failed to become author
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (showAuthorPrompt) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="text-4xl mb-4">✍️</div>
          <h2 className="text-xl font-bold mb-2">Become an Author</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Upgrade your account to start writing and publishing your own novels on Aetha. This will unlock the author dashboard where you can manage your works.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/')} className="btn-secondary text-sm">
              Not Now
            </button>
            <button onClick={handleBecomeAuthor} className="btn-primary text-sm">
              Yes, Become an Author
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Overview</p>
          <h1 className="text-3xl font-bold">Author Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-2xl">
            Track your catalog, spot weak metadata early, and jump back into the next chapter that needs attention.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/profile" className="btn-secondary text-sm">Edit Profile</Link>
          <Link href="/dashboard/novel/new" className="btn-primary text-sm">Create Novel</Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Novels" value={stats.total_novels} />
          <StatCard label="Chapters" value={stats.total_chapters} />
          <StatCard label="Total Views" value={stats.total_views} />
          <StatCard label="Followers" value={stats.total_follows} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <h2 className="text-xl font-semibold mb-4">Your Novels</h2>
      {novels.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-[var(--text-muted)] mb-4">You haven&apos;t created any novels yet.</p>
              <Link href="/dashboard/novel/new" className="btn-primary text-sm inline-flex">Create Your First Novel</Link>
            </div>
      ) : (
            <div className="space-y-4">
          {novels.map((novel) => (
                <div key={novel.id} className="card flex items-center gap-4 p-4 hover:border-brand-500/20 transition-all">
              {novel.cover_url ? (
                <img src={novel.cover_url} alt={novel.title} className="w-16 h-20 object-cover rounded-lg" />
              ) : (
                <div className="w-16 h-20 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-400 text-xs">
                  No Cover
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{novel.title}</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  {novel.chapter_count} chapters · {novel.views.toLocaleString()} views · {novel.status} · {getLanguageLabel(novel.language)}
                </p>
              </div>
              <div className="flex gap-2">
                    <Link href={`/dashboard/novel/${novel.id}`} className="btn-secondary text-sm">Manage</Link>
                    <Link href={`/novel/${novel.slug}`} className="px-3 py-1.5 text-sm text-brand-400 hover:text-brand-300 transition">View</Link>
              </div>
            </div>
          ))}
            </div>
      )}
        </section>

        <aside className="space-y-4">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Quick Actions</p>
            <div className="space-y-2">
              <Link href="/dashboard/novel/new" className="block rounded-xl bg-[var(--bg-secondary)] px-4 py-3 text-sm hover:border-brand-500/30 border border-transparent transition">Create a new novel</Link>
              <Link href="/dashboard/profile" className="block rounded-xl bg-[var(--bg-secondary)] px-4 py-3 text-sm hover:border-brand-500/30 border border-transparent transition">Complete your author profile</Link>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Catalog Health</p>
            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <p>{novels.filter((novel) => !novel.cover_url).length} novels are missing a cover image.</p>
              <p>{novels.filter((novel) => !novel.description?.trim()).length} novels are missing a description.</p>
              <p>{novels.filter((novel) => novel.language === 'en').length} novels are currently marked as English.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
