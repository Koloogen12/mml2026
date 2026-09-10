// Общие хелперы форматирования + статические демо-данные эталона, у которых
// НЕТ API-эквивалента в Ф1 (паспорт стиля, тред-заглушка, подбор ИИ). Помечены
// TODO(Ф7) в местах использования. Числа всегда с единицей (₽/шт/сек/%).

// копейки → «12 990 ₽» (tabular-nums делает моно-класс)
export function rub(kopecks: number | null | undefined): string {
  if (kopecks == null) return "— ₽";
  const r = kopecks / 100;
  return (
    r
      .toLocaleString("ru-RU", { maximumFractionDigits: 2 })
      .replace(/,/, ",") + " ₽"
  );
}

// рубли (float) → «12 990 ₽»
export function rubFromFloat(v: number | null | undefined): string {
  if (v == null) return "— ₽";
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
}

// доля 0..1 → «38%»
export function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return Math.round(v * 100) + "%";
}

// ISO-время → «2 мин», «1 ч», «3 дн», «сейчас»
export function ago(iso?: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const sec = Math.max(0, (Date.now() - t) / 1000);
  if (sec < 60) return "сейчас";
  const min = Math.floor(sec / 60);
  if (min < 60) return min + " мин";
  const h = Math.floor(min / 60);
  if (h < 24) return h + " ч";
  const d = Math.floor(h / 24);
  return d + " дн";
}

// ISO-время → «15.06»
export function shortDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    String(d.getDate()).padStart(2, "0") +
    "." +
    String(d.getMonth() + 1).padStart(2, "0")
  );
}

// первая буква имени/контакта для аватара-кружка
export function initial(s: string): string {
  return (s || "?").trim().charAt(0).toUpperCase();
}

// карта статусов лида → цвет (STATUS из эталона)
export const STATUS_COLOR: Record<string, string> = {
  new: "#8A8A82",
  in_dialog: "#2436D8",
  dialog: "#2436D8",
  sent_selection: "#7A5AC9",
  sent: "#7A5AC9",
  clicked: "#C97A16",
  store: "#C97A16",
  purchased: "#1F8A5B",
  bought: "#1F8A5B",
  churned: "#C0392B",
  lost: "#C0392B",
};
export const STATUS_LABEL: Record<string, string> = {
  new: "новый",
  in_dialog: "в диалоге",
  dialog: "в диалоге",
  sent_selection: "отправили подборку",
  sent: "отправили подборку",
  clicked: "перешёл в магазин",
  store: "перешёл в магазин",
  purchased: "купил",
  bought: "купил",
  churned: "отвалился",
  lost: "отвалился",
};





// зона одежды → человекочитаемое (для A4)
export const ZONE_LABEL: Record<string, string> = {
  tops: "верх",
  bottoms: "низ",
  dresses: "платья",
  outerwear: "верхняя одежда",
  shoes: "обувь",
};

// Структурный тип паспорта (совместим с DeskPassport из store, без цикл. импорта).
export interface PassportShape {
  for_whom?: string | null;
  persona?: string[] | null;
  self_described?: string[] | null;
  aspirational?: string[] | null;
  mood?: string | null;
  brands_love?: string[] | null;
  brands_avoid?: string[] | null;
  size_by_category?: Record<string, string> | null;
  budget_by_category?: Record<string, number> | null;
}

// buildPassportChips — реальные значения паспорта в чипы (пустые поля скрыты).
// Единый источник для стола стилиста и раздела «Пользователи».
export function buildPassportChips(
  p: PassportShape | null | undefined,
): { k: string; v: string }[] {
  const chips: { k: string; v: string }[] = [];
  if (!p) return chips;
  const fw = p.for_whom;
  if (fw === "female" || fw === "women") chips.push({ k: "Кому", v: "женское" });
  else if (fw === "male" || fw === "men") chips.push({ k: "Кому", v: "мужское" });
  else if (fw) chips.push({ k: "Кому", v: fw });
  if (p.persona?.length) chips.push({ k: "Персона", v: p.persona.join(", ") });
  if (p.self_described?.length) chips.push({ k: "О себе", v: p.self_described.join(", ") });
  if (p.aspirational?.length) chips.push({ k: "Ориентир", v: p.aspirational.join(", ") });
  if (p.mood) chips.push({ k: "Настроение", v: p.mood });
  if (p.brands_love?.length) chips.push({ k: "Любит", v: p.brands_love.join(", ") });
  if (p.brands_avoid?.length) chips.push({ k: "Не носит", v: p.brands_avoid.join(", ") });
  for (const [zone, val] of Object.entries(p.size_by_category ?? {}))
    if (val) chips.push({ k: `Размер · ${ZONE_LABEL[zone] ?? zone}`, v: val });
  for (const [zone, val] of Object.entries(p.budget_by_category ?? {}))
    if (val != null) chips.push({ k: `Бюджет · ${ZONE_LABEL[zone] ?? zone}`, v: rubFromFloat(val) });
  return chips;
}
