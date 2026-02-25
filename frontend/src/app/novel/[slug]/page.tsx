import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import { SITE_NAME, SITE_URL, formatNumber, formatDate, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import type { Metadata } from 'next';

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

  // JSON-LD structured data for SEO
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
            <div className="aspect-[3/4] bg-[var(--bg-secondary)] rounded-lg overflow-hidden border border-[var(--border-color)] flex items-center justify-center text-5xl">
              📖
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold mb-2 leading-tight">{novel.title}</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-3">by {novel.author}</p>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${getStatusColor(novel.status)}`}>
                {novel.status}
              </span>
              {novel.genres?.map((genre) => (
                <Link
                  key={genre.id}
                  href={`/browse?genre=${genre.slug}`}
                  className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-brand-500 transition-colors"
                >
                  {genre.name}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
              <span>📖 {novel.chapter_count} Chapters</span>
              <span>👁 {formatNumber(novel.views)} Views</span>
              {novel.rating > 0 && <span>⭐ {novel.rating.toFixed(1)}</span>}
            </div>

            {/* Start reading button */}
            {chapters.length > 0 && (
              <Link
                href={`/novel/${slug}/${chapters[0].chapter_number}`}
                className="btn-primary inline-flex items-center gap-2 mt-4 text-sm"
              >
                Start Reading
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {/* Description */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Synopsis</h2>
          <div className="card p-4 md:p-6">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
              {novel.description}
            </p>
          </div>
        </section>

        {/* Chapter List */}
        <section>
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
                      <span className="text-[var(--text-muted)]">Ch. {chapter.chapter_number}</span>
                      {chapter.title && (
                        <span className="ml-2">{chapter.title}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] shrink-0 ml-2">
                    <span>{chapter.word_count} words</span>
                    <span className="hidden sm:inline">{formatDate(chapter.created_at)}</span>
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-[var(--text-muted)]">
                No chapters yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
