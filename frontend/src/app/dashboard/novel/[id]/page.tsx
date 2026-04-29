'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { ChapterBulkAction, ChapterListItem, ContentWarning, Genre, NovelWithGenres, NovelLanguage } from '@/lib/types';
import { getLanguageLabel } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

export default function ManageNovelPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [novel, setNovel] = useState<NovelWithGenres | null>(null);
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [warnings, setWarnings] = useState<ContentWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState('ongoing');
  const [language, setLanguage] = useState<NovelLanguage>('en');
  const [novelType, setNovelType] = useState('web_novel');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedWarnings, setSelectedWarnings] = useState<string[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [chapterFilter, setChapterFilter] = useState<'all' | 'draft' | 'published' | 'scheduled'>('all');

  const loadData = useCallback(async () => {
    try {
      const [novelRes, chaptersRes, genresRes, warningsRes] = await Promise.all([
        api.getMyNovel(id),
        api.getMyChapters(id),
        api.getGenres(),
        api.getContentWarnings(),
      ]);
      setNovel(novelRes.novel);
      const chapterData = chaptersRes.data || [];
      setChapters(chapterData);
      setGenres(genresRes.data || []);
      setWarnings(warningsRes.data || []);
      setSelectedChapterIds((prev) => prev.filter((chapterId) => chapterData.some((chapter) => chapter.id === chapterId)));
      setTitle(novelRes.novel.title);
      setDescription(novelRes.novel.description || '');
      setCoverUrl(novelRes.novel.cover_url || '');
      setStatus(novelRes.novel.status || 'ongoing');
      setLanguage(novelRes.novel.language);
      setNovelType(novelRes.novel.novel_type || 'web_novel');
      setSelectedGenres((novelRes.novel.genres || []).map((genre) => genre.id));
      setSelectedWarnings((novelRes.novel.warnings || []).map((warning) => warning.id));
    } catch {
      setError('Failed to load novel studio data.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    loadData();
  }, [user, authLoading, router, loadData]);

  const chapterStats = useMemo(() => {
    const published = chapters.filter((chapter) => chapter.status === 'published').length;
    const drafts = chapters.filter((chapter) => chapter.status === 'draft').length;
    const scheduled = chapters.filter((chapter) => chapter.status === 'scheduled').length;
    const totalViews = chapters.reduce((sum, chapter) => sum + chapter.views, 0);
    return { published, drafts, scheduled, totalViews };
  }, [chapters]);

  const visibleChapters = useMemo(() => {
    if (chapterFilter === 'all') return chapters;
    return chapters.filter((chapter) => chapter.status === chapterFilter);
  }, [chapterFilter, chapters]);

  const visibleChapterIds = useMemo(() => visibleChapters.map((chapter) => chapter.id), [visibleChapters]);

  const allVisibleSelected = useMemo(() => (
    visibleChapterIds.length > 0 && visibleChapterIds.every((chapterId) => selectedChapterIds.includes(chapterId))
  ), [selectedChapterIds, visibleChapterIds]);

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) => prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]);
  };

  const toggleWarning = (warningId: string) => {
    setSelectedWarnings((prev) => prev.includes(warningId) ? prev.filter((id) => id !== warningId) : [...prev, warningId]);
  };

  const toggleChapterSelection = (chapterId: string) => {
    setSelectedChapterIds((prev) => prev.includes(chapterId) ? prev.filter((id) => id !== chapterId) : [...prev, chapterId]);
  };

  const toggleVisibleSelection = () => {
    setSelectedChapterIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((chapterId) => !visibleChapterIds.includes(chapterId));
      }
      return Array.from(new Set([...prev, ...visibleChapterIds]));
    });
  };

  const handleSaveMetadata = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateNovel(id, {
        title: title.trim(),
        description: description.trim(),
        cover_url: coverUrl.trim(),
        status,
        language,
        novel_type: novelType,
        genre_ids: selectedGenres,
        warning_ids: selectedWarnings,
      });
      await loadData();
      setSuccess('Novel metadata saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save novel metadata');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (chapterId: string) => {
    const ok = await confirm({ message: 'Are you sure you want to delete this chapter?', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.deleteChapter(chapterId);
      await loadData();
      toast('Chapter deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  const handleBulkAction = async (action: ChapterBulkAction) => {
    if (selectedChapterIds.length === 0) {
      return;
    }

    const labels: Record<ChapterBulkAction, { message: string; confirmLabel: string; danger?: boolean; success: string }> = {
      publish: {
        message: `Publish ${selectedChapterIds.length} selected chapter${selectedChapterIds.length === 1 ? '' : 's'} now?`,
        confirmLabel: 'Publish now',
        success: 'Selected chapters published.',
      },
      draft: {
        message: `Move ${selectedChapterIds.length} selected chapter${selectedChapterIds.length === 1 ? '' : 's'} back to draft? They will be hidden from readers.`,
        confirmLabel: 'Move to draft',
        success: 'Selected chapters moved to draft.',
      },
      delete: {
        message: `Delete ${selectedChapterIds.length} selected chapter${selectedChapterIds.length === 1 ? '' : 's'}? This cannot be undone.`,
        confirmLabel: 'Delete chapters',
        danger: true,
        success: 'Selected chapters deleted.',
      },
    };

    const selection = labels[action];
    const ok = await confirm({
      message: selection.message,
      confirmLabel: selection.confirmLabel,
      danger: selection.danger,
    });
    if (!ok) return;

    try {
      const result = await api.bulkChapterAction(id, {
        action,
        chapter_ids: selectedChapterIds,
      });
      setSelectedChapterIds([]);
      await loadData();
      toast(result.count > 0 ? `${selection.success} (${result.count})` : selection.success, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk action failed', 'error');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-2 inline-block">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold">Novel Studio</h1>
          {novel && <p className="text-sm text-[var(--text-secondary)] mt-2">{novel.title} · {getLanguageLabel(novel.language)}</p>}
        </div>
        <Link href={`/dashboard/novel/${id}/chapter/new`} className="btn-primary text-sm">+ New Chapter</Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <form onSubmit={handleSaveMetadata} className="card p-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Metadata</p>
            <h2 className="text-xl font-semibold">Novel Settings</h2>
          </div>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
          {success && <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{success}</div>}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="novel-title" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Title</label>
              <input id="novel-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
            </div>
            <div>
              <label htmlFor="novel-cover" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Cover URL</label>
              <input id="novel-cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
            </div>
          </div>

          <div>
            <label htmlFor="novel-description" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Description</label>
            <textarea id="novel-description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500 resize-y" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="novel-status" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Status</label>
              <select id="novel-status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500">
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="hiatus">Hiatus</option>
              </select>
            </div>
            <div>
              <label htmlFor="novel-language" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Language</label>
              <select id="novel-language" value={language} onChange={(e) => setLanguage(e.target.value as NovelLanguage)} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500">
                <option value="en">English</option>
                <option value="si">සිංහල</option>
                <option value="bilingual">Bilingual</option>
              </select>
            </div>
            <div>
              <label htmlFor="novel-type" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Type</label>
              <select id="novel-type" value={novelType} onChange={(e) => setNovelType(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500">
                <option value="web_novel">Web Novel</option>
                <option value="light_novel">Light Novel</option>
                <option value="published_novel">Published Novel</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-[var(--text-secondary)]">Genres</p>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${selectedGenres.includes(genre.id) ? 'bg-brand-500 border-brand-500 text-white' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-brand-500/50'}`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-[var(--text-secondary)]">Content Warnings</p>
            <div className="flex flex-wrap gap-2">
              {warnings.map((warning) => (
                <button
                  key={warning.id}
                  type="button"
                  onClick={() => toggleWarning(warning.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${selectedWarnings.includes(warning.id) ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-amber-500/40'}`}
                >
                  {warning.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60 min-w-[160px]">
              {saving ? 'Saving…' : 'Save Metadata'}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Studio Stats</p>
            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <p>{chapters.length} total chapters</p>
              <p>{chapterStats.published} published · {chapterStats.drafts} drafts · {chapterStats.scheduled} scheduled</p>
              <p>{chapterStats.totalViews.toLocaleString()} chapter views</p>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Preview</p>
            <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden">
              <div className="aspect-[3/4] bg-[var(--bg-secondary)] flex items-center justify-center">
                {coverUrl ? (
                  <img src={coverUrl} alt={title || 'Novel cover'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-[var(--text-muted)]">📖</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold line-clamp-2">{title || 'Untitled novel'}</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">{getLanguageLabel(language)} · {status}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div>
      <div className="card p-4 mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Chapter Command Center</p>
          <p className="text-sm text-[var(--text-secondary)]">
            {selectedChapterIds.length} selected · {visibleChapters.length} visible in this filter
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={toggleVisibleSelection} className="btn-secondary text-sm">
            {allVisibleSelected ? 'Clear Visible' : `Select ${visibleChapters.length} Visible`}
          </button>
          <button type="button" disabled={selectedChapterIds.length === 0} onClick={() => handleBulkAction('publish')} className="btn-primary text-sm disabled:opacity-50">
            Publish Selected
          </button>
          <button type="button" disabled={selectedChapterIds.length === 0} onClick={() => handleBulkAction('draft')} className="btn-secondary text-sm disabled:opacity-50">
            Move to Draft
          </button>
          <button type="button" disabled={selectedChapterIds.length === 0} onClick={() => handleBulkAction('delete')} className="px-3 py-2 rounded-lg text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition">
            Delete Selected
          </button>
        </div>
      </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-xl font-semibold">Chapters</h2>
          <select value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value as 'all' | 'draft' | 'published' | 'scheduled')} className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500 text-sm">
            <option value="all">All chapters</option>
            <option value="draft">Drafts</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </div>

      {visibleChapters.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-muted)] mb-4">No chapters yet.</p>
          <Link href={`/dashboard/novel/${id}/chapter/new`} className="btn-primary text-sm inline-flex">Write Your First Chapter</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleChapters.map((ch) => (
            <div key={ch.id} className="card flex items-center gap-4 p-4">
              <input
                type="checkbox"
                checked={selectedChapterIds.includes(ch.id)}
                onChange={() => toggleChapterSelection(ch.id)}
                className="h-4 w-4 accent-brand-500 shrink-0"
                aria-label={`Select chapter ${ch.chapter_number}`}
              />
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
                  {ch.status === 'scheduled' && ch.published_at ? ` · publishes ${new Date(ch.published_at).toLocaleString()}` : ''}
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
    </div>
  );
}
