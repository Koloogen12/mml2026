import type { TranslationKey } from '@/shared/lib/i18n';

export interface CountryOption {
  value: string;
  labelKey: TranslationKey;
}

export const COUNTRIES: CountryOption[] = [
  { value: 'ru', labelKey: 'profile.countryRU' },
  { value: 'us', labelKey: 'profile.countryUS' },
  { value: 'uk', labelKey: 'profile.countryUK' },
  { value: 'ca', labelKey: 'profile.countryCA' },
  { value: 'de', labelKey: 'profile.countryDE' },
  { value: 'fr', labelKey: 'profile.countryFR' },
  { value: 'jp', labelKey: 'profile.countryJP' },
  { value: 'cn', labelKey: 'profile.countryCN' },
];
