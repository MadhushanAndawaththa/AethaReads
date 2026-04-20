import Link from 'next/link';
import Image from 'next/image';
import type { Novel } from '@/lib/types';
import { formatNumber, getStatusColor } from '@/lib/utils';

interface NovelCardProps {
  novel: Novel;
  showRating?: boolean;
}

export function NovelCard({ novel, showRating = true }: NovelCardProps) {
  return (
    <Link
      href={`/novel/${novel.slug}`}
      className="card group overflow-hidden hover:border-brand-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-0.5"
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] bg-[var(--bg-secondary)] overflow-hidden">
        {novel.cover_url ? (
          <Image
            src={novel.cover_url}
            alt={novel.title}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-900/30 to-brand-700/20">
            <span className="text-3xl">📖</span>
            <span className="text-[9px] text-[var(--text-muted)] text-center px-2 line-clamp-2 leading-tight">
              {novel.title}
            </span>
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-1.5 left-1.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize backdrop-blur-sm ${getStatusColor(novel.status)}`}>
            {novel.status}
          </span>
        </div>
        {/* Rating badge */}
        {showRating && novel.rating > 0 && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm text-yellow-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            ★ {novel.rating.toFixed(1)}
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-brand-600/0 group-hover:bg-brand-600/5 transition-colors duration-200" />
      </div>

      {/* Info */}
      <div className="p-2.5">
        <h3 className="font-semibold text-xs leading-tight line-clamp-2 mb-1 group-hover:text-brand-500 transition-colors">
          {novel.title}
        </h3>
        <p className="text-[10px] text-[var(--text-muted)] truncate mb-1.5">
          {novel.author}
        </p>
        <div className="flex items-center gap-2 text-[9px] text-[var(--text-muted)]">
          <span className="flex items-center gap-0.5">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {formatNumber(novel.views)}
          </span>
          <span>{novel.chapter_count}ch</span>
        </div>
      </div>
    </Link>
  );
}
