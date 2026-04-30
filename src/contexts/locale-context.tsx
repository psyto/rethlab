'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { type Locale, defaultLocale, t as translate, formatT as formatTranslate } from '@/lib/i18n';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (keyPath: string) => string;
  formatT: (keyPath: string, params: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Always start with defaultLocale to match server render
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Sync from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem('rethlab-locale') as Locale;
    if (saved && ['en', 'ja'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('rethlab-locale', newLocale);
  }, []);

  const t = useCallback((keyPath: string) => translate(keyPath, locale), [locale]);
  const formatT = useCallback(
    (keyPath: string, params: Record<string, string | number>) => formatTranslate(keyPath, params, locale),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, formatT }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within LocaleProvider');
  return context;
}
