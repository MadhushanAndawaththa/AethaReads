'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { CurrentProfileResponse } from '@/lib/types';

type SocialForm = {
  facebook: string;
  discord: string;
  patreon: string;
};

function parseSocialLinks(raw: string): SocialForm {
  try {
    const parsed = JSON.parse(raw || '{}') as Partial<SocialForm>;
    return {
      facebook: parsed.facebook || '',
      discord: parsed.discord || '',
      patreon: parsed.patreon || '',
    };
  } catch {
    return { facebook: '', discord: '', patreon: '' };
  }
}

export default function DashboardProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [brandColor, setBrandColor] = useState('#4c6ef5');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socials, setSocials] = useState<SocialForm>({ facebook: '', discord: '', patreon: '' });

  const loadProfile = useCallback(async () => {
    try {
      const profile = await api.getMyProfile();
      setDisplayName(profile.user.display_name || '');
      setAvatarUrl(profile.user.avatar_url || '');
      setBio(profile.user.bio || '');
      setBrandColor(profile.author_profile?.brand_color || '#4c6ef5');
      setWebsiteUrl(profile.author_profile?.website_url || '');
      setSocials(parseSocialLinks(profile.author_profile?.social_links || '{}'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    loadProfile();
  }, [authLoading, user, router, loadProfile]);

  const completion = useMemo(() => {
    const checks = [displayName, bio, avatarUrl, websiteUrl, socials.facebook || socials.discord || socials.patreon];
    const complete = checks.filter((value) => value && String(value).trim()).length;
    return Math.round((complete / checks.length) * 100);
  }, [avatarUrl, bio, displayName, socials, websiteUrl]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.updateMyProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim(),
        bio: bio.trim(),
        brand_color: brandColor.trim(),
        website_url: websiteUrl.trim(),
        social_links: JSON.stringify(socials),
      });
      await refreshUser();
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Profile</p>
          <h1 className="text-3xl font-bold">Author Profile Settings</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-2xl">
            This information powers your public profile and helps readers decide whether to follow your work.
          </p>
        </div>
        <div className="card px-4 py-3 min-w-[180px]">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Completion</p>
          <p className="text-2xl font-bold">{completion}%</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
          {success && <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{success}</div>}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="profile-display-name" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Display Name</label>
              <input id="profile-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
            </div>
            <div>
              <label htmlFor="profile-avatar-url" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Avatar URL</label>
              <input id="profile-avatar-url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
            </div>
          </div>

          <div>
            <label htmlFor="profile-bio" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Bio</label>
            <textarea id="profile-bio" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500 resize-y" placeholder="Tell readers what kind of stories you write and why they should follow your work." />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="profile-website" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Website</label>
              <input id="profile-website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://your-site.com" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
            </div>
            <div>
              <label htmlFor="profile-brand-color" className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Brand Color</label>
              <div className="flex gap-3">
                <input id="profile-brand-color" type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-12 w-14 rounded-xl border border-[var(--border-color)] bg-transparent p-1" />
                <input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Social Links</p>
            <div className="grid gap-4 md:grid-cols-3">
              <input value={socials.facebook} onChange={(e) => setSocials((prev) => ({ ...prev, facebook: e.target.value }))} placeholder="Facebook URL" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
              <input value={socials.discord} onChange={(e) => setSocials((prev) => ({ ...prev, discord: e.target.value }))} placeholder="Discord invite" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
              <input value={socials.patreon} onChange={(e) => setSocials((prev) => ({ ...prev, patreon: e.target.value }))} placeholder="Patreon / Ko-fi" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] outline-none focus:border-brand-500" />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60 min-w-[160px]">
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>

        <div className="card p-6 h-fit">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Preview</p>
          <div className="rounded-3xl border border-[var(--border-color)] overflow-hidden">
            <div className="h-20" style={{ background: `linear-gradient(135deg, ${brandColor}, rgba(76, 110, 245, 0.15))` }} />
            <div className="px-5 pb-5 -mt-8">
              <div className="w-16 h-16 rounded-2xl border-4 border-[var(--bg-card)] bg-[var(--bg-secondary)] overflow-hidden flex items-center justify-center text-lg font-bold">
                {avatarUrl ? <img src={avatarUrl} alt="Profile preview" className="w-full h-full object-cover" /> : (displayName || user?.username || 'A').slice(0, 1).toUpperCase()}
              </div>
              <h2 className="text-lg font-semibold mt-3">{displayName || user?.username}</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">@{user?.username}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">{bio || 'Your bio preview will appear here.'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}