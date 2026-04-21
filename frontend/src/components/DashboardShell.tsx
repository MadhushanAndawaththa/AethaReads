'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { useAuth } from './AuthProvider';

interface DashboardShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/novel/new', label: 'New Novel' },
  { href: '/dashboard/profile', label: 'Profile' },
];

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading || !user || user.role === 'reader') {
    return <>{children}</>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-6">
      <aside className="mb-6 md:mb-0">
        <div className="card p-4 md:sticky md:top-6">
          <div className="mb-4 pb-4 border-b border-[var(--border-color)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Creator Studio</p>
            <h2 className="text-lg font-semibold leading-tight">{user.display_name || user.username}</h2>
            <p className="text-sm text-[var(--text-muted)]">Manage novels, chapters, and your public profile.</p>
          </div>

          <nav aria-label="Dashboard navigation" className="flex gap-2 overflow-x-auto md:block md:space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors md:block ${
                    active
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-600/10 via-brand-500/5 to-transparent p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Quick Tip</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Strong covers, a clear hook, language metadata, and consistent chapter releases improve discovery more than adding extra features.
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}