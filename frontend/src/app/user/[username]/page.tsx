import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Novel, UserProfile } from '@/lib/types';
import { NovelCard } from '@/components/NovelCard';
import { formatDate, SITE_NAME } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface UserProfileResponse {
  user: UserProfile;
  novels: Novel[];
}

async function fetchProfile(username: string): Promise<UserProfileResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/users/${username}`, {
      next: { revalidate: 300 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  } catch {
    return null;
  }
}

function parseSocialLinks(raw: string | undefined): Record<string, string> {
  try {
    return JSON.parse(raw || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await fetchProfile(username);
  if (!data) return { title: 'User not found' };
  const { user } = data;
  const title = `${user.display_name} (@${user.username}) | ${SITE_NAME}`;
  const description = user.bio
    ? user.bio.slice(0, 155)
    : `Read novels by ${user.display_name} on ${SITE_NAME}.`;
  return {
    title,
    description,
    openGraph: {
      type: 'profile',
      title,
      description,
      ...(user.avatar_url ? { images: [{ url: user.avatar_url, width: 200, height: 200 }] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(user.avatar_url ? { images: [user.avatar_url] } : {}),
    },
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await fetchProfile(username);
  if (!data) notFound();

  const { user: profile, novels } = data;

  const roleLabel: Record<string, string> = { admin: 'Admin', author: 'Author', reader: 'Reader' };
  const roleColor: Record<string, string> = {
    admin: 'text-red-400 bg-red-400/10 border-red-400/20',
    author: 'text-brand-400 bg-brand-400/10 border-brand-400/20',
    reader: 'text-[var(--text-muted)] bg-[var(--bg-secondary)] border-[var(--border-color)]',
  };

  const initials = profile.display_name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const brandColor = profile.author_profile?.brand_color || '#4c6ef5';
  const socialLinks = parseSocialLinks(profile.author_profile?.social_links);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="card overflow-hidden">
        <div
          className="h-28 md:h-36"
          style={{ background: `linear-gradient(135deg, ${brandColor}, rgba(76, 110, 245, 0.12))` }}
        />
        <div className="p-6 pt-0">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <div className="relative -mt-10 w-20 h-20 rounded-2xl overflow-hidden bg-brand-500/10 flex items-center justify-center shrink-0 border-4 border-[var(--bg-card)]">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.display_name} fill sizes="80px" className="object-cover" />
              ) : (
                <span className="text-2xl font-bold text-brand-500">{initials}</span>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-xl font-bold">{profile.display_name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleColor[profile.role] ?? roleColor.reader}`}>
                  {roleLabel[profile.role] ?? profile.role}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-2">@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm text-[var(--text-secondary)] mb-3 max-w-2xl leading-relaxed">{profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)] mb-3">
                <span>Joined {formatDate(profile.created_at)}</span>
                {profile.author_profile && <span>{profile.author_profile.total_views.toLocaleString()} total views</span>}
                {profile.author_profile && <span>{profile.author_profile.total_followers.toLocaleString()} followers</span>}
              </div>

              <div className="flex flex-wrap gap-2">
                {profile.author_profile?.website_url && (
                  <a href={profile.author_profile.website_url} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-brand-500/40 transition">Website</a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-brand-500/40 transition">Facebook</a>
                )}
                {socialLinks.discord && (
                  <a href={socialLinks.discord} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-brand-500/40 transition">Discord</a>
                )}
                {socialLinks.patreon && (
                  <a href={socialLinks.patreon} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-brand-500/40 transition">Support</a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
