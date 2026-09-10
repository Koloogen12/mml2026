import { useParams } from 'react-router-dom';

export type Locale = 'en' | 'ru';

export function useLocale(): Locale {
  const { locale } = useParams<{ locale: string }>();
  return locale === 'ru' ? 'ru' : 'en';
}

/** Prepend current locale to an absolute path: lp('/projects') → '/en/projects' */
export function useLocalePath() {
  const locale = useLocale();
  return (path: string) => `/${locale}${path}`;
}

export function detectLocale(): Locale {
  const browserLang = navigator.language?.slice(0, 2);
  return browserLang === 'ru' ? 'ru' : 'en';
}
