import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import { SITE_NAME, SITE_URL } from '@/lib/utils';
import type { Metadata } from 'next';
import { ChapterReader } from '@/components/ChapterReader';

interface ChapterPageProps {
  params: Promise<{ slug: string; number: string }>;
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { slug, number } = await params;
  try {
    const data = await api.getChapter(slug, Number(number));
    return {
      title: `Chapter ${number}: ${data.chapter.title} - ${data.novel_title}`,
      description: `Read Chapter ${number} of ${data.novel_title}. ${data.chapter.word_count} words.`,
      openGraph: {
        title: `${data.novel_title} - Chapter ${number} | ${SITE_NAME}`,
        description: `Read Chapter ${number}: ${data.chapter.title}`,
        type: 'article',
        url: `${SITE_URL}/novel/${slug}/${number}`,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch {
    return { title: 'Chapter Not Found' };
  }
}

export const revalidate = 3600; // ISR: 1 hour for chapters

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { slug, number } = await params;
  const chapterNum = Number(number);

  if (isNaN(chapterNum) || chapterNum < 1) {
    notFound();
  }

  let data;
  try {
    data = await api.getChapter(slug, chapterNum);
  } catch {
    notFound();
  }

  // JSON-LD for chapter
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Chapter',
    name: `Chapter ${chapterNum}: ${data.chapter.title}`,
    isPartOf: {
      '@type': 'Book',
      name: data.novel_title,
      url: `${SITE_URL}/novel/${slug}`,
    },
    position: chapterNum,
    wordCount: data.chapter.word_count,
    url: `${SITE_URL}/novel/${slug}/${chapterNum}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ChapterReader data={data} />
    </>
  );
}
