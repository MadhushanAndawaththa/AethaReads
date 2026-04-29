'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/components/AuthProvider';

const NAV_ITEMS = [
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/audit', label: 'Audit Log' },
  { href: '/admin/health', label: 'Health' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (user.role !== 'admin') {
      router.replace('/');
    }
  }, [loading, router, user]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="card p-4 h-fit lg:sticky lg:top-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Admin</p>
        <h2 className="text-lg font-semibold mb-4">Moderation Console</h2>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`block rounded-xl px-3 py-2.5 text-sm ${active ? 'bg-brand-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}