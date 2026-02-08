export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

export function getMessages(locale: Locale) {
  // Dynamic import for locale messages
  return import(`../../messages/${locale}.json`).then((m) => m.default);
}
