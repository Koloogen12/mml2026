import { en } from './locales/en';
import { ru } from './locales/ru';

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;

let current: Translations = en;

export function initLocale(language: string): void {
  if (language === 'auto') {
    const browserLang = navigator.language?.slice(0, 2);
    language = browserLang === 'ru' ? 'ru' : 'en';
  }
  current = language === 'ru' ? ru : en;
}

export function t(key: TranslationKey): string {
  return current[key] ?? en[key] ?? key;
}
