import type { ReadingSettings } from './types';

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  theme: 'dark',
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif',
  maxWidth: 720,
};

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Aetha';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ongoing': return 'text-green-500 bg-green-500/10';
    case 'completed': return 'text-blue-500 bg-blue-500/10';
    case 'hiatus': return 'text-yellow-500 bg-yellow-500/10';
    default: return 'text-gray-500 bg-gray-500/10';
  }
}

export function getReadingSettingsFromStorage(): ReadingSettings {
  if (typeof window === 'undefined') return DEFAULT_READING_SETTINGS;
  try {
    const stored = localStorage.getItem('aetha-reading-settings');
    if (stored) return { ...DEFAULT_READING_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_READING_SETTINGS;
}

export function saveReadingSettings(settings: ReadingSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('aetha-reading-settings', JSON.stringify(settings));
  } catch {}
}
