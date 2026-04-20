'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';

interface ResumeReadingProps {
  slug: string;
}

export function ResumeReading({ slug }: ResumeReadingProps) {
  const { user } = useAuth();
  const [chapterNum, setChapterNum] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getProgress(slug)
      .then((res) => {
        if (res.progress?.chapter_number) {
          setChapterNum(res.progress.chapter_number);
        }
      })
      .catch(() => {});
  }, [user, slug]);

  if (!user || !chapterNum) return null;

  return (
    <Link
      href={`/novel/${slug}/${chapterNum}`}
      className="btn-secondary inline-flex items-center gap-2 text-sm"
    >
      <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Resume Ch.{chapterNum}
    </Link>
  );
}
