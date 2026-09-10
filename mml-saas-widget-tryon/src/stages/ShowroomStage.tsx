import { type FC, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useWidgetStore } from '@/store';
import type { WidgetProduct } from '@/types';
import { t } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { requestTryOn, pollTryOnResult, addFavorite, deleteFavorite, addCartItem, recommendSize, getShareUrl, getTryOnHistory } from '@/api';
import type { SizeRecommendationResponse } from '@/api';
import toast from 'react-hot-toast';
import { TryOnLoader } from '@/components/TryOnLoader';
import { ProductCarousel } from './ProductCarousel';
import type { AxiosError } from 'axios';

interface ProductGroup {
  baseSku: string;
  variants: WidgetProduct[];
}

function getBaseSku(sku: string): string {
  const slashIdx = sku.lastIndexOf('/');
  if (slashIdx > 0) return sku.substring(0, slashIdx);
  const dashIdx = sku.lastIndexOf('-');
  if (dashIdx > 0) return sku.substring(0, dashIdx);
  return sku;
}

/**
 * When CS-Cart category→widget-category mapping is not configured in the
 * SaaS admin, synced products have an empty `category`. The Showroom then
 * can't place the product in the correct layer (outerwear / tops / bottoms
 * / shoes / accessories) and the sidebar stays empty. This is a best-effort
 * fallback that infers the category from Russian/English product names and
 * the CS-Cart subcategory label seen in practice. Note: we deliberately
 * avoid `\b` anchors because they don't match at Cyrillic word boundaries
 * in JavaScript regex (`\b` is defined only for ASCII word chars), which
 * silently dropped e.g. "Сапоги" from the shoes bucket.
 */
function inferCategoryFromName(name: string, subcategory?: string | null): string {
  const n = (name || '').trim().toLowerCase();
  const sub = (subcategory || '').trim().toLowerCase();

  // ---- Name is the strongest signal ----------------------------------
  // The product NAME (e.g. "Платье мини пайетки Дарби", "Брюки классические")
  // almost always starts with the garment type, so we pattern-match against
  // the STEM of that first word. Ordering matters: we check tops before
  // bottoms because a jumper/sweater may sit in a shop feed under a
  // "С брюками"/"С шортами" subcategory (those describe a dress style, not
  // actual trousers) — name-first prevents that mis-classification.
  if (/^(пальт|куртк|тренч|кардиган|жакет|пиджак|плащ|дублёнк|дубленк|шуб|жилет|пуховик|бомбер|парк|шубк|анорак|пончо)/.test(n)) return 'outerwear';
  if (/^(туфли|ботинк|ботильон|кроссов|кеды|сапог|босоножк|балетк|мокасин|сандали|угги|лофер|оксфорд|слипон|эспадрил|шлёп|шлеп|тапочк|сникер|полуботинк|кеда)/.test(n)) return 'shoes';
  if (/^(сумк|клатч|кошел|ремен|пояс|шарф|платок|перчатк|шляп|шапк|берет|украш|бижутер|очки|часы|ожерел|кольц|сереж|браслет|косынк|бандан)/.test(n)) return 'accessories';
  if (/^(плать|блуз|топ|рубашк|водолазк|джемпер|свитер|толстовк|худи|лонгслив|боди|футболк|комбинезон|костюм|кофт|поло|тельняшк|майк|кроп)/.test(n)) return 'tops';
  if (/^(юбк|брюк|джинс|шорт|бридж|лосин|леггинс|легинс|штан|клеш|капри|трикошорт|кюлот|палацц)/.test(n)) return 'bottoms';

  // ---- Subcategory fallback (only when name gives no signal) ---------
  // Note the anchors: we require the subcategory to START with a bottoms
  // keyword so that "С брюками" / "С шортами" (dress-style labels) are
  // NOT swept into bottoms.
  if (/^(обувь)|shoes|footwear/.test(sub)) return 'shoes';
  if (/^(аксессуар|сумк|ремн|пояс|украш|бижутер)|accessor/.test(sub)) return 'accessories';
  if (/^(верхн\s*одежд|пальто|куртк)|outerwear/.test(sub)) return 'outerwear';
  if (/^(юбк|брюк|джинс|шорт|деним)|bottoms|skirts?|pants?/.test(sub)) return 'bottoms';
  if (/^(плать|топ|блуз|рубашк|джемпер|свитер|комбинезон)|dress|top|blouse|shirts?/.test(sub)) return 'tops';

  // Default — prefer the safer "tops" bucket so mis-placed items at least
  // end up with the dresses/blouses rather than with actual trousers.
  return 'tops';
}

/**
 * Same as `inferCategoryFromName` but returns `null` when we can't
 * confidently detect a specific category. Used by the product-list pass
 * to decide whether to OVERRIDE the shop-assigned category — we don't
 * want to force a product into "tops" just because its name is unusual.
 */
function inferCategoryStrict(name: string, subcategory?: string | null): string | null {
  const n = (name || '').trim().toLowerCase();
  const sub = (subcategory || '').trim().toLowerCase();

  if (/^(пальт|куртк|тренч|кардиган|жакет|пиджак|плащ|дублёнк|дубленк|шуб|жилет|пуховик|бомбер|парк|шубк|анорак|пончо)/.test(n)) return 'outerwear';
  if (/^(туфли|ботинк|ботильон|кроссов|кеды|сапог|босоножк|балетк|мокасин|сандали|угги|лофер|оксфорд|слипон|эспадрил|шлёп|шлеп|тапочк|сникер|полуботинк|кеда)/.test(n)) return 'shoes';
  if (/^(сумк|клатч|кошел|ремен|пояс|шарф|платок|перчатк|шляп|шапк|берет|украш|бижутер|очки|часы|ожерел|кольц|сереж|браслет|косынк|бандан)/.test(n)) return 'accessories';
  if (/^(плать|блуз|топ|рубашк|водолазк|джемпер|свитер|толстовк|худи|лонгслив|боди|футболк|комбинезон|костюм|кофт|поло|тельняшк|майк|кроп)/.test(n)) return 'tops';
  if (/^(юбк|брюк|джинс|шорт|бридж|лосин|леггинс|легинс|штан|клеш|капри|трикошорт|кюлот|палацц)/.test(n)) return 'bottoms';

  if (/^(обувь)|shoes|footwear/.test(sub)) return 'shoes';
  if (/^(аксессуар|сумк|ремн|пояс|украш|бижутер)|accessor/.test(sub)) return 'accessories';
  if (/^(верхн\s*одежд|пальто|куртк)|outerwear/.test(sub)) return 'outerwear';
  if (/^(юбк|брюк|джинс|шорт|деним)|bottoms|skirts?|pants?/.test(sub)) return 'bottoms';
  if (/^(плать|топ|блуз|рубашк|джемпер|свитер|комбинезон)|dress|top|blouse|shirts?/.test(sub)) return 'tops';

  return null;
}

const ALL_CLOTH_TYPE_KEYS = ['outerwear', 'tops', 'bottoms', 'shoes', 'accessories'] as const;

const CLOTH_TYPE_LABELS: Record<string, TranslationKey> = {
  outerwear: 'showroom.outerwear',
  tops: 'showroom.tops',
  bottoms: 'showroom.bottoms',
  shoes: 'showroom.shoes',
  accessories: 'showroom.accessories',
};


function isCSCartSite(): boolean {
  const w = window as unknown as Record<string, unknown>;
  if (w.Tygh) return true;
  if (document.querySelector('form[name^="product_form_"]')) return true;
  if (document.querySelector('meta[name="generator"][content*="CS-Cart" i]')) return true;
  if (document.querySelector('script[src*="cs-cart"], script[src*="cscart"], link[href*="/design/themes/"]')) return true;
  if (document.body && /\bty-/.test(document.body.className)) return true;
  return false;
}

function getCSCartSecurityHash(): string {
  // CS-Cart injects this in various ways depending on theme
  const w = window as unknown as Record<string, unknown>;
  const tygh = w.Tygh as
    | { security_hash?: string; $?: { cookie?: { read?: (k: string) => string } } }
    | undefined;
  if (tygh?.security_hash) return tygh.security_hash;
  // Many themes keep it in a hidden input on any form
  const hidden = document.querySelector(
    'input[name="security_hash"]',
  ) as HTMLInputElement | null;
  if (hidden?.value) return hidden.value;
  // Sometimes in a meta tag
  const meta = document.querySelector(
    'meta[name="security_hash"]',
  ) as HTMLMetaElement | null;
  if (meta?.content) return meta.content;
  return '';
}

function collectProductOptions(productId: string): Record<string, string> {
  // Read the CS-Cart product form on the current page and copy any selected
  // product_options so the correct variant is added to cart. This mirrors what
  // CS-Cart's "Add to cart" button posts.
  const form = document.querySelector(
    `form[name="product_form_${productId}"]`,
  ) as HTMLFormElement | null;
  if (!form) return {};
  const fd = new FormData(form);
  const out: Record<string, string> = {};
  fd.forEach((value, key) => {
    // Only forward the fields the dispatcher needs: options + amount
    if (
      key.startsWith(`product_data[${productId}][product_options]`) ||
      key === `product_data[${productId}][amount]`
    ) {
      out[key] = String(value);
    }
  });
  return out;
}

/**
 * CS-Cart returns `result_ids` patches as an object like:
 *   { "cart_status_944": "<span>5</span>", "wish_list_123": "...", ... }
 * Those keys map to DOM elements by id. In a normal CS-Cart click flow
 * `$.ceAjax` replaces each element's innerHTML with the returned string
 * and then dispatches an event so other scripts (mini-cart, analytics)
 * can react. Since we bypass ceAjax with a raw fetch(), we have to apply
 * those patches ourselves or the header cart counter will never update.
 */
function applyCSCartHtmlPatches(data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string' || !value) continue;
    const el = document.getElementById(key);
    if (el) {
      el.innerHTML = value;
      continue;
    }
    // Some CS-Cart themes use class-based matching (cart_status_<id>).
    const byClass = document.querySelectorAll(`.${CSS.escape(key)}`);
    byClass.forEach((e) => {
      (e as HTMLElement).innerHTML = value;
    });
  }
  try {
    document.dispatchEvent(new CustomEvent('ce.cart_status_refresh'));
    document.dispatchEvent(new CustomEvent('ce.ajaxdone'));
  } catch {
    /* ignore */
  }
}

/**
 * Delegate to CS-Cart's native `$.ceAjax` when available. It:
 *   - sets up the ajax_url / ajax_key envelope correctly,
 *   - applies returned html patches to DOM (header cart counter, mini-cart),
 *   - fires ce.* events that other theme scripts subscribe to.
 * Returns null if the page doesn't expose ceAjax (fallback to plain fetch).
 */
function addToCSCartViaCeAjax(productId: string): Promise<void> | null {
  const w = window as unknown as Record<string, unknown>;
  const tygh = w.Tygh as { $?: { ceAjax?: (op: string, url: string, opts: Record<string, unknown>) => void } } | undefined;
  const ce = tygh?.$?.ceAjax;
  if (typeof ce !== 'function') return null;

  const data: Record<string, string> = {
    [`product_data[${productId}][amount]`]: '1',
    result_ids: 'cart_status*,wish_list*,checkout*,account_info*',
  };
  const opts = collectProductOptions(productId);
  for (const [k, v] of Object.entries(opts)) data[k] = v;
  // CS-Cart test stores running under store_access_key require it to be
  // forwarded with the add-to-cart request, otherwise the session is
  // treated as unauthenticated and the server silently refuses to add
  // anything to the cart. This is invisible because the ceAjax callback
  // still fires with an empty response.
  const sak = new URL(location.href).searchParams.get('store_access_key');
  if (sak) data.store_access_key = sak;

  console.log('[MML Cart] ceAjax data being posted', data);
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const done = (ok: boolean, err?: unknown) => {
      if (settled) return;
      settled = true;
      ok ? resolve() : reject(err instanceof Error ? err : new Error(String(err ?? 'ceAjax failed')));
    };
    try {
      ce('request', '/index.php?dispatch=checkout.add', {
        hidden: true,
        caching: false,
        method: 'post',
        data,
        callback: (resp: unknown) => {
          // Dump the full response shape so we can see exactly what
          // CS-Cart sent back — it's the only way to diagnose silent
          // "accepted but didn't add" cases on Multi-Vendor stores.
          try {
            const keys = resp && typeof resp === 'object' ? Object.keys(resp as Record<string, unknown>) : [];
            // Print each key's first-level value as a separate line so
            // console formatting doesn't collapse the whole object.
            console.log('[MML Cart] ceAjax response keys:', keys.join(', '));
            if (resp && typeof resp === 'object') {
              for (const k of keys) {
                const v = (resp as Record<string, unknown>)[k];
                let summary: string;
                if (v === null) summary = 'null';
                else if (Array.isArray(v)) summary = `Array(${v.length})` + (v.length ? ` → ${JSON.stringify(v).slice(0, 200)}` : '');
                else if (typeof v === 'object') summary = JSON.stringify(v).slice(0, 250);
                else summary = String(v).slice(0, 250);
                console.log(`[MML Cart]   ${k}:`, summary);
              }
            }
          } catch (e) {
            console.log('[MML Cart] ceAjax dump failed', e);
          }
          const r = resp as { added_products?: unknown[] } | undefined;
          if (r?.added_products && Array.isArray(r.added_products) && r.added_products.length === 0) {
            done(false, new Error('CS-Cart accepted but added nothing'));
          } else {
            done(true);
          }
        },
      });
    } catch (err) {
      done(false, err);
    }
    // Safety fallback in case ceAjax never calls back.
    setTimeout(() => done(true), 8000);
  });
}

/**
 * Most reliable path: simulate a real user click on the storefront's own
 * "В корзину" button for the given vendor product. CS-Cart's theme scripts
 * handle everything from there — add to cart, update header counter,
 * fire mini-cart events — exactly like a human click.
 *
 * Only works when we're on a PDP that actually has
 *   <a id="button_cart_vendor_product{ID}" ...>
 * for this vendor id (which is the whole point of the widget's vendor picker).
 */
function addToCSCartViaNativeClick(productId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const btn = document.getElementById(`button_cart_vendor_product${productId}`) as HTMLElement | null;
    if (!btn) return resolve(false);
    const statusEl =
      (document.getElementById('cart_status_944') as HTMLElement | null) ||
      (document.querySelector('[id^="cart_status_"]') as HTMLElement | null);
    const before = statusEl?.textContent?.trim() ?? null;

    // CS-Cart binds the cart click handler via jQuery delegation on the
    // document. `btn.click()` doesn't always reach it after the variation
    // page re-renders, and `jq(btn).trigger('click')` without an Event
    // object fails because the delegated handler calls `.hasClass()` on
    // `event.target` which is undefined in a naked trigger. Passing a
    // `jQuery.Event('click', { target: btn })` fixes both.
    const w = window as unknown as Record<string, unknown>;
    interface JQ {
      (el: Element): { trigger: (e: unknown) => void };
      Event?: (type: string, props?: Record<string, unknown>) => unknown;
    }
    const jq = (w.jQuery || w.$) as JQ | undefined;
    let triggered = false;
    if (jq && typeof jq.Event === 'function') {
      try {
        const ev = jq.Event('click', { target: btn, currentTarget: btn });
        jq(btn).trigger(ev);
        triggered = true;
      } catch {
        /* fall through */
      }
    }
    if (!triggered) btn.click();

    // Wait up to 3s for the header counter to change — that's the signal
    // that CS-Cart applied the add. If it never changes, we return false
    // so the caller can fall back to ceAjax/fetch.
    const started = Date.now();
    const tick = () => {
      const now = statusEl?.textContent?.trim() ?? null;
      if (now !== before && now) return resolve(true);
      if (Date.now() - started >= 3000) return resolve(false);
      setTimeout(tick, 150);
    };
    setTimeout(tick, 150);
  });
}

/**
 * Add-to-cart for a {size, vendor} combination whose product_id isn't on
 * the current PDP (because the current PDP is a different size variation
 * than the user picked). We load the correct variation in a hidden iframe
 * — it will have the right <a id="button_cart_vendor_product{ID}"> — then
 * trigger that button's real click inside the iframe. The storefront
 * session cookie is shared, so the add reflects in the parent's cart.
 */
function addToCSCartViaIframe(vendorProductId: string, masterVariationId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const origin = window.location.origin;
    const storeKey = new URL(window.location.href).searchParams.get('store_access_key');
    const url = `${origin}/index.php?dispatch=products.view&product_id=${encodeURIComponent(masterVariationId)}${storeKey ? `&store_access_key=${encodeURIComponent(storeKey)}` : ''}`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;border:0;';
    iframe.src = url;
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      try { iframe.remove(); } catch { /* ignore */ }
      resolve(ok);
    };
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc || !win) return finish(false);
        const btn = doc.getElementById(`button_cart_vendor_product${vendorProductId}`) as HTMLElement | null;
        if (!btn) return finish(false);
        // Capture counter inside iframe so we know when CS-Cart applied add.
        const statusEl =
          (doc.getElementById('cart_status_944') as HTMLElement | null) ||
          (doc.querySelector('[id^="cart_status_"]') as HTMLElement | null);
        const before = statusEl?.textContent?.trim() ?? null;
        btn.click();
        const started = Date.now();
        const tick = () => {
          const now = statusEl?.textContent?.trim() ?? null;
          if (now !== before && now) return finish(true);
          // Hard failure after 5s — if the iframe's counter NEVER changed
          // it means CS-Cart silently refused the add (out-of-stock size,
          // missing vendor offer, whatever). Returning `false` here lets
          // the caller fall through to the ceAjax/fetch path which
          // surfaces the real error to the user. Previous behaviour was
          // `finish(true)` which made the widget show a phantom "added
          // to cart" when nothing landed in the basket.
          if (Date.now() - started >= 5000) return finish(false);
          setTimeout(tick, 200);
        };
        setTimeout(tick, 300);
      } catch {
        finish(false);
      }
    };
    iframe.onerror = () => finish(false);
    document.body.appendChild(iframe);
    // Safety timeout if page never loads
    setTimeout(() => finish(false), 10000);
  });
}

function addToCSCart(productId: string, masterVariationId?: string, skipIframe = false): Promise<void> {
  // Priority chain:
  //   1. Simulate click on the storefront's own "В корзину" button for this
  //      vendor on the current page — CS-Cart does everything correctly
  //      (cart, header counter, mini-cart).
  //   2. If the vendor button isn't on the current page (user picked a
  //      different size than the one loaded on the PDP), load that size's
  //      page in a hidden iframe and click the real button there. Session
  //      cookie is shared so the add reflects on the parent page.
  //      Skipped entirely for products that don't need a size switch —
  //      the 5-second iframe wait would otherwise burn ~9s before we
  //      finally reach the working ceAjax/fetch path.
  //   3. Tygh.$.ceAjax — CS-Cart's internal AJAX helper.
  //   4. Raw fetch + manual DOM patches — last-resort fallback.
  return addToCSCartViaNativeClick(productId).then(async (ok) => {
    console.log('[MML Cart] NativeClick', { productId, ok });
    if (ok) return;
    if (masterVariationId && !skipIframe) {
      console.log('[MML Cart] trying iframe path', { productId, masterVariationId });
      const ok2 = await addToCSCartViaIframe(productId, masterVariationId);
      console.log('[MML Cart] iframe result', { ok2 });
      if (ok2) {
        // Refresh parent's cart counter by reloading cart_status via a
        // background request — the iframe's counter already updated.
        try {
          const resp = await fetch(`/index.php?dispatch=checkout.cart&store_access_key=${new URL(location.href).searchParams.get('store_access_key') || ''}`, { credentials: 'include' });
          const html = await resp.text();
          const m = html.match(/id="cart_status_\d+"[^>]*>([\s\S]*?)<\/span>/);
          const el = document.querySelector('[id^="cart_status_"]') as HTMLElement | null;
          if (el && m?.[1]) el.innerHTML = m[1];
        } catch {
          /* ignore — user will see updated count on next page interaction */
        }
        return;
      }
    }
    console.log('[MML Cart] falling back to ceAjax/fetch');
    return addToCSCart_ceAjaxOrFetch(productId);
  });
}

function addToCSCart_ceAjaxOrFetch(productId: string): Promise<void> {
  const native = addToCSCartViaCeAjax(productId);
  console.log('[MML Cart] ceAjax available?', !!native);
  if (native) return native.then(() => console.log('[MML Cart] ceAjax resolved ok')).catch((err) => {
    console.warn('[MML Cart] ceAjax threw', err);
    throw err;
  });

  return new Promise((resolve, reject) => {
    const params = new URLSearchParams();
    params.set(`product_data[${productId}][amount]`, '1');
    // Merge in options (size, color) from the product form if we're on a PDP
    const opts = collectProductOptions(productId);
    for (const [k, v] of Object.entries(opts)) params.set(k, v);
    // Tell CS-Cart's AJAX handler which UI regions to refresh — without this,
    // checkout.add returns an HTML redirect instead of JSON and the cart
    // counter in the header is not updated.
    params.set(
      'result_ids',
      'cart_status*,wish_list*,checkout*,account_info*',
    );
    params.set('redirect_url', window.location.pathname + window.location.search);
    params.set('full_render', '1');
    const hash = getCSCartSecurityHash();
    if (hash) params.set('security_hash', hash);

    const url = `/index.php?dispatch=checkout.add&is_ajax=1${
      hash ? `&security_hash=${encodeURIComponent(hash)}` : ''
    }`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
      body: params.toString(),
      credentials: 'include',
    })
      .then((resp) => {
        if (!resp.ok) throw new Error(`CS-Cart add-to-cart HTTP ${resp.status}`);
        return resp.text().then((txt) => {
          if (/^\s*<!doctype html/i.test(txt)) {
            throw new Error('CS-Cart returned HTML (session expired?)');
          }
          // CS-Cart always returns HTTP 200 + JSON for checkout.add, even when
          // the product was silently rejected (wrong id, no offer for this
          // storefront, etc.). A real successful add produces a non-empty
          // `added_products` array; if it's empty, the cart didn't actually
          // receive anything — treat as failure so the UI doesn't fake success.
          const m = txt.match(/"added_products"\s*:\s*(\[[^\]]*\])/);
          if (m && m[1].replace(/\s+/g, '') === '[]') {
            throw new Error('CS-Cart accepted the request but added nothing');
          }
          // Apply the HTML patches that CS-Cart returned for `result_ids`
          // regions (cart_status*, wish_list*, etc.) so the store's own
          // header counter / mini-cart update live. Normally this is done
          // by CS-Cart's $.ceAjax; since we bypassed it with fetch() we have
          // to apply the patches ourselves.
          try {
            const parsed = JSON.parse(txt) as Record<string, unknown>;
            applyCSCartHtmlPatches(parsed);
          } catch {
            /* non-JSON response shape — ignore */
          }
        });
      })
      .then(() => {
        // Fire a DOM event so themes that bind to cart changes can react,
        // and try to refresh cart_status via the global helper if available.
        try {
          const ev = new CustomEvent('ce.cart_status_refresh');
          document.dispatchEvent(ev);
        } catch {
          /* ignore */
        }
        resolve();
      })
      .catch((err) => reject(err));
  });
}

async function downloadImage(url: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return true;
  } catch {
    // Fallback: open in new tab so the user can long-press / right-click to save
    window.open(url, '_blank', 'noopener');
    return false;
  }
}

export const ShowroomStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const config = useWidgetStore((s) => s.config);
  const bodyParams = useWidgetStore((s) => s.bodyParams);
  const sessionToken = useWidgetStore((s) => s.sessionToken);
  const modelPhotoId = useWidgetStore((s) => s.modelPhotoId);
  const modelPhotoUrl = useWidgetStore((s) => s.modelPhotoUrl);
  const tryOnUrl = useWidgetStore((s) => s.tryOnUrl);
  const tryOnKey = useWidgetStore((s) => s.tryOnKey);
  const setTryOnUrl = useWidgetStore((s) => s.setTryOnUrl);
  const setTryOnKey = useWidgetStore((s) => s.setTryOnKey);
  const setLoading = useWidgetStore((s) => s.setLoading);
  const isLoading = useWidgetStore((s) => s.isLoading);
  const favorites = useWidgetStore((s) => s.favorites);
  const toggleFavorite = useWidgetStore((s) => s.toggleFavorite);
  const addTryOnHistory = useWidgetStore((s) => s.addTryOnHistory);
  const selectedProducts = useWidgetStore((s) => s.selectedProducts);
  const selectProduct = useWidgetStore((s) => s.selectProduct);
  const deselectProduct = useWidgetStore((s) => s.deselectProduct);
  const wornProductIds = useWidgetStore((s) => s.wornProductIds);
  const setWornProductIds = useWidgetStore((s) => s.setWornProductIds);
  const setSelectedGarment = useWidgetStore((s) => s.setSelectedGarment);
  const clearTryOn = useWidgetStore((s) => s.clearTryOn);
  const pendingTryOnId = useWidgetStore((s) => s.pendingTryOnId);
  const clearPendingTryOn = useWidgetStore((s) => s.clearPendingTryOn);
  const pendingProductExternalId = useWidgetStore((s) => s.pendingProductExternalId);
  const setPendingProductExternalId = useWidgetStore((s) => s.setPendingProductExternalId);

  // Filter cloth types based on admin config (tops always visible, accessories always visible)
  const clothTypeKeys = useMemo(() => {
    const ct = config?.clothTypesEnabled;
    if (!ct) return ALL_CLOTH_TYPE_KEYS as unknown as string[];
    return ALL_CLOTH_TYPE_KEYS.filter((key) => {
      if (key === 'tops') return true; // mandatory
      if (key === 'accessories') return true; // always shown (not in admin toggle)
      return ct[key as keyof typeof ct] ?? true;
    });
  }, [config]);

  const [activeClothType, setActiveClothType] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isFullview, setIsFullview] = useState(false);
  const [favSnackbar, setFavSnackbar] = useState(false);
  const [activeGroup, setActiveGroup] = useState<ProductGroup | null>(null);
  const [showSizes, setShowSizes] = useState(false);
  // Sizes are tracked per-product (keyed by publicId) so picking "S" for a
  // blouse doesn't silently change the size of jeans / shoes / a bag that
  // the user picked earlier. A single global `selectedSize` would sync the
  // labels across every layer in the Showroom sidebar and break add-to-cart.
  const [sizeByProduct, setSizeByProduct] = useState<Record<string, string>>({});
  const [sizingProduct, setSizingProduct] = useState<WidgetProduct | null>(null);
  const selectedSize = sizingProduct ? sizeByProduct[sizingProduct.publicId] ?? null : null;
  const setSelectedSize = useCallback((size: string | null) => {
    if (!sizingProduct) return;
    const key = sizingProduct.publicId;
    setSizeByProduct((prev) => {
      if (size === null) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      if (prev[key] === size) return prev;
      return { ...prev, [key]: size };
    });
  }, [sizingProduct]);
  const getSizeFor = useCallback((publicId: string | undefined | null): string | null => {
    if (!publicId) return null;
    return sizeByProduct[publicId] ?? null;
  }, [sizeByProduct]);
  const [lastTryOnId, setLastTryOnId] = useState<string | null>(null);
  const tryOnEpoch = useRef(0);
  const pollAbortRef = useRef<AbortController | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  // Map of image_url -> favorite server ID for deletion
  const [favoriteIds, setFavoriteIds] = useState<Record<string, string>>({});

  // Vendor picker state — for CS-Cart Multi-Vendor PDPs where the same
  // product is offered by several sellers at different prices.
  interface VendorOffer { productId: string; name: string; price: string | null; }
  const [vendorPicker, setVendorPicker] = useState<{
    offers: VendorOffer[];
    productPublicId: string;
  } | null>(null);

  // ─── DEBUG: монтирование и глобальные клики ──────────────────────────────
  useEffect(() => {
    console.log('[MML TryOn] ✅ ShowroomStage mounted', {
      sessionToken,
      modelPhotoId,
      selectedProducts: selectedProducts.map(p => p.publicId),
    });

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const text = target?.textContent?.trim().slice(0, 60);
      const tag = target?.tagName;
      const cls = target?.className?.toString?.().slice(0, 60);
      console.log('[MML TryOn] 🖱️ document click', { tag, text, cls, target });
    };
    document.addEventListener('click', onDocClick, true); // capture phase
    return () => document.removeEventListener('click', onDocClick, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // Initialize try-on count from history (for auth gate after 3 try-ons)
  // Also hydrate lastTryOnId so the share link is never empty after page reload
  useEffect(() => {
    if (!sessionToken) return;
    getTryOnHistory(sessionToken)
      .then((history) => {
        if (history.length > 0) {
          if (tryOnCount === 0) {
            for (let i = 0; i < history.length; i++) incrementTryOnCount();
          }
          setLastTryOnId((prev) => prev ?? history[0].public_id);
        }
      })
      .catch(() => { /* ignore */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  // Size recommendation
  const [sizeRec, setSizeRec] = useState<SizeRecommendationResponse | null>(null);
  const [sizeRecLoading, setSizeRecLoading] = useState(false);
  const sizeRecCache = useRef<Map<string, SizeRecommendationResponse>>(new Map());

  // Resume polling for a try-on that was still processing when the page was refreshed
  useEffect(() => {
    if (!pendingTryOnId || !sessionToken) return;

    const abortCtrl = new AbortController();
    pollAbortRef.current = abortCtrl;
    setLoading(true);

    if (import.meta.env.DEV) console.log('[MML] resuming poll for pending try-on', pendingTryOnId);
    pollTryOnResult(sessionToken, pendingTryOnId, abortCtrl.signal)
      .then((result) => {
        if (result.result_url) {
          setTryOnUrl(result.result_url);
          setTryOnKey(result.result_key ?? null);
          setLastTryOnId(result.public_id);
          addTryOnHistory(result.result_url);
          // Mark whatever's currently selected as worn. We don't have the
          // backend product_ids for the in-flight try-on after a reload, so
          // this is best-effort: if the user hasn't touched the selection
          // since page load, current selection == rendered set. Otherwise
          // the × just won't appear until the next manual try-on.
          setWornProductIds(
            useWidgetStore.getState().selectedProducts.map((p) => p.id),
          );
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (import.meta.env.DEV) console.error('[MML] resumed try-on failed', err);
        toast.error(t('showroom.tryOnFailed'));
      })
      .finally(() => {
        setLoading(false);
        clearPendingTryOn();
      });

    return () => {
      abortCtrl.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTryOnId]);

  useEffect(() => {
    if (!pendingProductExternalId || !config) return;

    const normalize = (v: string | null | undefined): string => {
      if (!v) return '';
      const s = String(v).trim();
      return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : s.toLowerCase();
    };
    const target = normalize(pendingProductExternalId);
    // Match against BOTH externalId (CS-Cart / Tilda native id, e.g. "18497263")
    // AND publicId (our UUID, used by the demo storefront and any host that
    // calls `window.makeMeLook.open({ productId: <product.id> })` where
    // product.id is the storefront API's public_id). Without this fallback,
    // hosts that aren't aware of the externalId convention silently get an
    // empty Showroom on click-from-card.
    const rawProduct = config.products.find(
      (p) =>
        normalize(p.externalId) === target ||
        normalize(p.publicId) === target,
    );
    setPendingProductExternalId(null);
    if (!rawProduct) return;

    // Infer the correct Showroom layer. Admin category mapping is used
    // when set, but we still run the name/subcategory inference as a
    // sanity check: if it's obviously a pair of shoes or an accessory,
    // we override a mis-mapped `tops` so the item lands in the right
    // layer. An empty admin category always falls back to inference.
    const inferred = inferCategoryFromName(rawProduct.name, rawProduct.subcategory);
    const needsOverride =
      !rawProduct.category ||
      (rawProduct.category === 'tops' && (inferred === 'shoes' || inferred === 'accessories' || inferred === 'bottoms' || inferred === 'outerwear'));
    const product: WidgetProduct = needsOverride
      ? { ...rawProduct, category: inferred }
      : rawProduct;

    // Preserve previously selected layers across widget close/reopen — the
    // store's selectProduct already handles same-category replacement, so
    // wiping everything here would drop legitimate prior picks on re-open.
    // The "В корзину" click resolves the correct product via sizingProduct,
    // not via selectedProducts[0], so there's no risk of sending a stale item.

    const baseSku = product.sku ? getBaseSku(product.sku) : product.id;
    const variants = config.products.filter((p) => {
      const pBase = p.sku ? getBaseSku(p.sku) : p.id;
      // When the imported product has no category mapped yet (common right
      // after a fresh CS-Cart sync), don't filter variants by category —
      // that would drop every variant and break variant/color selection.
      return pBase === baseSku && (!product.category || p.category === product.category);
    });
    const group: ProductGroup = { baseSku, variants };

    // Products synced from CS-Cart before category mappings are configured
    // have an empty `category`. Default to "tops" so the Showroom UI has an
    // active cloth type chip and renders the product, instead of showing an
    // unrelated item from the other categories.
    setActiveClothType(product.category || 'tops');
    setActiveTag(product.subcategory);
    setAddedToCart(false);

    // Only show the color picker if the matched product has no color set
    // (i.e. the page product is an abstract master without a picked color).
    // When the page already displays a specific color variant (most common —
    // e.g. "Платье-футляр Джесси лаванда"), skip the picker and select that
    // variant directly.
    if (!product.color && variants.length > 1 && variants.some((v) => v.color)) {
      setActiveGroup(group);
      setShowColors(true);
      setShowSizes(false);
    } else {
      selectProduct(product);
      setSizingProduct(product);
      // Fill the Showroom left-side layer sidebar (outerwear / tops / bottoms
      // / shoes / accessories) with this product's thumbnail so the user
      // visually sees their preselected item in the right layer, not an
      // empty placeholder.
      if (product.category && product.photoUrl) {
        setSelectedGarment(product.category, product.photoUrl);
      }
      setShowColors(false);
      setShowSizes(true);
    }

    // Kick off the CS-Cart size×vendor prefetch in the background so the
    // vendor picker has fresh data by the time the user clicks "В корзину".
    // Works regardless of how the widget was opened (PDP, catalog hover,
    // floating button). The exposed global resolves as soon as all size
    // variations have been scraped.
    const ensure = (window as unknown as Record<string, unknown>).__mmlEnsureOffers as
      | ((key: string) => Promise<void>)
      | undefined;
    if (ensure && product.externalId) {
      void ensure(product.externalId).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingProductExternalId]);

  // Size recommendation: compute locally from the user's body measurements
  // against the store's size chart. This replaces the old LLM-based
  // /recommend-size call which wasn't actually comparing measurements —
  // it was just guessing. If the user hasn't entered their measurements
  // yet, we fall back to the backend call so at least something shows up.
  useEffect(() => {
    if (!sizingProduct || !sessionToken) {
      setSizeRec(null);
      return;
    }
    // Don't recommend anything for shoes / accessories — our size chart
    // is bust/waist/hip and doesn't map to footwear sizes or accessory
    // sizes. The UI already hides the "рекомендуемый размер" hint for
    // these categories; this also prevents auto-setting selectedSize.
    if (sizingProduct.category === 'shoes' || sizingProduct.category === 'accessories') {
      setSizeRec(null);
      return;
    }

    const cached = sizeRecCache.current.get(sizingProduct.publicId);
    if (cached) {
      setSizeRec(cached);
      if (!selectedSize) setSelectedSize(cached.recommended_size);
      return;
    }

    // Always defer to the server-side recommender: it knows the product's
    // actual size chart (via admin override or full GOST table), maps
    // Russian numeric sizes (52 → XXL), factors in height+weight via
    // BMI, and surfaces the `out_of_chart` flag when no size truly fits.
    // The former client-side `recommendSizeLocal` path used a cramped
    // Malina-Bonita-only chart capped at XL and systematically returned
    // L for users who were actually XXL/XXXL.
    const controller = new AbortController();
    setSizeRecLoading(true);
    setSizeRec(null);
    recommendSize(sessionToken, sizingProduct.publicId)
      .then((rec) => {
        if (!controller.signal.aborted) {
          sizeRecCache.current.set(sizingProduct.publicId, rec);
          setSizeRec(rec);
          if (!selectedSize) setSelectedSize(rec.recommended_size);
          // Prominent toast when the user's body is outside this product's
          // size chart — the inline warning alone was being missed.
          if (rec.out_of_chart) {
            toast(t('showroom.noMatchingSize'), {
              icon: '⚠️',
              duration: 5000,
              style: {
                background: '#fff4e5',
                color: '#8a4b00',
                fontSize: '14px',
                maxWidth: '360px'
              }
            });
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted && import.meta.env.DEV) console.warn('[MML] size rec failed', err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSizeRecLoading(false);
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizingProduct?.publicId, sessionToken]);

  const displayUrl = tryOnUrl || modelPhotoUrl;
  const isFavorite = displayUrl ? favorites.includes(displayUrl) : false;

  const rawProducts = config?.products ?? [];

  // Сorrect mis-assigned categories using the name-based inference. Some
  // shop feeds classify e.g. "Джемпер с брюками" as `bottoms` because the
  // subcategory string mentions trousers — the inference correctly routes
  // it to `tops`. We only override when the name disagrees with an
  // obvious textual signal (jumper / sweater / dress etc.); if the shop
  // category matches or the inference is neutral, we keep the original.
  //
  // Same pass also filters by the user's onboarding gender — male users
  // shouldn't see dresses, female users shouldn't see male-tagged items.
  // We keep `unisex` and untagged products visible to everyone (a missing
  // gender field on legacy shop feeds means "no signal", not "don't show").
  const products = useMemo(() => {
    const userGender = (bodyParams.gender || '').toLowerCase();
    return rawProducts
      .filter((p) => {
        const g = (p.gender || '').toLowerCase().trim();
        if (!g || g === 'unisex' || g === 'all') return true;
        return g === userGender;
      })
      .map((p) => {
        if (!p.name) return p;
        const strict = inferCategoryStrict(p.name, p.subcategory);
        if (!p.category) {
          return { ...p, category: strict ?? 'tops' };
        }
        // Only override when the name/subcategory CONFIDENTLY points to a
        // different bucket. If we couldn't strictly infer anything (strict
        // is null) we keep the shop-assigned category untouched — no need
        // to pretend a product is a top just because its name is unusual.
        if (strict && strict !== p.category) {
          return { ...p, category: strict };
        }
        return p;
      });
  }, [rawProducts, bodyParams.gender]);

  // Tags shown as chips inside each layer. Marketing tags (Новинки, Sale)
  // appear FIRST and are dedup'd against the regular subcategory list so a
  // category that exists both as a real hierarchy node and as a marketing
  // chip (e.g. some shops put "Новинки" as both) doesn't show twice.
  const tagsByCategory = useMemo(() => {
    const marketing: Record<string, string[]> = {};
    const subcats: Record<string, string[]> = {};
    for (const p of products) {
      if (!p.category) continue;
      if (p.marketingTag) {
        if (!marketing[p.category]) marketing[p.category] = [];
        if (!marketing[p.category].includes(p.marketingTag)) {
          marketing[p.category].push(p.marketingTag);
        }
      }
      if (p.subcategory) {
        if (!subcats[p.category]) subcats[p.category] = [];
        if (!subcats[p.category].includes(p.subcategory)) {
          subcats[p.category].push(p.subcategory);
        }
      }
    }
    const merged: Record<string, string[]> = {};
    const allCats = new Set([...Object.keys(marketing), ...Object.keys(subcats)]);
    for (const cat of allCats) {
      const m = marketing[cat] ?? [];
      const s = (subcats[cat] ?? []).filter((t) => !m.includes(t));
      merged[cat] = [...m, ...s];
    }
    return merged;
  }, [products]);

  // Set of marketing tag values across the catalogue — used by chip
  // rendering to distinguish hierarchy chips from merchandising chips.
  const marketingTagSet = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.marketingTag) set.add(p.marketingTag);
    }
    return set;
  }, [products]);

  const handleClothTypeClick = useCallback((key: string) => {
    // If the slot is already filled with a tried-on product, open its
    // size sheet so the user can change size / vendor / add to cart
    // without losing their current selection. To swap for a different
    // product they hit "Другие варианты" inside that sheet. Empty slots
    // open the category browser directly.
    const existing = selectedProducts.find((p) => p.category === key);
    if (existing) {
      setSizingProduct(existing);
      setShowSizes(true);
      setShowColors(false);
      setActiveGroup(null);
      setActiveClothType(null);
      setActiveTag(null);
      return;
    }
    setActiveClothType((prev) => {
      if (prev === key) {
        setActiveTag(null);
        return null;
      }
      const tags = tagsByCategory[key];
      const preferred = tags?.find((tag) => tag.toLowerCase() === 'новинки')
        ?? tags?.[0]
        ?? null;
      setActiveTag(preferred);
      return key;
    });
    setShowSizes(false);
    setShowColors(false);
    setActiveGroup(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsByCategory, selectedProducts]);

  const filteredProducts = products.filter((p) => {
    if (!activeClothType) return false;
    if (p.category !== activeClothType) return false;
    if (activeTag) {
      // activeTag may match either a marketing tag (Новинки/Sale) or a
      // subcategory (Платья/Юбки). Match on either field.
      const matches =
        (marketingTagSet.has(activeTag) && p.marketingTag === activeTag) ||
        p.subcategory === activeTag;
      if (!matches) return false;
    }
    return true;
  });

  const productGroups = useMemo(() => {
    const map = new Map<string, WidgetProduct[]>();
    for (const p of filteredProducts) {
      const key = p.sku ? getBaseSku(p.sku) : p.id;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    const groups = Array.from(map.entries()).map(([baseSku, variants]) => ({
      baseSku,
      variants,
    }));
    // Smart sort: products with user's size available come first
    const userSize = bodyParams.euSize;
    if (userSize) {
      groups.sort((a, b) => {
        const aHas = a.variants.some(v => v.sizeVariants && userSize in v.sizeVariants) ? 0 : 1;
        const bHas = b.variants.some(v => v.sizeVariants && userSize in v.sizeVariants) ? 0 : 1;
        return aHas - bHas;
      });
    }
    return groups;
  }, [filteredProducts, bodyParams.euSize]);

  const handleGroupClick = (group: ProductGroup) => {
    // If this group is already selected — deselect it
    const alreadySelected = selectedProducts.find(p => group.variants.some(v => v.id === p.id));
    if (alreadySelected) {
      deselectProduct(alreadySelected.id);
      // Wipe only this product's size — leave the other layers' sizes alone.
      setSizeByProduct((prev) => {
        if (!(alreadySelected.publicId in prev)) return prev;
        const { [alreadySelected.publicId]: _omit, ...rest } = prev;
        return rest;
      });
      setShowSizes(false);
      setShowColors(false);
      setActiveGroup(null);
      setSizingProduct(null);
      setAddedToCart(false);
      return;
    }

    setAddedToCart(false);
    // A group is only "multi-colour" if it actually contains >1 DISTINCT
    // colour/name combination. CS-Cart feeds often duplicate the same
    // product once per size SKU — without dedup we'd show 10 identical
    // colour chips. Count unique (colour, name) pairs before deciding.
    const uniqueKeys = new Set<string>();
    for (const v of group.variants) {
      const c = (v.color ?? '').trim().toLowerCase();
      const n = (v.name ?? '').trim().toLowerCase();
      uniqueKeys.add(c ? `c:${c}` : `n:${n}`);
    }
    const hasRealColours = uniqueKeys.size > 1 && group.variants.some((v) => v.color);
    if (hasRealColours) {
      setActiveGroup(group);
      setShowColors(true);
      setShowSizes(false);
    } else {
      const product = group.variants[0];
      selectProduct(product);
      setSizingProduct(product);
      setShowColors(false);
      setShowSizes(true);
    }
  };

  const handleColorSelect = (product: WidgetProduct) => {
    setAddedToCart(false);
    selectProduct(product);
    setSizingProduct(product);
    setShowColors(false);
    setShowSizes(true);
  };

  const tryOnCount = useWidgetStore((s) => s.tryOnCount);
  const isAuthenticated = useWidgetStore((s) => s.isAuthenticated);
  const incrementTryOnCount = useWidgetStore((s) => s.incrementTryOnCount);

  const [tryOnDisabled, setTryOnDisabled] = useState(false);

  const handleTryOn = async () => {
    console.log('[MML TryOn] 🖱️ handleTryOn called', { sessionToken, modelPhotoId, selectedProducts: selectedProducts.map(p => p.publicId), tryOnDisabled });
    if (!sessionToken || !modelPhotoId || selectedProducts.length === 0 || tryOnDisabled) {
      console.log('[MML TryOn] ❌ guard failed', { sessionToken: !!sessionToken, modelPhotoId, productsCount: selectedProducts.length, tryOnDisabled });
      return;
    }
    setTryOnDisabled(true);
    setTimeout(() => setTryOnDisabled(false), 2000); // 2s debounce

    // Monthly try-on limit from admin panel; 0 = unlimited (no auth gate)
    const monthlyLimit = config?.monthlyTryOnLimit ?? 0;
    if (monthlyLimit > 0 && tryOnCount >= monthlyLimit && !isAuthenticated) {
      console.log('[MML TryOn] ⚠️ limit reached, redirecting to auth', { tryOnCount, monthlyLimit });
      goToStage('auth');
      return;
    }

    if (pollAbortRef.current) {
      console.log('[MML TryOn] 🔄 aborting previous poll');
      pollAbortRef.current.abort();
    }
    const abortCtrl = new AbortController();
    pollAbortRef.current = abortCtrl;

    const epoch = ++tryOnEpoch.current;
    setLoading(true);
    try {
      const productIds = selectedProducts.map((p) => p.publicId);
      // Snapshot of the product set that's being sent to this render. When the
      // result comes back we mark exactly these products as "worn" — so the ×
      // clear affordance only appears on tiles whose garment is actually on
      // the current result image, not on tiles the user has merely picked.
      const snapshotProductIds = selectedProducts.map((p) => p.id);
      console.log('[MML TryOn] 🚀 POST /tryon', {
        session: sessionToken,
        model_photo_id: modelPhotoId,
        product_ids: productIds,
        products: selectedProducts.map((p) => ({ name: p.name, publicId: p.publicId, category: p.category })),
        epoch,
      });

      const accepted = await requestTryOn(sessionToken, modelPhotoId, productIds);
      console.log('[MML TryOn] ✅ accepted', { tryOnId: accepted.public_id, epochMatch: epoch === tryOnEpoch.current });
      if (epoch !== tryOnEpoch.current) return;

      console.log('[MML TryOn] ⏳ polling start', accepted.public_id);
      const result = await pollTryOnResult(sessionToken, accepted.public_id, abortCtrl.signal);
      console.log('[MML TryOn] 🎉 poll done', { status: result.status, result_url: result.result_url, result_key: result.result_key });
      if (epoch !== tryOnEpoch.current) return;

      if (result.result_url) {
        setTryOnUrl(result.result_url);
        setTryOnKey(result.result_key ?? null);
        setLastTryOnId(result.public_id);
        addTryOnHistory(result.result_url);
        incrementTryOnCount();
        setWornProductIds(snapshotProductIds);
      }
    } catch (err) {
      if (epoch !== tryOnEpoch.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[MML TryOn] 🛑 aborted by user');
        return;
      }
      const status = (err as AxiosError)?.response?.status;
      console.error('[MML TryOn] ❌ error', { httpStatus: status, err });
      if (status === 429) {
        toast.error(t('showroom.limitExceeded'));
      } else {
        toast.error(t('showroom.tryOnFailed'));
      }
    } finally {
      if (epoch === tryOnEpoch.current) setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!displayUrl || !sessionToken) return;

    if (isFavorite) {
      // Remove from favorites
      const favId = favoriteIds[displayUrl];
      if (favId) {
        try {
          await deleteFavorite(sessionToken, favId);
          setFavoriteIds((prev) => {
            const next = { ...prev };
            delete next[displayUrl];
            return next;
          });
        } catch {
          // ignore
        }
      }
      toggleFavorite(displayUrl);
    } else {
      try {
        const imageKey = tryOnKey ?? displayUrl.split('/').pop() ?? displayUrl;
        const fav = await addFavorite(
          sessionToken,
          imageKey,
          lastTryOnId ?? undefined,
        );
        setFavoriteIds((prev) => ({ ...prev, [displayUrl]: fav.public_id }));
        toggleFavorite(displayUrl);
        setFavSnackbar(true);
        setTimeout(() => setFavSnackbar(false), 3000);
      } catch {
        toast.error(t('common.error'));
      }
    }
  };

  const addProductToCSCart = async (product: WidgetProduct, overrideCsCartId?: string): Promise<boolean> => {
    // Use the size picked for THIS product specifically (per-product map),
    // not the global selectedSize which may belong to a different layer.
    const sizeForThis = getSizeFor(product.publicId);
    const w = window as unknown as Record<string, unknown>;
    const pageMap = (w.__mmlPageProductIds as Record<string, string> | undefined) || {};
    const pageId = pageMap[product.publicId] || (product.externalId ? pageMap[product.externalId] : undefined);
    const cartProductId =
      overrideCsCartId ||
      pageId ||
      (sizeForThis && product.sizeVariants?.[sizeForThis]
        ? product.sizeVariants[sizeForThis]
        : product.externalId) ||
      '';
    console.log('[MML Cart] start', {
      productName: product.name,
      publicId: product.publicId,
      externalId: product.externalId,
      sizeForThis,
      overrideCsCartId,
      pageId,
      cartProductId,
      hasSizes: !!product.sizeVariants && Object.keys(product.sizeVariants).length > 0
    });
    if (!cartProductId) {
      console.warn('[MML Cart] no cartProductId — cannot add');
      return false;
    }
    // When the user picked a size that isn't the PDP's current variation,
    // we need the *master* id of that size so the iframe fallback can
    // load the correct storefront page. Without it the iframe path can't
    // find the vendor button.
    const masterVariationId =
      sizeForThis && product.sizeVariants?.[sizeForThis]
        ? product.sizeVariants[sizeForThis]
        : product.externalId || undefined;
    // Skip the iframe fallback entirely for items that don't have sizes
    // (shoes, belts, accessories) — we're not switching variations, so
    // the iframe's 5-second wait would just waste time before the
    // ceAjax/fetch path runs anyway.
    const productHasSizes =
      !!product.sizeVariants && Object.keys(product.sizeVariants).length > 0;
    const skipIframe = !productHasSizes;
    console.log('[MML Cart] calling addToCSCart', { cartProductId, masterVariationId, skipIframe });

    // Ground truth: capture the storefront's own cart counter BEFORE the
    // add. CS-Cart's ceAjax sometimes resolves "ok" while silently dropping
    // items (e.g. the product was redirected to /nosale/ because the
    // vendor-offer prefetch failed and we ended up sending a plain
    // product_id that no vendor actually sells). The only reliable signal
    // that something actually landed in the basket is the header counter.
    const readCartCount = (): number => {
      const nodes = document.querySelectorAll('[id^="cart_status_"]');
      for (const node of Array.from(nodes)) {
        const raw = (node.textContent ?? '').trim();
        const m = raw.match(/(\d+)/);
        if (m) return parseInt(m[1], 10);
      }
      return -1;
    };
    const cartCountBefore = readCartCount();

    try {
      await addToCSCart(cartProductId, masterVariationId, skipIframe);
    } catch (err) {
      console.warn('[MML Cart] ❌ CS-Cart add-to-cart threw', err);
      return false;
    }

    // Wait up to 2s for the header counter to tick up. If it doesn't,
    // ceAjax/fetch lied about success — treat as failure so the buyer
    // sees the error toast instead of a phantom "добавлено".
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      const now = readCartCount();
      if (now > cartCountBefore) {
        console.log('[MML Cart] ✅ counter went', cartCountBefore, '→', now);
        return true;
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    const finalCount = readCartCount();
    console.warn('[MML Cart] ❌ counter never changed', { cartCountBefore, finalCount });
    return false;
  };

  const handleAddToCart = async () => {
    if (!sessionToken) return;
    // Add-to-cart operates on ONE product — the item whose size-sheet the
    // user is currently looking at. Iterating over every selected product
    // (the old behaviour) caused "clicked on jeans → bag landed in cart"
    // because the bag was selectedProducts[0].
    const target = sizingProduct ?? selectedProducts[0];
    if (!target) return;
    const targetSize = getSizeFor(target.publicId);

    if (isCSCartSite()) {
      const hasSizes = !!target.sizeVariants && Object.keys(target.sizeVariants).length > 0;
      if (hasSizes && !targetSize) {
        // Open size sheet — user must pick a size before we can resolve vendors.
        setSizingProduct(target);
        setShowSizes(true);
        toast(t('showroom.pickSizeFirst'));
        return;
      }
      const w = window as unknown as Record<string, unknown>;
      const ensure = w.__mmlEnsureOffers as ((key: string) => Promise<void>) | undefined;

      const pickOffers = (): VendorOffer[] => {
        const sizeOffersMap = (w.__mmlSizeVendorOffers as Record<string, Record<string, VendorOffer[]>> | undefined) || {};
        const offersMap = (w.__mmlVendorOffers as Record<string, VendorOffer[]> | undefined) || {};
        const sizeTable =
          sizeOffersMap[target.publicId] ||
          (target.externalId ? sizeOffersMap[target.externalId] : undefined);
        return (
          (targetSize && sizeTable?.[targetSize]) ||
          offersMap[target.publicId] ||
          (target.externalId ? offersMap[target.externalId] : undefined) ||
          []
        );
      };

      let offers = pickOffers();
      // Prefetch hasn't completed yet (widget opened from a catalog hover
      // rather than a PDP). Wait with a visible toast.
      if (offers.length === 0 && ensure && target.externalId) {
        const loadingId = toast.loading(t('showroom.loadingVendors'));
        try {
          await ensure(target.externalId);
        } finally {
          toast.dismiss(loadingId);
        }
        offers = pickOffers();
      }

      if (offers.length > 1) {
        setVendorPicker({ offers, productPublicId: target.publicId });
        return;
      }
      if (offers.length === 1) {
        await finalizeAddToCart(target, offers[0].productId);
        return;
      }
    }

    await finalizeAddToCart(target);
  };

  const finalizeAddToCart = async (product: WidgetProduct, chosenVendorProductId?: string) => {
    if (!sessionToken) return;
    let externalAddOk = true;
    let externalAddAttempted = false;

    const loadingId = toast.loading(t('showroom.addingToCart'));
    try {
      // Add only THIS product — never iterate over selectedProducts. The
      // cart action is scoped to the size-sheet the user was looking at,
      // not the entire outfit.
      if (product.externalId && isCSCartSite()) {
        externalAddAttempted = true;
        const ok = await addProductToCSCart(product, chosenVendorProductId);
        if (!ok) externalAddOk = false;
      }
      // Persist to MML backend for analytics / history — failures are
      // swallowed so they don't block the cart UI.
      try {
        await addCartItem(sessionToken, product.publicId, lastTryOnId ?? undefined);
      } catch (err) {
        console.warn('[MML] backend cart persist failed (non-fatal)', err);
      }
    } finally {
      toast.dismiss(loadingId);
    }

    if (externalAddAttempted && !externalAddOk) {
      toast.error(t('common.error'));
      // Do not flip button to "Added" — user should retry or open product page
      return;
    }
    // Show a visible success toast on top of everything (including our own
    // widget modal). Some store themes suppress their native "added" popup
    // when the click isn't a user gesture, so the widget owes the user
    // feedback explicitly. `react-hot-toast` renders at the top of the DOM
    // with a z-index that beats the widget's own layers.
    toast.success(t('showroom.addedToCartSuccess'), {
      duration: 3500,
      style: { zIndex: 2147483647 },
    });
    setAddedToCart(true);
  };

  const handleTakeOff = () => {
    if (!tryOnUrl && selectedProducts.length === 0) {
      toast(t('showroom.nothingWorn'));
      return;
    }
    tryOnEpoch.current++;
    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
      pollAbortRef.current = null;
    }
    setLoading(false);
    clearTryOn();
    // Keep lastTryOnId so share link persists until next try-on completes
    setAddedToCart(false);
    // Reset every layer's picked size — takeItOff wipes the whole outfit.
    setSizeByProduct({});
    setSizingProduct(null);
    setShowSizes(false);
    setShowColors(false);
    setActiveGroup(null);
  };

  return (
    <div className={`relative w-full h-full overflow-hidden rounded-[24px] bg-white ${isLoading ? 'mml-showroom--image-loading' : ''}`}>
      {/* Blurred backdrop — same image zoomed and blurred. Fills the whole
          frame with color/tone from the photo so the "contain" layer below
          has a soft, color-matched border instead of empty white bars. */}
      {displayUrl && (
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url(${displayUrl})`,
            filter: 'blur(28px) saturate(1.1)',
            transform: 'scale(1.2)',
          }}
        />
      )}
      {/* Main image — fit without cropping (contain) so the model's head and
          feet are never clipped. The blurred backdrop above fills the gaps. */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat"
        style={
          displayUrl
            ? { backgroundImage: `url(${displayUrl})`, backgroundSize: 'contain' }
            : undefined
        }
      />

      {/* Loader overlay */}
      {isLoading && (
        <>
          <TryOnLoader />
          <button
            className="absolute bottom-[24px] left-1/2 -translate-x-1/2 z-[9] bg-white/20 backdrop-blur-[5px] text-white rounded-full px-[24px] py-[10px] font-['Inter',sans-serif] text-[14px] font-medium cursor-pointer border border-white/30"
            onClick={handleTakeOff}
          >
            {t('common.close')}
          </button>
        </>
      )}

      {/* Left panel — outfit layers */}
      {!isFullview && <div className="absolute left-[16px] top-[16px] flex flex-col gap-[6px] z-[4]">
        {clothTypeKeys.map((key) => {
          const selected = selectedProducts.find(p => p.category === key);
          return (
            <div
              key={key}
              className={`mml-layer-card ${activeClothType === key ? 'mml-layer-card--active' : ''} ${selected ? 'mml-layer-card--filled' : ''}`}
              onClick={() => handleClothTypeClick(key)}
              onPointerDown={(e) => {
                if (!selected) return;
                // Swipe-up still works as a power-user shortcut, but the ×
                // button (rendered below) is the primary "clear this layer"
                // affordance. If the pointer starts on the × we bail out —
                // otherwise long-press on the badge would race with swipe.
                if ((e.target as HTMLElement).closest('[data-mml-layer-clear]')) return;
                const startY = e.clientY;
                const el = e.currentTarget;
                const handleUp = (ev: PointerEvent) => {
                  const dy = startY - ev.clientY;
                  if (dy > 40) {
                    // Swipe up — remove this garment
                    const product = selectedProducts.find(p => p.category === key);
                    if (product) {
                      deselectProduct(product.id);
                      el.style.transform = '';
                      el.style.opacity = '';
                    }
                  } else {
                    el.style.transform = '';
                    el.style.opacity = '';
                  }
                  document.removeEventListener('pointerup', handleUp);
                  document.removeEventListener('pointermove', handleMove);
                };
                const handleMove = (ev: PointerEvent) => {
                  const dy = startY - ev.clientY;
                  if (dy > 0) {
                    el.style.transform = `translateY(-${Math.min(dy, 60)}px)`;
                    el.style.opacity = String(Math.max(0.3, 1 - dy / 80));
                  }
                };
                document.addEventListener('pointerup', handleUp);
                document.addEventListener('pointermove', handleMove);
              }}
            >
              <div className="absolute inset-0 bg-white rounded-[12px]" />
              {selected ? (
                <>
                  <img
                    src={selected.thumbnailUrl || selected.photoUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover rounded-[12px]"
                  />
                  {/* Size badge for THIS layer's selected product. Reads
                      the per-product size map so every layer shows its own
                      size rather than whichever one the user picked last. */}
                  {getSizeFor(selected.publicId) && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] bg-[#1a1a1a] rounded-[24px] min-w-[32px] h-[24px] flex items-center justify-center px-[8px]">
                      <span className="font-['Inter',sans-serif] font-medium text-[15px] text-white leading-[20px] tracking-[-0.2px]">
                        {getSizeFor(selected.publicId)}
                      </span>
                    </div>
                  )}
                  {/* Clear-this-layer × button. Shown ONLY for products that
                      are actually rendered in the current try-on image —
                      not the moment a user picks a product (that would
                      imply "you can remove this" before the render even
                      exists). Separate action from tapping the tile
                      (which opens the size sheet). Clearing ALSO opens the
                      carousel for the same category so the user can pick a
                      replacement in one flow; they still have to press
                      "Примерить (N)" to kick off a new try-on.
                      Positioned with negative offsets so it overhangs the
                      tile frame (the parent .mml-layer-card no longer clips
                      overflow). */}
                  {wornProductIds.includes(selected.id) && (
                    <button
                      type="button"
                      data-mml-layer-clear
                      aria-label={t('showroom.clearLayer')}
                      className="absolute -top-[8px] -right-[8px] z-[5] w-[22px] h-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] flex items-center justify-center cursor-pointer hover:bg-[#f5f5f5] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        deselectProduct(selected.id);
                        // Open carousel for this category (same slot).
                        // setActiveClothType direct value, not toggle — we want
                        // the carousel to open regardless of prior state.
                        setActiveClothType(key);
                        const tags = tagsByCategory[key];
                        const preferred = tags?.find((tag) => tag.toLowerCase() === 'новинки')
                          ?? tags?.[0]
                          ?? null;
                        setActiveTag(preferred);
                        setShowSizes(false);
                        setShowColors(false);
                        setActiveGroup(null);
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M2 2l6 6M8 2l-6 6" />
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-[4px]">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#a5a7ad" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                  <span className="font-['Inter',sans-serif] text-[8px] text-[#a5a7ad] font-medium uppercase tracking-[0.3px] text-center leading-[10px] px-[4px]">
                    {t(CLOTH_TYPE_LABELS[key])}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>}

      {/* Right panel — action buttons (top-[80px] to avoid close button overlap) */}
      <div className="absolute right-[16px] top-[80px] flex flex-col gap-[8px] z-[4]">
        {/* Menu */}
        <button
          className="bg-white rounded-full size-[60px] flex items-center justify-center shadow-sm cursor-pointer"
          onClick={() => goToStage('settings')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="4" r="1.5" fill="#1a1a1a" />
            <circle cx="10" cy="10" r="1.5" fill="#1a1a1a" />
            <circle cx="10" cy="16" r="1.5" fill="#1a1a1a" />
          </svg>
        </button>
        {/* Expand / Minimize */}
        <button
          className="bg-white rounded-full size-[60px] flex items-center justify-center shadow-sm cursor-pointer"
          onClick={() => setIsFullview((v) => !v)}
        >
          {isFullview ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14h4v4M16 6h-4V2M14 14h4v-4M6 6H2v4" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2h4v4M6 18H2v-4M18 14v4h-4M2 6V2h4" />
            </svg>
          )}
        </button>
        {/* Favorite (hidden if favorites disabled in admin) */}
        {(config?.elementsEnabled?.favorites ?? true) && (
          <button
            className={`rounded-full size-[60px] flex items-center justify-center shadow-sm cursor-pointer ${isFavorite ? 'bg-black' : 'bg-white'}`}
            onClick={handleToggleFavorite}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill={isFavorite ? 'white' : 'none'} stroke={isFavorite ? 'white' : '#1a1a1a'} strokeWidth="1.5">
              <path d="M10 17.5s-7-4.5-7-9.5a4 4 0 017-2.5A4 4 0 0117 8c0 5-7 9.5-7 9.5z" />
            </svg>
          </button>
        )}
        {/* Share */}
        <button
          className="bg-white rounded-full size-[60px] flex items-center justify-center shadow-sm cursor-pointer"
          onClick={() => setShowShare(true)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="15" cy="4" r="2.5" />
            <circle cx="5" cy="10" r="2.5" />
            <circle cx="15" cy="16" r="2.5" />
            <path d="M7.5 11l5 4M12.5 5l-5 4" />
          </svg>
        </button>
      </div>

      {/* Bottom panel — category button + product cards */}
      {!isFullview && <div className="mml-showroom__bottom-panel absolute bottom-[16px] left-[16px] right-[16px] flex flex-col justify-end gap-[10px] z-[4]">
        {/* Category button — opens subcategory popup */}
        {activeClothType && (
          <button
            className="bg-[#1a1a1a] rounded-[7px] flex items-center justify-between px-[14px] py-[10px] w-[180px] cursor-pointer"
            onClick={() => setShowSubcategories(true)}
          >
            <span className="font-['Inter',sans-serif] font-medium text-[14px] text-white leading-[20px] tracking-[-0.16px] pr-[10px]">
              {activeTag || t(CLOTH_TYPE_LABELS[activeClothType])}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7h10M7 7v10" />
            </svg>
          </button>
        )}

        {/* Product cards scroll */}
        {activeClothType && (
          <ProductCarousel>
            {productGroups.map((group) => {
              const selectedInGroup = selectedProducts.find(p => group.variants.some(v => v.id === p.id));
              const isSelected = !!selectedInGroup;
              const sizeForCard = selectedInGroup ? getSizeFor(selectedInGroup.publicId) : null;
              return (
                <div
                  key={group.baseSku}
                  className={`relative flex flex-col items-center justify-between h-[130px] w-[98px] shrink-0 rounded-[9px] overflow-hidden cursor-pointer bg-[#f6f6f6] ${
                    isSelected ? 'shadow-[0px_4px_16px_0px_rgba(17,17,26,0.1),0px_8px_32px_0px_rgba(17,17,26,0.05)]' : ''
                  }`}
                  onClick={() => handleGroupClick(group)}
                >
                  <img
                    src={group.variants[0].thumbnailUrl || group.variants[0].photoUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
                  />
                  {isSelected && sizeForCard && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="bg-[#1a1a1a] rounded-[24px] min-w-[32px] h-[24px] flex items-center justify-center px-[8px]">
                        <span className="font-['Inter',sans-serif] font-medium text-[15px] text-white leading-[20px] tracking-[-0.2px]">
                          {sizeForCard}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </ProductCarousel>
        )}

        {/* Try On button — always visible when products selected */}
        {selectedProducts.length > 0 && !isLoading && (
          <div className="flex justify-center gap-[8px]">
            <button
              className="bg-[#1a1a1a] text-white rounded-full h-[48px] px-[32px] font-['Inter',sans-serif] font-medium text-[15px] tracking-[-0.2px] cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
              onClick={() => {
                console.log('[MML TryOn] 🔘 button onClick fired');
                handleTryOn();
              }}
            >
              {t('showroom.tryOn')} ({selectedProducts.length})
            </button>
            {/* Reset / take-off: one button that changes wording by state.
                Before try-on it reads "Сбросить" (clears the picked layers);
                after try-on it reads "Снять" (also wipes the generated
                image). Both call the same handler. */}
            <button
              className="bg-white text-[#1a1a1a] rounded-full h-[48px] px-[24px] font-['Inter',sans-serif] font-medium text-[14px] cursor-pointer shadow-sm"
              onClick={handleTakeOff}
            >
              {tryOnUrl ? t('showroom.takeItOff') : t('showroom.resetSelection')}
            </button>
            {tryOnUrl && false && (
              <button
                className="bg-white text-[#1a1a1a] rounded-full h-[48px] px-[24px] font-['Inter',sans-serif] font-medium text-[14px] cursor-pointer shadow-sm"
                onClick={handleTakeOff}
              >
                {t('showroom.takeItOff')}
              </button>
            )}
          </div>
        )}
      </div>}

      {/* Favorite snackbar */}
      {favSnackbar && (
        <div className="absolute bottom-[16px] left-0 right-0 flex justify-center z-[5]">
        <div className="bg-white rounded-[8px] flex items-center overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
          <div className="pl-[12px] py-[14px]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="#ef4444" stroke="#ef4444" strokeWidth="1.5">
              <path d="M10 17.5s-7-4.5-7-9.5a4 4 0 017-2.5A4 4 0 0117 8c0 5-7 9.5-7 9.5z" />
            </svg>
          </div>
          <div className="flex-1 px-[8px] py-[12px] font-['Inter',sans-serif] text-[14px] tracking-[-0.42px] text-black whitespace-nowrap">
            {t('showroom.addedToFavorites')}
          </div>
          <button
            className="bg-[#e9e9e9] rounded-[4px] px-[8px] py-[6px] mr-[8px] font-['Inter',sans-serif] font-medium text-[13px] text-[#2c2d2e] cursor-pointer whitespace-nowrap"
            onClick={() => { setFavSnackbar(false); goToStage('favorites'); }}
          >
            {t('showroom.goToFavorites')}
          </button>
        </div>
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <div className="absolute inset-0 z-[7] backdrop-blur-[8px] bg-black/40 flex items-center justify-center" onClick={() => setShowShare(false)}>
          <div className="relative bg-white rounded-[20px] p-[24px] pt-[36px] pb-[42px] w-[428px] max-w-[calc(100%-48px)] flex flex-col items-center gap-[32px]" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-[12px] left-[12px] size-[36px] rounded-full flex items-center justify-center cursor-pointer bg-transparent border-none hover:bg-[#f6f6f6]"
              onClick={() => setShowShare(false)}
              aria-label="Back"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4L6 9l5 5" />
              </svg>
            </button>
            <div className="flex flex-col items-center gap-[4px] py-[3px] text-center w-full">
              <h2 className="font-['Inter',sans-serif] font-semibold text-[20px] leading-[26px] tracking-[-0.6px] text-[#1a1a1a]">{t('showroom.shareTitle')}</h2>
              <p className="font-['Inter',sans-serif] text-[13px] leading-[18px] text-[#1a1a1a]">{t('showroom.shareSubtitle')}</p>
            </div>
            <div className="flex flex-col gap-[24px] w-full">
              <div className="flex items-center border border-[#c7c9d0]/50 rounded-[8px] px-[12px] py-[5px] w-full">
                <span className="flex-1 text-[15px] text-[#2c2d2e] truncate">{lastTryOnId ? getShareUrl(lastTryOnId) : ''}</span>
                <button
                  className="shrink-0 ml-[8px] p-[12px] cursor-pointer bg-transparent border-none"
                  onClick={async () => {
                    const url = lastTryOnId ? getShareUrl(lastTryOnId) : '';
                    try {
                      await navigator.clipboard.writeText(url);
                    } catch {
                      const ta = document.createElement('textarea');
                      ta.value = url;
                      ta.style.position = 'fixed';
                      ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                    }
                    toast(t('showroom.copied'));
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"><path d="M8 12l4-4M7 10a3 3 0 01-3-3V6a3 3 0 013-3h1M13 10a3 3 0 003-3V6a3 3 0 00-3-3h-1M7 10v1a3 3 0 003 3h0a3 3 0 003-3v-1" /></svg>
                </button>
              </div>
              <div className="flex flex-col gap-[8px]">
                <button
                  className="w-full h-[60px] bg-[#e9e9e9] rounded-full font-['Inter',sans-serif] font-medium text-[15px] text-[#2c2d2e] cursor-pointer"
                  onClick={async () => {
                    if (!displayUrl) return;
                    await downloadImage(displayUrl, 'makeme-look.jpg');
                    setShowShare(false);
                  }}
                >
                  {t('showroom.save')}
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-[16px] w-full">
              <p className="font-['Inter',sans-serif] font-medium text-[15px] text-black">{t('showroom.shareIn')}</p>
              <div className="flex gap-[8px] justify-center">
                {/* Instagram — save image, then user shares manually */}
                <button
                  className="size-[60px] rounded-full border border-[#e9e9e9] flex items-center justify-center cursor-pointer bg-transparent"
                  onClick={async () => {
                    if (!displayUrl) return;
                    const ok = await downloadImage(displayUrl, 'makeme-look-instagram.jpg');
                    if (ok) toast(t('showroom.savedForInstagram'));
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="#E1306C" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke="#E1306C" strokeWidth="1.5"/><circle cx="18" cy="6" r="1" fill="#E1306C"/></svg>
                </button>
                {/* Telegram */}
                <a className="size-[60px] rounded-full border border-[#e9e9e9] flex items-center justify-center cursor-pointer" href={`https://t.me/share/url?url=${encodeURIComponent(lastTryOnId ? getShareUrl(lastTryOnId) : '')}`} target="_blank" rel="noopener">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#229ED9"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.53 8.15l-1.86 8.77c-.14.63-.51.78-1.03.49l-2.85-2.1-1.37 1.32c-.15.15-.28.28-.57.28l.2-2.9 5.25-4.74c.23-.2-.05-.32-.36-.12L8.54 13.7l-2.82-.88c-.61-.19-.62-.61.13-.91l11.03-4.25c.51-.19.95.12.79.91l-.14-.42z"/></svg>
                </a>
                {/* VK */}
                <a className="size-[60px] rounded-full border border-[#e9e9e9] flex items-center justify-center cursor-pointer" href={`https://vk.com/share.php?url=${encodeURIComponent(lastTryOnId ? getShareUrl(lastTryOnId) : '')}`} target="_blank" rel="noopener">
                  <svg width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" rx="10" fill="#07f"/><path d="M10.4 14.4c-4.7 0-7.4-3.2-7.5-8.5h2.4c.1 3.9 1.8 5.5 3.1 5.9V5.9h2.2v3.3c1.3-.1 2.7-1.7 3.1-3.3h2.2c-.3 2-1.8 3.6-2.8 4.2 1 .5 2.8 1.9 3.4 4.3h-2.4c-.5-1.5-1.7-2.7-3.5-2.9v2.9h-.2z" fill="#fff"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Colors panel (bottom sheet) */}
      {showColors && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] p-[24px] z-[5] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-[16px]">
            <h3 className="font-['Inter',sans-serif] font-semibold text-[17px] text-[#1a1a1a] truncate">
              {activeGroup?.variants[0].name || ''}
            </h3>
            <button className="p-[8px] cursor-pointer" onClick={() => setShowColors(false)}>
              <svg width="12" height="12" viewBox="0 0 12 12" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-[8px]">
            {(() => {
              // Dedupe variants by (colour, name). CS-Cart feeds often emit
              // one row per size SKU — without this filter the colour
              // picker shows N identical "Чёрный" chips.
              const seen = new Set<string>();
              const unique = (activeGroup?.variants ?? []).filter((v) => {
                const key = `${(v.color ?? '').trim().toLowerCase()}|${(v.name ?? '').trim().toLowerCase()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              return unique.map((variant) => (
                <div
                  key={variant.id}
                  className={`px-[16px] py-[10px] rounded-full text-[14px] font-medium cursor-pointer ${
                    selectedProducts.some(p => p.id === variant.id)
                      ? 'bg-[#1a1a1a] text-white'
                      : 'bg-[#f6f6f6] text-[#1a1a1a]'
                  }`}
                  onClick={() => handleColorSelect(variant)}
                >
                  {variant.color || variant.name}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Vendor picker — Multi-Vendor CS-Cart stores can have several sellers
          for the same product at different prices; the user must choose one. */}
      {vendorPicker && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] p-[24px] z-[20] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] max-h-[70%] overflow-y-auto">
          <div className="flex items-center justify-between mb-[8px]">
            <h3 className="font-['Inter',sans-serif] font-semibold text-[17px] text-[#1a1a1a]">
              {t('showroom.pickVendor')}
            </h3>
            <button className="p-[8px] cursor-pointer" onClick={() => setVendorPicker(null)}>
              <svg width="12" height="12" viewBox="0 0 12 12" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>
          <div className="text-[13px] text-[#a5a7ad] mb-[12px]">
            {t('showroom.pickVendorHint')}
          </div>
          <div className="flex flex-col gap-[8px]">
            {vendorPicker.offers.map((offer) => (
              <button
                key={offer.productId}
                className="flex items-center justify-between gap-[12px] w-full p-[12px] rounded-[12px] bg-[#f6f6f6] hover:bg-[#ececec] text-left cursor-pointer"
                onClick={async () => {
                  const chosen = offer.productId;
                  const target =
                    selectedProducts.find((p) => p.publicId === vendorPicker.productPublicId) ??
                    sizingProduct ??
                    selectedProducts[0];
                  setVendorPicker(null);
                  if (target) await finalizeAddToCart(target, chosen);
                }}
              >
                <span className="font-['Inter',sans-serif] text-[14px] text-[#1a1a1a] flex-1">
                  {offer.name}
                </span>
                {offer.price && (
                  <span className="font-['Inter',sans-serif] font-semibold text-[14px] text-[#1a1a1a] whitespace-nowrap">
                    {offer.price}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sizes panel (bottom sheet) */}
      {showSizes && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] p-[24px] z-[5] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-[4px]">
            <h3 className="font-['Inter',sans-serif] font-semibold text-[17px] text-[#1a1a1a] truncate">
              {sizingProduct?.name || ''}
            </h3>
            <button className="p-[8px] cursor-pointer" onClick={() => setShowSizes(false)}>
              <svg width="12" height="12" viewBox="0 0 12 12" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>
          <div className="text-[13px] mb-[12px]">
            {/* Skip the "рекомендуемый размер" hint for shoes and accessories —
                our size chart is for clothing (bust/waist/hip), it has no
                footwear mapping, so any auto-pick would be misleading. */}
            {sizingProduct?.category === 'shoes' || sizingProduct?.category === 'accessories' ? null
              : sizeRecLoading ? (
                <span className="text-[#a5a7ad]">{t('showroom.calculatingSize')}</span>
              ) : sizeRec ? (
                <>
                  <span className="text-[#a5a7ad]">
                    {t('showroom.recommendedSize')}: <span className="text-[#1a1a1a] font-semibold">{sizeRec.recommended_size}</span>
                  </span>
                  {sizeRec.out_of_chart && (
                    <div className="mt-[6px] text-[12px] text-[#c25a00]">
                      {t('showroom.outOfChart')}
                    </div>
                  )}
                </>
              ) : null}
          </div>
          {(() => {
            // Clothing categories only have Latin-letter + numeric sizes; if a
            // product's sizeVariants are polluted with both kinds (e.g. a pair
            // of boots whose feature list ended up with XS/XXS from some
            // other taxonomy), keep only the sizes that make sense for the
            // product's actual category.
            const rawSizes = sizingProduct?.sizeVariants
              ? Object.keys(sizingProduct.sizeVariants)
              : [];
            const isShoeSize = (s: string) => /^[0-9]{2,3}(\.[05])?$/.test(s.trim());
            const isClothSize = (s: string) => /^(XX?S|S|M|L|XX?L)$/i.test(s.trim()) || /^\d{2}\s*(XS|S|M|L|XL|XXL|XXS)$/i.test(s.trim());
            const unsortedSizes = sizingProduct?.category === 'shoes'
              ? rawSizes.filter(isShoeSize)
              : sizingProduct?.category === 'accessories'
                ? rawSizes  // accessories can have any — leave as is
                : rawSizes.filter(isClothSize);

            // Canonical ordering: letter sizes small→big, then numeric
            // fallback for shoes/accessories so users always see a
            // monotonic list regardless of how the feed delivers sizes.
            const LETTER_ORDER: Record<string, number> = {
              XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, XXXL: 7
            };
            const sizes = [...unsortedSizes].sort((a, b) => {
              const ia = LETTER_ORDER[a.trim().toUpperCase()];
              const ib = LETTER_ORDER[b.trim().toUpperCase()];
              if (ia !== undefined && ib !== undefined) return ia - ib;
              if (ia !== undefined) return -1;
              if (ib !== undefined) return 1;
              const na = parseFloat(a);
              const nb = parseFloat(b);
              if (!isNaN(na) && !isNaN(nb)) return na - nb;
              return a.localeCompare(b);
            });
            if (sizes.length === 0) {
              // No real size data for this product — don't fake a tab row
              // of XXS..XXL that misleads the buyer. Show a neutral note
              // instead.
              return (
                <div className="text-[13px] text-[#a5a7ad] mb-[16px]">
                  {t('showroom.sizesUnavailable')}
                </div>
              );
            }
            return (
              <div className="flex flex-wrap gap-[8px] mb-[16px]">
                {sizes.map((size) => {
                  const isRec = sizeRec?.recommended_size === size;
                  return (
                    <div
                      key={size}
                      className={`min-w-[48px] h-[40px] flex items-center justify-center rounded-full text-[14px] font-medium cursor-pointer px-[12px] ${
                        selectedSize === size
                          ? 'bg-[#1a1a1a] text-white'
                          : isRec
                            ? 'bg-[#e9f5e9] text-[#1a1a1a] ring-1 ring-green-400'
                            : 'bg-[#f6f6f6] text-[#1a1a1a]'
                      }`}
                      onClick={() => {
                        // Keep the size sheet open after picking — users
                        // want to switch sizes without re-opening the
                        // sheet, and the "Примерить" / "В корзину" /
                        // "Посмотреть другие варианты" actions live in
                        // this same sheet. Dismissing it on a size click
                        // hid the buttons the user was reaching for.
                        setSelectedSize(size);
                        // Also cache the selected size for this specific
                        // product so the try-on / cart paths pick it up.
                        if (sizingProduct) {
                          setSizeByProduct((prev) => ({
                            ...prev,
                            [sizingProduct.publicId]: size
                          }));
                        }
                      }}
                    >
                      {size}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="flex flex-col gap-[8px]">
            {/* Try on button inside size sheet */}
            {selectedProducts.length > 0 && !isLoading && (
              <button
                className="w-full h-[48px] rounded-full font-medium text-[15px] bg-[#1a1a1a] text-white cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                onClick={() => {
                  setShowSizes(false);
                  setActiveClothType(null);
                  handleTryOn();
                }}
              >
                {t('showroom.tryOn')} ({selectedProducts.length})
              </button>
            )}
            <div className="flex gap-[8px]">
              {/* Disable "В корзину" when the recommended size is only a
                  best-effort "closest" pick because the user's real size
                  isn't in the chart. CS-Cart otherwise silently refuses
                  the add (no SKU for that size) and the buyer thinks the
                  product landed in the basket when it didn't. */}
              {sizeRec?.out_of_chart ? (
                <button
                  type="button"
                  disabled
                  title={t('showroom.cartDisabledOutOfChart')}
                  className="flex-1 h-[48px] rounded-full font-medium text-[14px] bg-[#f6f6f6] text-[#9a9a9a] cursor-not-allowed"
                  onClick={() =>
                    toast(t('showroom.cartDisabledOutOfChart'), {
                      icon: '⚠️',
                      duration: 4000,
                      style: {
                        background: '#fff4e5',
                        color: '#8a4b00',
                        fontSize: '14px',
                        maxWidth: '360px'
                      }
                    })
                  }
                >
                  {t('showroom.addToCart')}
                </button>
              ) : (
                <button
                  className={`flex-1 h-[48px] rounded-full font-medium text-[14px] cursor-pointer ${
                    addedToCart ? 'bg-[#e9e9e9] text-[#1a1a1a]' : 'bg-[#f6f6f6] text-[#1a1a1a]'
                  }`}
                  onClick={addedToCart ? undefined : handleAddToCart}
                >
                  {addedToCart ? t('showroom.addedToCart') : t('showroom.addToCart')}
                </button>
              )}
              {/* "В магазин" would just redirect to the storefront PDP the
                  buyer already has open — no added value. The slot is more
                  useful as a shortcut to swap this garment for another one
                  in the same category without losing the try-on state. */}
              <button
                className="flex-1 h-[48px] rounded-full font-medium text-[14px] bg-[#f6f6f6] text-[#1a1a1a] cursor-pointer"
                onClick={() => {
                  if (!sizingProduct?.category) return;
                  const cat = sizingProduct.category as string;
                  setShowSizes(false);
                  const tags = tagsByCategory[cat];
                  const preferred = tags?.find((tg) => tg.toLowerCase() === 'новинки') ?? tags?.[0] ?? null;
                  setActiveTag(preferred);
                  setActiveClothType(cat);
                }}
              >
                {t('showroom.browseOtherOptions')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategories bottom-sheet */}
      {showSubcategories && activeClothType && (
        <div
          className="absolute inset-0 z-[6] backdrop-blur-[8px] bg-black/40"
          onClick={() => setShowSubcategories(false)}
        >
          <div
            className="absolute bottom-[10px] left-[10px] right-[10px] bg-white rounded-[20px] px-[24px] pt-[24px] pb-[42px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-[12px] max-h-[60vh] overflow-y-auto">
              <div
                className={`cursor-pointer font-['Inter',sans-serif] font-bold text-[24px] leading-[28px] tracking-[-0.8px] ${
                  !activeTag ? 'text-[#1a1a1a]' : 'text-[#87898f]'
                }`}
                onClick={() => {
                  setActiveTag(null);
                  setShowSubcategories(false);
                }}
              >
                {t(CLOTH_TYPE_LABELS[activeClothType])} ({products.filter(p => p.category === activeClothType).length})
              </div>
              {tagsByCategory[activeClothType]?.map((tag) => {
                const isMarketing = marketingTagSet.has(tag);
                const count = products.filter((p) => {
                  if (p.category !== activeClothType) return false;
                  return isMarketing ? p.marketingTag === tag : p.subcategory === tag;
                }).length;
                return (
                  <div
                    key={tag}
                    className={`cursor-pointer font-['Inter',sans-serif] font-semibold text-[17px] leading-[22px] tracking-[-0.4px] ${
                      activeTag === tag
                        ? 'text-[#1a1a1a]'
                        : isMarketing
                          ? 'text-[#c2185b]' // marketing chips stand out (deep pink)
                          : 'text-[#87898f]'
                    }`}
                    onClick={() => {
                      setActiveTag(tag);
                      setShowSubcategories(false);
                    }}
                  >
                    {tag} ({count})
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
