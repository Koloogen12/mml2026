import { en, type TranslationKey } from './en';
import { ru } from './ru';
import type { Locale } from '../locale';

const locales: Record<Locale, Record<TranslationKey, string>> = { en, ru };

export function t(locale: Locale, key: TranslationKey): string {
  return locales[locale]?.[key] ?? en[key] ?? key;
}

export type { TranslationKey };
