/**
 * Date formatting utilities for consistent date display across the app.
 * All public helpers accept an optional `locale` ('en' | 'ru') that
 * defaults to 'en' so existing call-sites keep working until migrated.
 */

type AppLocale = 'en' | 'ru';

function toDateLocale(locale: AppLocale): string {
  return locale === 'ru' ? 'ru-RU' : 'en-US';
}

/**
 * Format date as "Jan 15, 2024" / "15 янв. 2024 г."
 */
export function formatDate(date: string | Date, locale: AppLocale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(toDateLocale(locale), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date with full month name: "January 15, 2024" / "15 января 2024 г."
 */
export function formatDateLong(date: string | Date, locale: AppLocale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(toDateLocale(locale), {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date with time: "Jan 15, 2024 at 3:45 PM" / "15 янв. 2024 г., 15:45"
 */
export function formatDateTime(date: string | Date, locale: AppLocale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const datePart = d.toLocaleDateString(toDateLocale(locale), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timePart = d.toLocaleTimeString(toDateLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale !== 'ru',
  });

  if (locale === 'ru') {
    return `${datePart}, ${timePart}`;
  }
  return `${datePart} at ${timePart}`;
}

/**
 * Format relative time: "2 hours ago" / "2 часа назад", etc.
 */
export function formatRelativeTime(date: string | Date, locale: AppLocale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (locale === 'ru') {
    if (diffSec < 60) return 'только что';
    if (diffMin < 60) return `${diffMin} ${pluralRu(diffMin, 'минуту', 'минуты', 'минут')} назад`;
    if (diffHour < 24) return `${diffHour} ${pluralRu(diffHour, 'час', 'часа', 'часов')} назад`;
    if (diffDay < 7) return `${diffDay} ${pluralRu(diffDay, 'день', 'дня', 'дней')} назад`;
    if (diffWeek < 4) return `${diffWeek} ${pluralRu(diffWeek, 'неделю', 'недели', 'недель')} назад`;
    if (diffMonth < 12) return `${diffMonth} ${pluralRu(diffMonth, 'месяц', 'месяца', 'месяцев')} назад`;
    return `${diffYear} ${pluralRu(diffYear, 'год', 'года', 'лет')} назад`;
  }

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  if (diffWeek < 4) return `${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'} ago`;
  if (diffMonth < 12) return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
  return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
}

/** Russian pluralisation: 1 день, 2 дня, 5 дней */
function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/**
 * Format date for ISO string (useful for API requests)
 */
export function toISOString(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Check if date is today
 */
export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is in the past
 */
export function isPast(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() < Date.now();
}
