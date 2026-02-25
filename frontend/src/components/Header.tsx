'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { SITE_NAME } from '@/lib/utils';
import { useTheme } from './ThemeProvider';
import { SearchModal } from './SearchModal';

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hide header on chapter reading pages
  const isReading = /^\/novel\/[^/]+\/\d+/.test(pathname);
  if (isReading) return null;

  const themeIcon = theme === 'dark' ? '☀️' : theme === 'sepia' ? '🌙' : '🌑';
  const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'sepia' : 'dark';

  return (
    <>
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-brand-500">⟐</span>
            <span>{SITE_NAME}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/"
              className={`hover:text-brand-500 transition-colors ${pathname === '/' ? 'text-brand-500 font-semibold' : 'text-[var(--text-secondary)]'}`}
            >
              Home
            </Link>
            <Link
              href="/browse"
              className={`hover:text-brand-500 transition-colors ${pathname.startsWith('/browse') ? 'text-brand-500 font-semibold' : 'text-[var(--text-secondary)]'}`}
            >
              Browse
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <button
              onClick={() => setTheme(nextTheme)}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-lg"
              aria-label="Toggle theme"
            >
              {themeIcon}
            </button>
          </div>
        </div>
      </header>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </>
  );
}
