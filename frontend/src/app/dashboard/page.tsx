'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { Novel } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [stats, setStats] = useState<{
    total_novels: number; total_chapters: number;
    total_views: number; total_follows: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (user.role === 'reader') {
      // Auto-promote to author
      api.becomeAuthor().then(() => {
        loadData();
      });
    } else {
      loadData();
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      const [novelsRes, statsRes] = await Promise.all([
        api.getMyNovels(),
        api.getAuthorStats(),
      ]);
      setNovels(novelsRes.data || []);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Author Dashboard</h1>
        <Link
          href="/dashboard/novel/new"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition"
        >
          + New Novel
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Novels" value={stats.total_novels} />
          <StatCard label="Chapters" value={stats.total_chapters} />
          <StatCard label="Total Views" value={stats.total_views} />
          <StatCard label="Followers" value={stats.total_follows} />
        </div>
      )}

      {/* Novels List */}
      <h2 className="text-xl font-semibold mb-4">Your Novels</h2>
      {novels.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl">
          <p className="text-gray-400 mb-4">You haven&apos;t created any novels yet.</p>
          <Link
            href="/dashboard/novel/new"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition"
          >
            Create Your First Novel
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {novels.map((novel) => (
            <div key={novel.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition">
              {novel.cover_url ? (
                <img src={novel.cover_url} alt={novel.title} className="w-16 h-20 object-cover rounded-lg" />
              ) : (
                <div className="w-16 h-20 bg-purple-600/20 rounded-lg flex items-center justify-center text-purple-400 text-xs">
                  No Cover
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{novel.title}</h3>
                <p className="text-sm text-gray-400">
                  {novel.chapter_count} chapters · {novel.views.toLocaleString()} views · {novel.status}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/novel/${novel.id}`}
                  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                  Manage
                </Link>
                <Link
                  href={`/novel/${novel.slug}`}
                  className="px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 transition"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-white/5 rounded-xl">
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
