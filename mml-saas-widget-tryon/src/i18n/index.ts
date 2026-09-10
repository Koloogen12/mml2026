import { en } from './locales/en';
import { ru } from './locales/ru';

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;

let current: Translations = en;
let currentLang: 'ru' | 'en' = 'en';

export function initLocale(language: string): void {
  if (language === 'auto') {
    const browserLang = navigator.language?.slice(0, 2);
    language = browserLang === 'ru' ? 'ru' : 'en';
  }
  currentLang = language === 'ru' ? 'ru' : 'en';
  current = currentLang === 'ru' ? ru : en;
}

export function getLocale(): 'ru' | 'en' {
  return currentLang;
}

export function t(key: TranslationKey): string {
  return current[key] ?? en[key] ?? key;
}
