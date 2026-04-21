'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ChapterReadResponse, ReadingSettings, ReadingTheme } from '@/lib/types';
import { getReadingSettingsFromStorage, saveReadingSettings, DEFAULT_READING_SETTINGS } from '@/lib/utils';
import { CommentSection } from './CommentSection';
import { TranslateButton, type TranslationLang } from './TranslateButton';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';
import { sanitizeChapterHtml } from '@/lib/security';

interface ChapterReaderProps {
  data: ChapterReadResponse;
}

const TRANSLATION_STORAGE_KEY = (slug: string) => `aetha-translation-${slug}`;

export function ChapterReader({ data }: ChapterReaderProps) {
  const { chapter, novel_title, novel_slug, prev_chapter, next_chapter, total_chapters } = data;
  const { user } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_READING_SETTINGS);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Translation state ───────────────────────────────────────────────
  const sanitizedContent = sanitizeChapterHtml(chapter.content);
  const [translationLang, setTranslationLang] = useState<TranslationLang>('original');
  const [displayContent, setDisplayContent] = useState(sanitizedContent);
  const [translating, setTranslating] = useState(false);

  // Core translation function — operates on HTML string, stores result in state
  const performTranslation = useCallback(async (
    targetLang: TranslationLang,
    originalHtml: string,
    sourceLang: 'en' | 'si' | 'bilingual',
  ) => {
    if (targetLang === 'original') {
      setDisplayContent(originalHtml);
      setTranslationLang('original');
      return;
    }
    // Same language as source — no translation needed
    if ((sourceLang === 'en' && targetLang === 'en') || (sourceLang === 'si' && targetLang === 'si')) {
      setDisplayContent(originalHtml);
      setTranslationLang(targetLang);
      return;
    }

    setTranslating(true);
    setTranslationLang(targetLang);

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(originalHtml, 'text/html');
      const paragraphs = Array.from(doc.querySelectorAll('p')).filter(p => p.textContent?.trim());
      const apiSourceLang = sourceLang === 'bilingual' ? 'auto' : sourceLang;

      if (paragraphs.length > 0) {
        await Promise.all(
          paragraphs.map(async (p) => {
            const text = p.textContent || '';
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${apiSourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Translation fetch failed');
            const result = await res.json();
            p.textContent = (result[0] as Array<[string]>).map((s) => s[0]).join('');
            if (targetLang === 'si') {
              p.classList.add('sinhala-text');
            } else {
              p.classList.remove('sinhala-text');
            }
          })
        );
        setDisplayContent(sanitizeChapterHtml(doc.body.innerHTML));
      } else {
        // Fallback for plain-text content with no <p> tags
        const fullText = doc.body.textContent || '';
        if (fullText.trim()) {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${apiSourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(fullText)}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Translation fetch failed');
          const result = await res.json();
          const translatedText = (result[0] as Array<[string]>).map((s: [string]) => s[0]).join('');
          const paragraph = doc.createElement('p');
          paragraph.textContent = translatedText;
          if (targetLang === 'si') {
            paragraph.classList.add('sinhala-text');
          }
          doc.body.innerHTML = '';
          doc.body.appendChild(paragraph);
          setDisplayContent(sanitizeChapterHtml(doc.body.innerHTML));
        }
      }
    } catch {
      // Revert to original on failure
      setDisplayContent(originalHtml);
      setTranslationLang('original');
    } finally {
      setTranslating(false);
    }
  }, []);

  // User-facing translate handler — saves preference to localStorage
  const handleTranslate = useCallback(async (targetLang: TranslationLang) => {
    try {
      localStorage.setItem(TRANSLATION_STORAGE_KEY(novel_slug), targetLang);
    } catch {}
    await performTranslation(targetLang, sanitizedContent, data.novel_language);
  }, [novel_slug, sanitizedContent, data.novel_language, performTranslation]);

  // On chapter change: reset display content and auto-apply saved preference
  useEffect(() => {
    if (!mounted) return;
    setDisplayContent(sanitizedContent);
    setTranslationLang('original');
    try {
      const saved = localStorage.getItem(TRANSLATION_STORAGE_KEY(novel_slug)) as TranslationLang | null;
      if (saved && saved !== 'original') {
        performTranslation(saved, sanitizedContent, data.novel_language);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id, mounted]);
  // ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true);
    setSettings(getReadingSettingsFromStorage());
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'sepia');
    root.classList.add(settings.theme);
  }, [settings.theme, mounted]);

  const updateSettings = useCallback((partial: Partial<ReadingSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveReadingSettings(next);
      return next;
    });
  }, []);

  // Auto-hide controls on scroll
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY > lastY && currentY > 100) {
            setShowControls(false);
            setShowSettings(false);
          } else if (currentY < lastY) {
            setShowControls(true);
          }
          lastY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft' && prev_chapter) {
        router.push(`/novel/${novel_slug}/${prev_chapter}`);
      } else if (e.key === 'ArrowRight' && next_chapter) {
        router.push(`/novel/${novel_slug}/${next_chapter}`);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prev_chapter, next_chapter, novel_slug, router]);

  // Reading progress sync — throttled every 30 seconds
  useEffect(() => {
    if (!user || !mounted) return;

    const syncProgress = () => {
      const scrollableHeight = document.body.scrollHeight - window.innerHeight;
      const scrollPosition = scrollableHeight > 0
        ? Math.round((window.scrollY / scrollableHeight) * 100)
        : 100;
      api.updateProgress(novel_slug, chapter.chapter_number, Math.min(scrollPosition, 100)).catch(() => {});
    };

    const handleScroll = () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      progressTimerRef.current = setTimeout(syncProgress, 30_000);
    };

    syncProgress();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, [user, novel_slug, chapter.chapter_number, mounted]);

  const fontClass = settings.fontFamily === 'serif' ? 'font-reading' : 'font-sans';
  const contentLangClass = translationLang === 'si' ? 'sinhala-text' : data.novel_language === 'si' ? 'sinhala-text' : '';

  // Compact language label for top bar
  const langLabel = translationLang === 'si' ? 'සිං' : translationLang === 'en' ? 'EN' : null;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-b border-[var(--border-color)] transition-transform duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between gap-2">
          <Link
            href={`/novel/${novel_slug}`}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-w-0"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="truncate">{novel_title}</span>
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            {/* Active translation badge */}
            {langLabel && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400 ${translationLang === 'si' ? 'sinhala-text' : ''}`}>
                {langLabel}
              </span>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label="Reading settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          className={`fixed top-12 right-0 z-40 w-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-bl-xl shadow-2xl p-4 slide-in-right`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">Reading Settings</p>

          {/* Theme */}
          <div className="mb-4">
            <p className="text-xs text-[var(--text-secondary)] mb-2">Theme</p>
            <div className="flex gap-2">
              {(['light', 'dark', 'sepia'] as ReadingTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => updateSettings({ theme: t })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                    settings.theme === t
                      ? 'bg-brand-600 text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--text-secondary)]">Font Size</p>
              <span className="text-xs text-[var(--text-muted)]">{settings.fontSize}px</span>
            </div>
            <input
              type="range"
              min={14}
              max={28}
              step={1}
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Line Height */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--text-secondary)]">Line Height</p>
              <span className="text-xs text-[var(--text-muted)]">{settings.lineHeight.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={1.2}
              max={2.4}
              step={0.1}
              value={settings.lineHeight}
              onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Font Family */}
          <div className="mb-4">
            <p className="text-xs text-[var(--text-secondary)] mb-2">Font</p>
            <div className="flex gap-2">
              <button
                onClick={() => updateSettings({ fontFamily: 'serif' })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all font-reading ${
                  settings.fontFamily === 'serif'
                    ? 'bg-brand-600 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                Serif
              </button>
              <button
                onClick={() => updateSettings({ fontFamily: 'sans' })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all font-sans ${
                  settings.fontFamily === 'sans'
                    ? 'bg-brand-600 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                Sans
              </button>
            </div>
          </div>

          {/* Max Width */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--text-secondary)]">Max Width</p>
              <span className="text-xs text-[var(--text-muted)]">{settings.maxWidth}px</span>
            </div>
            <input
              type="range"
              min={500}
              max={1000}
              step={20}
              value={settings.maxWidth}
              onChange={(e) => updateSettings({ maxWidth: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Translation */}
          <div className="pt-3 border-t border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-secondary)] mb-2">Translate</p>
            <div className="flex flex-wrap gap-1.5">
              {(['original', 'en', 'si'] as TranslationLang[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => { handleTranslate(lang); }}
                  disabled={translating || translationLang === lang}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${lang === 'si' ? 'sinhala-text' : ''} ${
                    translationLang === lang
                      ? 'bg-brand-600 text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
                  } disabled:opacity-50`}
                >
                  {lang === 'original' ? 'Original' : lang === 'si' ? 'සිංහල' : 'English'}
                </button>
              ))}
              {translating && (
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-brand-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chapter Content */}
      <article
        className="mx-auto px-4 pt-20 pb-24"
        style={{ maxWidth: `${settings.maxWidth}px` }}
        onClick={() => {
          setShowControls((prev) => !prev);
          setShowSettings(false);
        }}
      >
        {/* Chapter heading */}
        <header className="mb-6 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-2">
            Chapter {chapter.chapter_number} of {total_chapters}
          </p>
          <h1 className="text-xl md:text-2xl font-bold mb-2">
            {chapter.title || `Chapter ${chapter.chapter_number}`}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            {chapter.word_count} words
          </p>
          {/* Inline translation selector — always visible at top of chapter */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 border-t border-[var(--border-color)]" onClick={(e) => e.stopPropagation()}>
            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {(['original', 'en', 'si'] as TranslationLang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => handleTranslate(lang)}
                disabled={translating || translationLang === lang}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${lang === 'si' ? 'sinhala-text' : ''} ${
                  translationLang === lang
                    ? 'bg-brand-600 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                } disabled:opacity-50`}
              >
                {lang === 'original' ? 'Original' : lang === 'si' ? 'සිංහල' : 'English'}
              </button>
            ))}
            {translating && <div className="animate-spin rounded-full h-3 w-3 border-b border-brand-500" />}
          </div>
        </header>

        {/* Content — rendered from state so React re-renders never revert translation */}
        <div
          id="chapter-content"
          lang={translationLang === 'si' || (translationLang === 'original' && data.novel_language === 'si') ? 'si' : 'en'}
          className={`reader-content ${fontClass} ${contentLangClass}`}
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
          }}
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />

        {/* Translation controls at bottom too for convenience */}
        <TranslateButton
          currentLang={translationLang}
          translating={translating}
          sourceLanguage={data.novel_language}
          onTranslate={handleTranslate}
        />

        {/* End of chapter nav */}
        <div className="mt-12 border-t border-[var(--border-color)] pt-8">
          <div className="flex items-center gap-3">
            {prev_chapter ? (
              <Link
                href={`/novel/${novel_slug}/${prev_chapter}`}
                className="btn-secondary flex-1 text-center text-sm"
              >
                ← Previous
              </Link>
            ) : (
              <div className="flex-1" />
            )}

            <Link
              href={`/novel/${novel_slug}`}
              className="px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label="Chapter list"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </Link>

            {next_chapter ? (
              <Link
                href={`/novel/${novel_slug}/${next_chapter}`}
                className="btn-primary flex-1 text-center text-sm"
              >
                Next →
              </Link>
            ) : (
              <div className="flex-1 text-center text-sm text-[var(--text-muted)] py-2">
                You&apos;re caught up!
              </div>
            )}
          </div>
        </div>

        {/* Comments toggle */}
        <div className="mt-8 border-t border-[var(--border-color)] pt-4">
          <button
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {showComments ? 'Hide Comments' : 'Show Comments'}
          </button>
          {showComments && (
            <CommentSection chapterId={chapter.id} />
          )}
        </div>
      </article>

      {/* Bottom floating nav (mobile) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--bg-primary)]/90 backdrop-blur-xl border-t border-[var(--border-color)] transition-transform duration-300 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center h-14 px-2">
          {prev_chapter ? (
            <Link
              href={`/novel/${novel_slug}/${prev_chapter}`}
              className="flex-1 flex items-center justify-center gap-1 text-sm text-[var(--text-secondary)] active:text-brand-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          <Link
            href={`/novel/${novel_slug}`}
            className="flex items-center justify-center px-4 text-sm text-[var(--text-muted)]"
          >
            {chapter.chapter_number} / {total_chapters}
          </Link>

          {next_chapter ? (
            <Link
              href={`/novel/${novel_slug}/${next_chapter}`}
              className="flex-1 flex items-center justify-center gap-1 text-sm text-brand-500 font-medium active:text-brand-400"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </div>
    </div>
  );
}
