import type { CSSProperties } from "react";

// sx("...") — парсер inline-стилей макета в React style-объекты.
// Позволяет держать строки стилей ДОСЛОВНО как в hi-fi макете (контракт 1:1).
const cache = new Map<string, CSSProperties>();

export function sx(css: string): CSSProperties {
  const hit = cache.get(css);
  if (hit) return hit;
  const obj: Record<string, string> = {};
  for (const part of css.split(";")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (!key || !val) continue;
    obj[key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = val;
  }
  const style = obj as CSSProperties;
  // кэшируем только статичные строки разумной длины (динамические — каждый раз новые ключи)
  if (cache.size < 2000) cache.set(css, style);
  return style;
}
