'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { ChapterListItem } from '@/lib/types';

export default function ManageNovelPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    loadChapters();
  }, [user, authLoading, router, id]);

  const loadChapters = async () => {
    try {
      const res = await api.getMyChapters(id);
      setChapters(res.data || []);
    } catch {
      console.error('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;
    try {
      await api.deleteChapter(chapterId);
      setChapters((prev) => prev.filter((c) => c.id !== chapterId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Manage Chapters</h1>
        </div>
        <Link
          href={`/dashboard/novel/${id}/chapter/new`}
          className="btn-primary text-sm"
        >
          + New Chapter
        </Link>
      </div>

      {chapters.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-muted)] mb-4">No chapters yet.</p>
          <Link
            href={`/dashboard/novel/${id}/chapter/new`}
            className="btn-primary text-sm inline-flex"
          >
            Write Your First Chapter
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map((ch) => (
            <div key={ch.id} className="card flex items-center gap-4 p-4">
              <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-400 font-bold text-sm">
                {ch.chapter_number}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{ch.title}</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  {ch.word_count.toLocaleString()} words · {ch.views.toLocaleString()} views
                  {' · '}
                  <span className={ch.status === 'published' ? 'text-green-400' : ch.status === 'draft' ? 'text-yellow-400' : 'text-blue-400'}>
                    {ch.status}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/chapter/${ch.id}/edit`}
                  className="btn-secondary text-sm"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(ch.id)}
                  className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
