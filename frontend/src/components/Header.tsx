'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SITE_NAME } from '@/lib/utils';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';
import { SearchModal } from './SearchModal';

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, loading: authLoading, logout } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
            {user && (
              <Link
                href="/dashboard"
                className={`hover:text-brand-500 transition-colors ${pathname.startsWith('/dashboard') ? 'text-brand-500 font-semibold' : 'text-[var(--text-secondary)]'}`}
              >
                Dashboard
              </Link>
            )}
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

            {/* Auth */}
            {!authLoading && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {user.display_name[0]?.toUpperCase()}
                      </div>
                    )}
                  </button>
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 py-1">
                        <div className="px-4 py-2 border-b border-[var(--border-color)]">
                          <p className="font-medium text-sm truncate">{user.display_name}</p>
                          <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                        </div>
                        <Link href="/dashboard" className="block px-4 py-2 text-sm hover:bg-white/5" onClick={() => setShowUserMenu(false)}>
                          Dashboard
                        </Link>
                        <button
                          onClick={async () => { setShowUserMenu(false); await logout(); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5"
                        >
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition"
                >
                  Sign In
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </>
  );
}
