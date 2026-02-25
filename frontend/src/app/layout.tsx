import type { Metadata, Viewport } from 'next';
import { SITE_NAME } from '@/lib/utils';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - Read Web Novels Online`,
    template: `%s | ${SITE_NAME}`,
  },
  description: 'Read the latest web novels, light novels, and web fiction. Thousands of chapters updated daily with a clean, fast reading experience.',
  keywords: ['web novel', 'light novel', 'read online', 'web fiction', 'novel reader'],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Read Web Novels Online`,
    description: 'Read the latest web novels with a clean, fast reading experience.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f17' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans min-h-screen flex flex-col">
        <ThemeProvider>
          <Header />
          <main className="flex-1 pb-16 md:pb-0">
            {children}
          </main>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
