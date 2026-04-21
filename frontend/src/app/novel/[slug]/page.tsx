import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import { SITE_NAME, SITE_URL, formatNumber, formatDate, getLanguageLabel, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { FollowButton } from '@/components/FollowButton';
import { ReviewSection } from '@/components/ReviewSection';
import { ResumeReading } from '@/components/ResumeReading';

interface NovelPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NovelPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await api.getNovelBySlug(slug);
    const novel = data.novel;
    return {
      title: `${novel.title} - Read Online`,
      description: novel.description?.slice(0, 160) || `Read ${novel.title} by ${novel.author} online.`,
      openGraph: {
        title: `${novel.title} | ${SITE_NAME}`,
        description: novel.description?.slice(0, 160),
        type: 'article',
        url: `${SITE_URL}/novel/${slug}`,
        images: novel.cover_url ? [{ url: novel.cover_url }] : [],
      },
    };
  } catch {
    return { title: 'Novel Not Found' };
  }
}

export const revalidate = 300; // ISR: 5 minutes

export default async function NovelPage({ params }: NovelPageProps) {
  const { slug } = await params;

  let data;
  try {
    data = await api.getNovelBySlug(slug);
  } catch {
    notFound();
  }

  const { novel, chapters } = data;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: novel.title,
    author: {
      '@type': 'Person',
      name: novel.author,
    },
    description: novel.description,
    genre: novel.genres?.map((g) => g.name) || [],
    url: `${SITE_URL}/novel/${slug}`,
    numberOfPages: novel.chapter_count,
    bookFormat: 'EBook',
    ...(novel.cover_url ? { image: novel.cover_url } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-6">
          <Link href="/" className="hover:text-brand-500">Home</Link>
          <span>/</span>
          <Link href="/browse" className="hover:text-brand-500">Browse</Link>
          <span>/</span>
          <span className="text-[var(--text-primary)] truncate">{novel.title}</span>
        </nav>

        {/* Novel Header */}
        <div className="flex gap-4 md:gap-6 mb-8">
          {/* Cover */}
          <div className="w-28 md:w-40 shrink-0">
            <div className="aspect-[3/4] bg-[var(--bg-secondary)] rounded-xl overflow-hidden border border-[var(--border-color)] shadow-lg">
              {novel.cover_url ? (
                <div className="relative w-full h-full">
                  <Image
                    src={novel.cover_url}
                    alt={novel.title}
                    fill
                    sizes="160px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${novel.language === 'en' ? 'from-purple-900/30 to-purple-700/20' : 'from-brand-900/30 to-brand-700/20'} text-[var(--text-muted)]`}>
                  <span className="text-4xl">📖</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold mb-1.5 leading-tight">{novel.title}</h1>
            <Link
              href={`/user/${novel.author}`}
              className="text-sm text-[var(--text-secondary)] hover:text-brand-500 mb-3 inline-block"
            >
              by {novel.author}
            </Link>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${getStatusColor(novel.status)}`}>
                {novel.status}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-500 ${novel.language === 'si' ? 'sinhala-text' : ''}`}>
                {getLanguageLabel(novel.language)}
              </span>
              {novel.genres?.map((genre) => (
                <Link
                  key={genre.id}
                  href={`/browse?genre=${genre.slug}`}
                  className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-brand-500 hover:bg-brand-500/10 transition-colors border border-[var(--border-color)]"
                >
                  {genre.name}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)] mb-4">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {novel.chapter_count} Chapters
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {formatNumber(novel.views)} Views
              </span>
              {novel.follower_count > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {formatNumber(novel.follower_count)} Followers
                </span>
              )}
              {novel.rating > 0 && (
                <span className="flex items-center gap-1 text-yellow-500">
                  ★ {novel.rating.toFixed(1)}
                </span>
              )}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-2">
              {chapters.length > 0 && (
                <Link
                  href={`/novel/${slug}/${chapters[0].chapter_number}`}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  Start Reading
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              )}
              <FollowButton slug={slug} followerCount={novel.follower_count} />
              <ResumeReading slug={slug} />
            </div>
          </div>
        </div>

        {/* Description */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Synopsis</h2>
          <div className="card p-4 md:p-5">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
              {novel.description || 'No description available.'}
            </p>
          </div>
        </section>

        {/* Chapter List */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Chapters ({chapters.length})
          </h2>
          <div className="card divide-y divide-[var(--border-color)]">
            {chapters.length > 0 ? (
              chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/novel/${slug}/${chapter.chapter_number}`}
                  className="flex items-center justify-between p-3 md:p-4 hover:bg-[var(--bg-secondary)] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-brand-500 transition-colors">
                      <span className="text-[var(--text-muted)]">Ch.{chapter.chapter_number}</span>
                      {chapter.title && (
                        <span className="ml-2">{chapter.title}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] shrink-0 ml-2">
                    <span>{chapter.word_count.toLocaleString()}w</span>
                    <span className="hidden sm:inline">{formatDate(chapter.created_at)}</span>
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-[var(--text-muted)] text-sm">
                No chapters published yet.
              </div>
            )}
          </div>
        </section>

        {/* Reviews */}
        <ReviewSection slug={slug} />
      </div>
    </>
  );
}
