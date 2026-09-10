const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALL = LOWER + UPPER + DIGITS;

/** Generates a 16-char password with at least 1 uppercase letter and 1 digit. */
export function generatePassword(): string {
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [pick(UPPER), pick(DIGITS)];
  for (let i = chars.length; i < 16; i++) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
