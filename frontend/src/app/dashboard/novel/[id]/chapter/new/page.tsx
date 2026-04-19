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
      <Link href={`/dashboard/novel/${novelId}`} className="text-sm text-gray-400 hover:text-gray-300 mb-4 inline-block">
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
          <label className="block text-sm font-medium mb-1 text-gray-300">Chapter Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
            placeholder="Chapter title"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-300">Content (Markdown) *</label>
            <span className="text-xs text-gray-500">{wordCount.toLocaleString()} words</span>
          </div>
          <textarea
            rows={20}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition resize-y font-mono text-sm"
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
              className="accent-purple-500"
            />
            <span className="text-sm">Save as Draft</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              checked={status === 'published'}
              onChange={() => setStatus('published')}
              className="accent-purple-500"
            />
            <span className="text-sm">Publish Immediately</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition"
        >
          {submitting ? 'Saving...' : status === 'published' ? 'Publish Chapter' : 'Save Draft'}
        </button>
      </form>
    </div>
  );
}
