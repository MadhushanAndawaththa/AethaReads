'use client';

export type TranslationLang = 'original' | 'si' | 'en';

interface TranslateButtonProps {
  currentLang: TranslationLang;
  translating: boolean;
  sourceLanguage: 'en' | 'si' | 'bilingual';
  onTranslate: (lang: TranslationLang) => void;
}

export function TranslateButton({ currentLang, translating, sourceLanguage, onTranslate }: TranslateButtonProps) {
  const showSinhala = sourceLanguage !== 'si';
  const showEnglish = sourceLanguage !== 'en';

  return (
    <div className="flex flex-wrap items-center gap-2 mt-8 pt-4 border-t border-[var(--border-color)]">
      <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <span className="text-xs text-[var(--text-muted)]">Translate:</span>
      <button
        onClick={() => onTranslate('original')}
        disabled={translating || currentLang === 'original'}
        className={`text-xs px-2.5 py-1 rounded-md transition-colors touch-compact ${
          currentLang === 'original'
            ? 'bg-brand-600 text-white'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
        } disabled:opacity-50`}
      >
        Original
      </button>
      {showSinhala && (
        <button
          onClick={() => onTranslate('si')}
          disabled={translating || currentLang === 'si'}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors sinhala-text touch-compact ${
            currentLang === 'si'
              ? 'bg-brand-600 text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          } disabled:opacity-50`}
        >
          සිංහල
        </button>
      )}
      {showEnglish && (
        <button
          onClick={() => onTranslate('en')}
          disabled={translating || currentLang === 'en'}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors touch-compact ${
            currentLang === 'en'
              ? 'bg-brand-600 text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          } disabled:opacity-50`}
        >
          English
        </button>
      )}
      {translating && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-brand-500" />
          Translating…
        </div>
      )}
    </div>
  );
}
