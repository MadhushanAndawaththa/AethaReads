import type { Metadata, Viewport } from 'next';
import { SITE_NAME } from '@/lib/utils';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - Read & Write Web Novels`,
    template: `%s | ${SITE_NAME}`,
  },
  description: 'Read and write web novels, light novels, and web fiction in English and Sinhala. A community for readers and authors with a clean, fast experience.',
  keywords: ['web novel', 'light novel', 'read online', 'web fiction', 'novel reader', 'write novels', 'sinhala novels', 'sinhala web fiction', 'aetha reads'],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Read & Write Web Novels`,
    description: 'Read and write web novels with a clean, fast community experience.',
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
          <AuthProvider>
            <Header />
            <main className="flex-1 pb-16 md:pb-0">
              {children}
            </main>
            <BottomNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
