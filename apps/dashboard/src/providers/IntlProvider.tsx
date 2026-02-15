'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { type Locale, defaultLocale, locales } from '@/i18n/config';

interface IntlContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const IntlContext = createContext<IntlContextValue | null>(null);

const STORAGE_KEY = 'mktengine_locale';

function detectLocale(): Locale {
  // Check localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locales.includes(stored as Locale)) {
      return stored as Locale;
    }
    // Check browser language
    const browserLang = navigator.language.slice(0, 2);
    if (locales.includes(browserLang as Locale)) {
      return browserLang as Locale;
    }
  }
  return defaultLocale;
}

export function IntlProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null);

  const loadMessages = useCallback(async (loc: Locale) => {
    const msgs = await import(`../../messages/${loc}.json`);
    setMessages(msgs.default);
  }, []);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
      loadMessages(newLocale);
    },
    [loadMessages],
  );

  useEffect(() => {
    const detected = detectLocale();
    setLocaleState(detected);
    loadMessages(detected);
  }, [loadMessages]);

  if (!messages) {
    return null; // Wait for messages to load
  }

  return (
    <IntlContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="Africa/Dakar"
        formats={{
          dateTime: {
            medium: { day: 'numeric', month: 'short', year: 'numeric' },
            short: { day: '2-digit', month: '2-digit', year: 'numeric' },
          },
          number: {
            currency: { style: 'currency', currency: 'XOF' },
            percent: { style: 'percent', maximumFractionDigits: 1 },
          },
        }}
      >
        {children}
      </NextIntlClientProvider>
    </IntlContext.Provider>
  );
}

export function useLocale(): IntlContextValue {
  const context = useContext(IntlContext);
  if (!context) {
    throw new Error('useLocale must be used within an IntlProvider');
  }
  return context;
}
