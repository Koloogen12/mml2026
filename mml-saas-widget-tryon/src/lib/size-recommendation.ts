/**
 * Client-side size recommendation.
 *
 * Replaces the LLM-based /recommend-size backend call for stores that ship
 * measurement-based size charts (the vast majority of fashion retailers).
 * The LLM was guessing sizes without actually comparing body measurements
 * to the store's size chart; here we do the math deterministically.
 *
 * Default chart is Malina Bonita's women's-clothing table, captured from
 * their site on 2026-04-17. When we onboard stores with different charts
 * we can override via project config, but this covers the current client.
 */

export interface SizeRange {
  /** Lower bound in cm, inclusive. */
  min: number;
  /** Upper bound in cm, inclusive. */
  max: number;
}

export interface SizeRow {
  /** Label the storefront uses — e.g. "S", "M", "44 M". */
  label: string;
  /** EU/RU numeric size for reference; not required for matching. */
  ru?: number;
  bust: SizeRange;
  waist: SizeRange;
  hip: SizeRange;
}

export interface SizeChart {
  /** Sorted smallest → largest. */
  rows: SizeRow[];
}

/**
 * Malina Bonita women's size chart — bust / waist / hip in cm.
 * Source: test.malinabonita.com size-chart tab.
 */
export const MALINA_BONITA_CHART: SizeChart = {
  rows: [
    { label: 'XS', ru: 40, bust: { min: 82, max: 86 }, waist: { min: 58, max: 62 }, hip: { min: 84, max: 86 } },
    { label: 'S', ru: 42, bust: { min: 86, max: 90 }, waist: { min: 62, max: 68 }, hip: { min: 86, max: 90 } },
    { label: 'M', ru: 44, bust: { min: 90, max: 96 }, waist: { min: 68, max: 72 }, hip: { min: 90, max: 94 } },
    { label: 'L', ru: 46, bust: { min: 96, max: 98 }, waist: { min: 72, max: 76 }, hip: { min: 94, max: 98 } },
    { label: 'XL', ru: 48, bust: { min: 100, max: 104 }, waist: { min: 76, max: 80 }, hip: { min: 98, max: 102 } },
  ],
};

export interface BodyMeasurements {
  /** Chest / bust in cm. */
  chest?: number | null;
  /** Waist in cm. */
  waist?: number | null;
  /** Hip in cm. */
  hip?: number | null;
}

/**
 * Single-measurement fit cost for a given size row.
 * Overshoot (value > max) is penalised 2× compared to undershoot because
 * a garment that's too tight in a critical dimension is a returned item,
 * whereas a slightly loose fit is usually acceptable / alterable.
 */
function measureCost(value: number, range: SizeRange): number {
  if (value > range.max) return 2 * (value - range.max);
  if (value < range.min) return range.min - value;
  return 0;
}

/**
 * Recommend a size by minimising the total fit-cost across chest / waist /
 * hip against the chart. A row where all three measurements fall inside
 * the range is automatically the best (cost 0). Otherwise the algorithm
 * balances undershoot (tolerable) vs overshoot (not tolerable) and picks
 * the closest overall match.
 *
 * Earlier strategy ("smallest fitting row per dimension, then upsize to
 * the largest of the three") over-corrected on bodies where one
 * dimension was much bigger than the rest — e.g. 88/68/96 gave L because
 * hip=96 didn't fit S, even though M was a much better overall match
 * (S=12, M=6, L=12 using the cost above).
 */
export function recommendSize(
  body: BodyMeasurements,
  chart: SizeChart = MALINA_BONITA_CHART,
  availableLabels?: string[],
): string | null {
  const rows = availableLabels
    ? chart.rows.filter((r) => availableLabels.some((l) => labelsMatch(l, r.label)))
    : chart.rows;
  if (rows.length === 0) return null;
  const usable = (v: number | null | undefined) => typeof v === 'number' && v > 0;
  if (!usable(body.chest) && !usable(body.waist) && !usable(body.hip)) return null;

  const scored = rows.map((row) => {
    let cost = 0;
    if (usable(body.chest)) cost += measureCost(body.chest as number, row.bust);
    if (usable(body.waist)) cost += measureCost(body.waist as number, row.waist);
    if (usable(body.hip)) cost += measureCost(body.hip as number, row.hip);
    return { row, cost };
  });
  scored.sort((a, b) => a.cost - b.cost);
  const picked = scored[0].row;

  if (availableLabels) {
    const hit = availableLabels.find((l) => labelsMatch(l, picked.label));
    if (hit) return hit;
  }
  return picked.label;
}

/**
 * Fuzzy label equality — storefronts sometimes prefix numbers ("42 S").
 */
function labelsMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.toUpperCase().replace(/[^A-ZА-Я0-9]/g, '').trim();
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  // Strip leading digits: "42S" → "S"
  const stripNum = (s: string) => s.replace(/^\d+/, '');
  return stripNum(na) === stripNum(nb) || na.endsWith(nb) || nb.endsWith(na);
}
