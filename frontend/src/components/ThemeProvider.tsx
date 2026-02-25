'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ReadingTheme } from '@/lib/types';

type ThemeContextType = {
  theme: ReadingTheme;
  setTheme: (theme: ReadingTheme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ReadingTheme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('aetha-theme') as ReadingTheme;
    if (stored && ['light', 'dark', 'sepia'].includes(stored)) {
      setThemeState(stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const setTheme = (newTheme: ReadingTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('aetha-theme', newTheme);
  };

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'sepia');
    root.classList.add(theme);
  }, [theme, mounted]);

  if (!mounted) {
    return <div className="dark">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
