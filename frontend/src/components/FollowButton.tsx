'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface FollowButtonProps {
  slug: string;
  initialFollowing?: boolean;
  followerCount?: number;
  className?: string;
}

export function FollowButton({ slug, initialFollowing = false, followerCount = 0, className = '' }: FollowButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(followerCount);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || checked) return;
    api.checkFollowing(slug)
      .then((res) => { setFollowing(res.following); setChecked(true); })
      .catch(() => setChecked(true));
  }, [user, slug, checked]);

  const handleClick = async () => {
    if (!user) { router.push('/auth/login'); return; }
    setLoading(true);
    try {
      if (following) {
        await api.unfollowNovel(slug);
        setFollowing(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        await api.followNovel(slug);
        setFollowing(true);
        setCount((c) => c + 1);
      }
    } catch {
      // silently fail — follow state stays unchanged
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 active:scale-[0.97] disabled:opacity-60 ${
        following
          ? 'bg-brand-600/20 text-brand-400 hover:bg-red-500/10 hover:text-red-400 border border-brand-500/30 hover:border-red-500/30'
          : 'btn-primary'
      } ${className}`}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : following ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Following
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Follow
        </>
      )}
      {count > 0 && (
        <span className="text-xs opacity-70">{count.toLocaleString()}</span>
      )}
    </button>
  );
}
