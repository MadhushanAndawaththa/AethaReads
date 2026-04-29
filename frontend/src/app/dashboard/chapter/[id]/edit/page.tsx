'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { Chapter } from '@/lib/types';
import { getChapterEditorialError } from '@/lib/chapterEditorialValidation';

const AUTOSAVE_DELAY_MS = 30_000;

export default function EditChapterPage() {
  const { id: chapterId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [publishAt, setPublishAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef({ title: '', content: '' });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  const loadChapter = useCallback(async () => {
    try {
      const ch = await api.getChapterForEdit(chapterId);
      setChapter(ch);
      setTitle(ch.title);
      setContent(ch.content_md || ch.content || '');
      setStatus((ch.status as 'draft' | 'published' | 'scheduled') || 'draft');
      setPublishAt(ch.published_at ? new Date(ch.published_at).toISOString().slice(0, 16) : '');
    } catch {
      setError('Chapter not found or you do not have permission to edit it.');
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    if (!authLoading && user) loadChapter();
  }, [user, authLoading, loadChapter]);

  // Autosave: debounce content/title changes for draft chapters
  const performAutoSave = useCallback(
    async (currentTitle: string, currentContent: string) => {
      const nothingChanged =
        currentTitle === lastSavedRef.current.title &&
        currentContent === lastSavedRef.current.content;
      if (nothingChanged || !currentTitle.trim() || !currentContent.trim()) return;
      setAutoSaveStatus('saving');
      try {
        await api.updateChapter(chapterId, {
          title: currentTitle.trim(),
          content_md: currentContent,
          status: 'draft',
        });
        lastSavedRef.current = { title: currentTitle, content: currentContent };
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 4000);
      }
    },
    [chapterId],
  );

  useEffect(() => {
    if (status !== 'draft') return; // never autosave when publishing
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(
      () => performAutoSave(title, content),
      AUTOSAVE_DELAY_MS,
    );
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, content, status, performAutoSave]);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = getChapterEditorialError({
      title,
      content,
      status,
      publishAt,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.updateChapter(chapterId, {
        title: title.trim(),
        content_md: content,
        status,
        publish_at: publishAt ? new Date(publishAt).toISOString() : undefined,
      });
      lastSavedRef.current = { title, content };
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save chapter');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-4 bg-[var(--bg-secondary)] rounded w-24" />
        <div className="h-8 bg-[var(--bg-secondary)] rounded w-56" />
        <div className="h-12 bg-[var(--bg-secondary)] rounded" />
        <div className="h-80 bg-[var(--bg-secondary)] rounded" />
      </div>
    );
  }

  if (error && !chapter) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/dashboard" className="btn-secondary text-sm inline-flex">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href={`/dashboard/novel/${chapter?.novel_id}`}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-4 inline-flex items-center gap-1"
      >
        ← Back to Chapters
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Chapter</h1>
        {saved && (
          <span className="text-sm text-green-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved!
          </span>
        )}
        {!saved && autoSaveStatus === 'saving' && (
          <span className="text-sm text-[var(--text-muted)] flex items-center gap-1">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Auto-saving…
          </span>
        )}
        {!saved && autoSaveStatus === 'saved' && (
          <span className="text-sm text-green-400/80 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Auto-saved
          </span>
        )}
        {!saved && autoSaveStatus === 'error' && (
          <span className="text-sm text-yellow-400/80">Auto-save failed</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="edit-chapter-title" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
            Chapter Title <span className="text-red-400">*</span>
          </label>
          <input
            id="edit-chapter-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition"
            placeholder="Chapter title"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="edit-chapter-content" className="block text-sm font-medium text-[var(--text-secondary)]">
              Content (Markdown) <span className="text-red-400">*</span>
            </label>
            <span className="text-xs text-[var(--text-muted)]">{wordCount.toLocaleString()} words</span>
          </div>
          <textarea
            id="edit-chapter-content"
            rows={24}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition resize-y font-mono text-sm"
            placeholder="Write your chapter here..."
          />
          {(status === 'published' || status === 'scheduled') && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Publish checks block suspicious HTML and near-empty content before a chapter goes live.
            </p>
          )}
        </div>

        <div className="flex items-center gap-6">
          {(['draft', 'published', 'scheduled'] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={status === s}
                onChange={() => setStatus(s)}
                className="accent-brand-500"
              />
              <span className="text-sm capitalize">{s === 'draft' ? 'Save as Draft' : s === 'published' ? 'Publish' : 'Schedule'}</span>
            </label>
          ))}
        </div>

        {status === 'scheduled' && (
          <div>
            <label htmlFor="edit-publish-at" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Publish At</label>
            <input
              id="edit-publish-at"
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-brand-500"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <Link
            href={`/dashboard/novel/${chapter?.novel_id}`}
            className="btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
