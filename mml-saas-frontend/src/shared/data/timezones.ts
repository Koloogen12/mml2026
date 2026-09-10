export interface TimezoneOption {
  value: string;
  label: string;
}

export const TIMEZONES: TimezoneOption[] = Array.from({ length: 25 }, (_, i) => {
  const offset = i - 12;
  const sign = offset >= 0 ? '+' : '';
  const value = offset === 0 ? 'utc' : `utc${sign}${offset}`;
  const label = `UTC${sign}${String(Math.abs(offset)).padStart(2, '0')}:00`;
  return { value, label };
});
