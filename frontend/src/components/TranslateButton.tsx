'use client';

import { useState, useCallback } from 'react';

type TranslationLang = 'original' | 'si' | 'en';

interface TranslateButtonProps {
  targetElementId: string;
}

export function TranslateButton({ targetElementId }: TranslateButtonProps) {
  const [currentLang, setCurrentLang] = useState<TranslationLang>('original');
  const [translating, setTranslating] = useState(false);
  const [originalContent, setOriginalContent] = useState<string | null>(null);

  const translateContent = useCallback(async (targetLang: TranslationLang) => {
    const el = document.getElementById(targetElementId);
    if (!el) return;

    if (targetLang === 'original') {
      if (originalContent !== null) {
        el.innerHTML = originalContent;
      }
      setCurrentLang('original');
      return;
    }

    setTranslating(true);

    // Save original content on first translation
    if (originalContent === null) {
      setOriginalContent(el.innerHTML);
    }

    try {
      // Get the text content, preserving paragraph structure
      const paragraphs = el.querySelectorAll('p');
      const textBlocks: string[] = [];

      if (paragraphs.length > 0) {
        paragraphs.forEach((p) => textBlocks.push(p.textContent || ''));
      } else {
        // Fallback: split by double newlines
        textBlocks.push(el.textContent || '');
      }

      // Use Google Translate free API (for prototype — production should use official API)
      const translated = await Promise.all(
        textBlocks.filter(t => t.trim()).map(async (text) => {
          const sourceLang = targetLang === 'si' ? 'en' : 'si';
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Translation failed');
          const data = await res.json();
          // Google translate returns nested arrays: [[["translated","original",null,null,...]]]
          return (data[0] as Array<[string]>).map((s: [string]) => s[0]).join('');
        })
      );

      // Replace content with translation
      if (paragraphs.length > 0) {
        let idx = 0;
        paragraphs.forEach((p) => {
          if (p.textContent?.trim()) {
            p.textContent = translated[idx] || p.textContent;
            if (targetLang === 'si') {
              p.classList.add('sinhala-text');
            } else {
              p.classList.remove('sinhala-text');
            }
            idx++;
          }
        });
      } else {
        el.textContent = translated.join('\n\n');
        if (targetLang === 'si') {
          el.classList.add('sinhala-text');
        }
      }

      setCurrentLang(targetLang);
    } catch {
      // Translation failed — keep current content
    } finally {
      setTranslating(false);
    }
  }, [targetElementId, originalContent]);

  return (
    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[var(--border-color)]">
      <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <span className="text-xs text-[var(--text-muted)] mr-1">Translate:</span>
      <button
        onClick={() => translateContent('original')}
        disabled={translating || currentLang === 'original'}
        className={`text-xs px-2.5 py-1 rounded-md transition-colors touch-compact ${
          currentLang === 'original'
            ? 'bg-brand-600 text-white'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
        } disabled:opacity-50`}
      >
        Original
      </button>
      <button
        onClick={() => translateContent('si')}
        disabled={translating || currentLang === 'si'}
        className={`text-xs px-2.5 py-1 rounded-md transition-colors sinhala-text touch-compact ${
          currentLang === 'si'
            ? 'bg-brand-600 text-white'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
        } disabled:opacity-50`}
      >
        සිංහල
      </button>
      <button
        onClick={() => translateContent('en')}
        disabled={translating || currentLang === 'en'}
        className={`text-xs px-2.5 py-1 rounded-md transition-colors touch-compact ${
          currentLang === 'en'
            ? 'bg-brand-600 text-white'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
        } disabled:opacity-50`}
      >
        English
      </button>
      {translating && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-brand-500" />
          Translating...
        </div>
      )}
    </div>
  );
}
