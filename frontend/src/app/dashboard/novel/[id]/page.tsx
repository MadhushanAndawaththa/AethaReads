'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { ChapterListItem, Genre, NovelWithGenres, NovelLanguage } from '@/lib/types';
import { getLanguageLabel } from '@/lib/utils';

export default function ManageNovelPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [novel, setNovel] = useState<NovelWithGenres | null>(null);
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState('ongoing');
  const [language, setLanguage] = useState<NovelLanguage>('en');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [novelRes, chaptersRes, genresRes] = await Promise.all([
        api.getMyNovel(id),
        api.getMyChapters(id),
        api.getGenres(),
      ]);
      setNovel(novelRes.novel);
      setChapters(chaptersRes.data || []);
      setGenres(genresRes.data || []);
      setTitle(novelRes.novel.title);
      setDescription(novelRes.novel.description || '');
      setCoverUrl(novelRes.novel.cover_url || '');
      setStatus(novelRes.novel.status || 'ongoing');
      setLanguage(novelRes.novel.language);
      setSelectedGenres((novelRes.novel.genres || []).map((genre) => genre.id));
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
    const totalViews = chapters.reduce((sum, chapter) => sum + chapter.views, 0);
    return { published, drafts: chapters.length - published, totalViews };
  }, [chapters]);

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) => prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]);
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
        genre_ids: selectedGenres,
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
              <p>{chapterStats.published} published · {chapterStats.drafts} drafts</p>
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
        <h2 className="text-xl font-semibold mb-4">Chapters</h2>

      {chapters.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-muted)] mb-4">No chapters yet.</p>
          <Link href={`/dashboard/novel/${id}/chapter/new`} className="btn-primary text-sm inline-flex">Write Your First Chapter</Link>
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
    </div>
  );
}
