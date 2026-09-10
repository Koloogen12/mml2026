// Русские склонения после числа. Один модуль на всё приложение: до этого
// правило переписывалось в каждом экране заново, и в трёх местах из четырёх
// стояло «1 вещей» / «3 слов» / «1 брендов».
export function ruPlural(n: number, one: string, few: string, many: string) {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return one;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
  return many;
}

export const things = (n: number) => ruPlural(n, "вещь", "вещи", "вещей");
export const brands = (n: number) => ruPlural(n, "бренд", "бренда", "брендов");
export const minutes = (n: number) => ruPlural(n, "минута", "минуты", "минут");
