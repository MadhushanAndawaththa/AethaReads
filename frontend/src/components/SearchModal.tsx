'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Novel } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

interface SearchModalProps {
  onClose: () => void;
}

export function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(query);
        setResults(res.data || []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-[100] fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative max-w-xl mx-auto mt-20 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card p-4 shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
            <svg className="w-5 h-5 text-[var(--text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search novels..."
              className="flex-1 bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            <button
              onClick={onClose}
              className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-1 rounded"
            >
              ESC
            </button>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto mt-3">
            {loading && (
              <div className="text-center py-8 text-[var(--text-muted)]">
                Searching...
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-[var(--text-muted)]">
                No novels found for &ldquo;{query}&rdquo;
              </div>
            )}

            {!loading && results.length > 0 && (
              <ul className="space-y-1">
                {results.map((novel) => (
                  <li key={novel.id}>
                    <Link
                      href={`/novel/${novel.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <div className="w-10 h-14 bg-[var(--bg-secondary)] rounded shrink-0 flex items-center justify-center text-xs text-[var(--text-muted)]">
                        📖
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{novel.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {novel.author} · {formatNumber(novel.views)} views · {novel.chapter_count} ch.
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {!loading && query.length < 2 && (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
