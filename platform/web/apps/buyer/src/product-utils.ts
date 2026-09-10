import type { MMLProduct, MMLOffer } from "@mml/ui";
import { formatPrice } from "@mml/ui";
import { useChat } from "./store";

export const imgOf = (p: MMLProduct): string => p.images[0]?.url ?? "";
// Все фото товара по порядку — для листалки в плитке.
export const imagesOf = (p: MMLProduct): string[] =>
  (p.images ?? []).map((i) => i.url).filter(Boolean);
export const offerOf = (p: MMLProduct): MMLOffer | undefined => p.offers[0];
export const priceOf = (p: MMLProduct): string =>
  p.offers[0] ? formatPrice(p.offers[0].price, p.offers[0].currency) : "";
export const oldPriceOf = (p: MMLProduct): string =>
  p.offers[0]?.old_price ? formatPrice(p.offers[0].old_price, p.offers[0].currency) : "";
export const discountOf = (p: MMLProduct): string => {
  const o = p.offers[0];
  if (!o?.old_price) return "";
  return "−" + Math.round((1 - o.price / o.old_price) * 100) + "%";
};
export const retailerOf = (p: MMLProduct): string =>
  p.offers[0]?.retailer ?? p.brand.name;

// Мост к встроенному виджету примерки. loader.js вешает на window глобал
// `makeMeLook` с методом open({productId}). productId — тот же external_id, под
// которым товар засеян в проект виджета: 'plat:'+public_id. Так открывается
// родной UI виджета сразу с выбранным товаром — как у заказчиков.
declare global {
  interface Window {
    makeMeLook?: { open: (opts?: { productId?: string }) => void };
  }
}
export function openTryon(p: MMLProduct): void {
  const w = window.makeMeLook;
  if (!w) return;
  // Без товара (виджет ещё грузится / нет id) — открываем общий, а не падаем.
  if (p?.id) w.open({ productId: `plat:${p.id}` });
  else w.open();
}

// CPA-редирект: ВСЕГДА через /r/{id}, никогда не сырой URL мерчанта.
export function buyUrl(p: MMLProduct, offer?: MMLOffer): string {
  const o = offer ?? p.offers[0];
  const sid = useChat.getState().sessionId;
  const params = new URLSearchParams();
  if (o?.retailer_slug) params.set("offer", o.retailer_slug);
  if (sid) params.set("sid", sid);
  const qs = params.toString();
  return `/r/${p.id}${qs ? `?${qs}` : ""}`;
}
