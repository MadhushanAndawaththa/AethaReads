'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { Genre } from '@/lib/types';

export default function NewNovelPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [novelType, setNovelType] = useState('Web Novel');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    api.getGenres().then((res) => setGenres(res.data || [])).catch(() => {});
  }, [user, authLoading, router]);

  const toggleGenre = (id: string) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
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
        status: 'Ongoing',
        novel_type: novelType,
        genre_ids: selectedGenres,
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
          <label className="block text-sm font-medium mb-1 text-gray-300">Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
            placeholder="Your novel's title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition resize-y"
            placeholder="Synopsis of your novel..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Cover Image URL</label>
          <input
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Type</label>
          <select
            value={novelType}
            onChange={(e) => setNovelType(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition"
          >
            <option value="Web Novel">Web Novel</option>
            <option value="Light Novel">Light Novel</option>
            <option value="Published Novel">Published Novel</option>
          </select>
        </div>

        {genres.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Genres</label>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    selectedGenres.includes(genre.id)
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition"
        >
          {submitting ? 'Creating...' : 'Create Novel'}
        </button>
      </form>
    </div>
  );
}
