import { en, type TranslationKeys } from './en';
import { ja } from './ja';
import { zh } from './zh';

export type Locale = 'en' | 'ja' | 'zh';

export const translations: Record<Locale, TranslationKeys> = {
  en,
  ja,
  zh,
};

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  zh: '中文 (Beta)',
};

export const localeFlags: Record<Locale, string> = {
  en: 'US',
  ja: 'JP',
  zh: 'CN',
};

export function getTranslations(locale: Locale = defaultLocale): TranslationKeys {
  return translations[locale] || translations[defaultLocale];
}

export function t(keyPath: string, locale: Locale = defaultLocale): string {
  const keys = keyPath.split('.');
  let value: unknown = translations[locale];

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      value = translations[defaultLocale];
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return keyPath;
        }
      }
      break;
    }
  }

  return typeof value === 'string' ? value : keyPath;
}

export function formatT(
  keyPath: string,
  params: Record<string, string | number>,
  locale: Locale = defaultLocale
): string {
  let text = t(keyPath, locale);
  Object.entries(params).forEach(([key, value]) => {
    text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  });
  return text;
}

export { en, ja, zh };
export type { TranslationKeys };
