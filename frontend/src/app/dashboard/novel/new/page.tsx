'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { ContentWarning, Genre, NovelLanguage } from '@/lib/types';

export default function NewNovelPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [warnings, setWarnings] = useState<ContentWarning[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [novelType, setNovelType] = useState('web_novel');
  const [status, setStatus] = useState('ongoing');
  const [language, setLanguage] = useState<NovelLanguage>('en');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedWarnings, setSelectedWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    api.getGenres().then((res) => setGenres(res.data || [])).catch(() => {});
    api.getContentWarnings().then((res) => setWarnings(res.data || [])).catch(() => {});
  }, [user, authLoading, router]);

  const toggleGenre = (id: string) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleWarning = (id: string) => {
    setSelectedWarnings((prev) =>
      prev.includes(id) ? prev.filter((warningId) => warningId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.createNovel({
        title: title.trim(),
        description: description.trim(),
        cover_url: coverUrl.trim(),
        status,
        language,
        novel_type: novelType,
        genre_ids: selectedGenres,
        warning_ids: selectedWarnings,
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create novel');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create New Novel</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="novel-title" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Title *</label>
          <input
            id="novel-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition"
            placeholder="Your novel's title"
          />
        </div>

        <div>
          <label htmlFor="novel-description" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Description</label>
          <textarea
            id="novel-description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition resize-y"
            placeholder="Synopsis of your novel..."
          />
        </div>

        <div>
          <label htmlFor="novel-cover-url" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Cover Image URL</label>
          <input
            id="novel-cover-url"
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition"
            placeholder="https://..."
          />
        </div>

        {coverUrl && (
          <div className="card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Cover Preview</p>
            <div className="w-32 aspect-[3/4] rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <img src={coverUrl} alt="Novel cover preview" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="novel-type" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Type</label>
          <select
            id="novel-type"
            value={novelType}
            onChange={(e) => setNovelType(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:border-brand-500 outline-none transition"
          >
            <option value="web_novel">Web Novel</option>
            <option value="light_novel">Light Novel</option>
            <option value="published_novel">Published Novel</option>
          </select>
        </div>

        <div>
          <label htmlFor="novel-language" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Primary Language</label>
          <select
            id="novel-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as NovelLanguage)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:border-brand-500 outline-none transition"
          >
            <option value="en">English</option>
            <option value="si">සිංහල</option>
            <option value="bilingual">Bilingual</option>
          </select>
        </div>

        <div>
          <label htmlFor="novel-status" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Status</label>
          <select
            id="novel-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:border-brand-500 outline-none transition"
          >
            <option value="ongoing">Ongoing</option>
            <option value="hiatus">Hiatus</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {genres.length > 0 && (
          <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Genres</label>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    selectedGenres.includes(genre.id)
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-brand-500/50'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Content Warnings</label>
            <div className="flex flex-wrap gap-2">
              {warnings.map((warning) => (
                <button
                  key={warning.id}
                  type="button"
                  onClick={() => toggleWarning(warning.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    selectedWarnings.includes(warning.id)
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-amber-500/40'
                  }`}
                >
                  {warning.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Novel'}
        </button>
      </form>
    </div>
  );
}
