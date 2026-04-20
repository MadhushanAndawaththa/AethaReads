'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Novel, UserProfile } from '@/lib/types';
import { NovelCard } from '@/components/NovelCard';
import { formatDate } from '@/lib/utils';

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    api.getUserProfile(username)
      .then((res) => {
        setProfile(res.user);
        setNovels(res.novels || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[var(--bg-secondary)]" />
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-[var(--bg-secondary)] rounded w-48" />
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h1 className="text-2xl font-bold mb-2">User not found</h1>
        <p className="text-[var(--text-muted)] mb-6">This user doesn&apos;t exist or has been removed.</p>
        <Link href="/" className="btn-primary text-sm inline-flex">Go Home</Link>
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    author: 'Author',
    reader: 'Reader',
  };
  const roleColor: Record<string, string> = {
    admin: 'text-red-400 bg-red-400/10 border-red-400/20',
    author: 'text-brand-400 bg-brand-400/10 border-brand-400/20',
    reader: 'text-[var(--text-muted)] bg-[var(--bg-secondary)] border-[var(--border-color)]',
  };

  const initials = profile.display_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header */}
      <div className="card p-6 flex items-start gap-5">
        {/* Avatar */}
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-brand-500/10 flex items-center justify-center shrink-0 border border-[var(--border-color)]">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" unoptimized sizes="80px" />
          ) : (
            <span className="text-2xl font-bold text-brand-500">{initials}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-xl font-bold">{profile.display_name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleColor[profile.role] ?? roleColor.reader}`}>
              {roleLabel[profile.role] ?? profile.role}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-2">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-[var(--text-secondary)] mb-3 max-w-xl">{profile.bio}</p>}
          <p className="text-xs text-[var(--text-muted)]">Joined {formatDate(profile.created_at)}</p>
        </div>
      </div>

      {/* Authored Novels */}
      {novels.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">
            {profile.display_name}&apos;s Novels
            <span className="ml-2 text-sm text-[var(--text-muted)] font-normal">({novels.length})</span>
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
            {novels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} showRating />
            ))}
          </div>
        </section>
      )}

      {(profile.role === 'author' || profile.role === 'admin') && novels.length === 0 && (
        <div className="card p-8 text-center text-[var(--text-muted)]">
          <p className="text-sm">This author hasn&apos;t published any novels yet.</p>
        </div>
      )}
    </div>
  );
}
