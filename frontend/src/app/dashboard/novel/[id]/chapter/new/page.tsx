'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function NewChapterPage() {
  const { id: novelId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.createChapter(novelId, {
        title: title.trim(),
        content_md: content,
        status,
      });
      router.push(`/dashboard/novel/${novelId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create chapter');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/dashboard/novel/${novelId}`} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-4 inline-block">
        ← Back to Chapters
      </Link>
      <h1 className="text-2xl font-bold mb-6">New Chapter</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="chapter-title" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Chapter Title *</label>
          <input
            id="chapter-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition"
            placeholder="Chapter title"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="chapter-content-input" className="block text-sm font-medium text-[var(--text-secondary)]">Content (Markdown) *</label>
            <span className="text-xs text-[var(--text-muted)]">{wordCount.toLocaleString()} words</span>
          </div>
          <textarea
            id="chapter-content-input"
            rows={20}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition resize-y font-mono text-sm"
            placeholder="Write your chapter here..."
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              checked={status === 'draft'}
              onChange={() => setStatus('draft')}
              className="accent-brand-500"
            />
            <span className="text-sm">Save as Draft</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              checked={status === 'published'}
              onChange={() => setStatus('published')}
              className="accent-brand-500"
            />
            <span className="text-sm">Publish Immediately</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary disabled:opacity-50"
        >
          {submitting ? 'Saving...' : status === 'published' ? 'Publish Chapter' : 'Save Draft'}
        </button>
      </form>
    </div>
  );
}
