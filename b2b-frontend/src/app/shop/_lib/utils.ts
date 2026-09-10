import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
};

export function formatPrice(price: number | null | undefined, currency: string | null | undefined): string {
  if (price == null) return '';
  const symbol = (currency && CURRENCY_SYMBOLS[currency]) ?? currency ?? '';
  if (currency === 'RUB') {
    return `${price.toLocaleString('ru-RU')} ${symbol}`;
  }
  return `${symbol}${price.toLocaleString('en-US')}`;
}

