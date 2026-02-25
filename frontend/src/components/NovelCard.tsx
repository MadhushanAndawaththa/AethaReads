import Link from 'next/link';
import type { Novel } from '@/lib/types';
import { formatNumber, getStatusColor } from '@/lib/utils';

interface NovelCardProps {
  novel: Novel;
}

export function NovelCard({ novel }: NovelCardProps) {
  return (
    <Link
      href={`/novel/${novel.slug}`}
      className="card group overflow-hidden hover:border-brand-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/5"
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">
          📖
        </div>
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getStatusColor(novel.status)}`}>
            {novel.status}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-brand-500 transition-colors">
          {novel.title}
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          {novel.author}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {formatNumber(novel.views)}
          </span>
          <span>{novel.chapter_count} ch.</span>
        </div>
      </div>
    </Link>
  );
}
