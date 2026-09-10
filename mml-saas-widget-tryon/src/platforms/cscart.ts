/**
 * CS-Cart / Multi-Vendor integration module.
 *
 * - Detects the current product on product detail pages via Tygh.product_id
 *   or [data-ca-product-id], then preselects it when the widget opens.
 * - Injects a branded "Try On" button next to the "Add to cart" button on
 *   product detail pages.
 * - Adds a hover overlay with "Примерить" / "Try On" on catalog cards.
 *
 * Matching strategy: product.externalId === CS-Cart product_id (loose string
 * compare — both sides are trimmed, leading zeros normalized).
 */

import type { WidgetConfig, WidgetProduct } from '@/types';

const SELECTORS = {
  // Product detail container (CS-Cart Multi-Vendor 4.17 RU + common themes)
  productDetail:
    '.ty-product-block, form[name^="product_form_"], .ut2-product-block',
  // Add-to-cart button on product detail
  addToCartDetail:
    '.ty-product-block__button .ty-btn-primary, button.ty-btn__add-to-cart, .ty-product-block__buttons .ty-btn__add-to-cart, .ut2-product-block .ty-btn__add-to-cart',
  // Catalog product cards — widened to cover stock CS-Cart + MVE themes
  productCard: [
    '.ty-grid-list__item',
    '.ty-column4 .ty-product',
    '.ty-product-thumb',
    '.ty-compact-list__item',
    '.ut2-gl__item',
    '.ty-product-list__item',
  ].join(', '),
  // Add-to-cart button on card
  addToCartCard:
    '.ty-btn__add-to-cart, .ty-grid-list__item .ty-btn-primary, .ut2-gl__item .ty-btn__add-to-cart',
  // Any element exposing the current product id
  productIdHolder:
    '[data-ca-product-id], input[name="product_data[product_id]"]',
} as const;

const MML_BTN_ATTR = 'data-mml-injected';
const MML_OVERLAY_ATTR = 'data-mml-overlay';

const MML_LOGO_SVG = `<svg width="20" height="15" viewBox="0 0 62 45" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M57.78 0.51C56.6 0.01 55.3-0.13 54.04 0.12C52.79 0.37 51.63 0.99 50.74 1.9L18.05 34.37C17.63 34.76 17.09 34.98 16.52 34.98C15.95 34.98 15.41 34.76 15 34.37L11.04 30.44C10.14 29.53 8.99 28.91 7.73 28.66C6.47 28.41 5.17 28.54 3.99 29.04C2.8 29.52 1.78 30.34 1.07 31.4C0.36 32.46 0 33.7 0 34.98V44.95H4.31V34.98C4.31 34.55 4.44 34.14 4.67 33.79C4.91 33.43 5.25 33.16 5.64 33C6.03 32.84 6.47 32.79 6.89 32.88C7.3 32.96 7.69 33.16 7.99 33.46L11.95 37.4C12.55 37.99 13.26 38.47 14.05 38.79C14.83 39.11 15.67 39.28 16.52 39.28C17.37 39.28 18.21 39.11 19 38.79C19.78 38.47 20.49 37.99 21.09 37.4L53.79 4.93C54.09 4.63 54.47 4.42 54.89 4.34C55.31 4.26 55.74 4.3 56.13 4.46C56.53 4.62 56.86 4.9 57.1 5.25C57.34 5.6 57.46 6.02 57.46 6.44V44.95H61.77V6.44C61.79 5.17 61.41 3.92 60.7 2.86C59.99 1.8 58.97 0.98 57.78 0.51Z" fill="currentColor"/></svg>`;

let observer: MutationObserver | null = null;
let products: WidgetProduct[] = [];
let config: WidgetConfig | null = null;
let stylesInjected = false;
let debug = false;

function log(...args: unknown[]): void {
  if (debug) console.log('[MML][cscart]', ...args);
}

function injectStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .mml-tryon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      margin-top: 12px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.02em;
      text-align: center;
      transition: opacity 0.2s, transform 0.15s;
      box-sizing: border-box;
      line-height: 1;
      position: relative;
      z-index: 10;
    }
    .mml-tryon-btn:hover { opacity: 0.85; transform: translateY(-1px); }
    .mml-tryon-btn:active { transform: translateY(0); }
    .mml-tryon-btn--detail { padding: 14px 32px; font-size: 15px; margin-top: 16px; border-radius: 8px; }
    .mml-tryon-btn__logo { display: inline-flex; align-items: center; flex-shrink: 0; }
    .mml-tryon-btn__logo svg { width: 18px; height: 18px; }
    .mml-tryon-btn--detail .mml-tryon-btn__logo svg { width: 20px; height: 20px; }

    /* Hover: full-width "Примерить" bar pinned to the bottom edge of the
       product image. Appears via fade-in only — no sliding — so the bar
       stays exactly on the image's bottom border without moving into
       the tile body. */
    .mml-card-host { position: relative; }
    .mml-card-overlay {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: transparent;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.18s ease;
      z-index: 5;
    }
    .mml-card-host:hover .mml-card-overlay,
    .mml-card-host:focus-within .mml-card-overlay {
      opacity: 1;
      pointer-events: auto;
    }
    .mml-card-overlay__chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px 16px;
      border: none;
      border-radius: 0;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.12);
    }
    .mml-card-overlay__chip svg { width: 16px; height: 16px; }

    /* Keep CS-Cart's own modal / notification popups above our widget.
       When the widget simulates a click on the storefront's "В корзину"
       button, CS-Cart shows a native "Добавлено в корзину" dialog that
       by default sits at z-index 1022 — the widget's internal modal
       layers are higher, so without this override the confirmation would
       be hidden behind the widget. Using the top of the 32-bit int
       range makes sure our widget never covers a store notification. */
    .cm-notification-container,
    .notification-container,
    .cm-notification-content,
    .notification-content-ex,
    .ty-popup-background,
    .ty-popup,
    .cm-popup-content,
    .ty-dialog { z-index: 2147483000 !important; }
  `;
  document.head.appendChild(style);
}

function getLang(): string {
  if (!config) return 'en';
  if (config.language !== 'auto') return config.language;
  const lang = document.documentElement.getAttribute('lang') || navigator.language || 'en';
  return lang.startsWith('ru') ? 'ru' : 'en';
}

function normalizeExternalId(v: string | null | undefined): string {
  if (!v) return '';
  // Trim, strip leading zeros (so "00123" === "123"), lowercase as safety.
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return s.replace(/^0+(?=\d)/, '');
  return s.toLowerCase();
}

function normalizeSku(v: string | null | undefined): string {
  if (!v) return '';
  return String(v).trim().toUpperCase();
}

function findProductByExternalId(externalId: string): WidgetProduct | null {
  if (!externalId) return null;
  const target = normalizeExternalId(externalId);
  return (
    products.find((p) => normalizeExternalId(p.externalId) === target) ?? null
  );
}

function findProductBySku(sku: string): WidgetProduct | null {
  if (!sku) return null;
  const target = normalizeSku(sku);
  // Exact SKU match first
  const exact = products.find((p) => normalizeSku(p.sku) === target);
  if (exact) return exact;
  // Some installs ship variant SKUs like "ABC-001/M" while MML stores parent
  // SKU "ABC-001". Try matching the part before the last separator.
  const baseTarget = target.replace(/[/\-_][^/\-_]*$/, '');
  if (baseTarget && baseTarget !== target) {
    const baseHit = products.find((p) => normalizeSku(p.sku) === baseTarget);
    if (baseHit) return baseHit;
  }
  return null;
}

function normalizeName(v: string | null | undefined): string {
  if (!v) return '';
  return String(v)
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^a-zа-я0-9 ]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fallback matching by product name — crucial on CS-Cart MVE stores where
 * catalog cards display vendor offers with storefront-specific product_ids
 * that never appear in the /api/products response (MML imports only master
 * products via admin API, but customers browse vendor offers with different
 * ids). Names are the only stable identifier between the two views.
 *
 * Indexed lazily on first call.
 */
let nameIndex: Map<string, WidgetProduct> | null = null;
function findProductByName(name: string): WidgetProduct | null {
  if (!name) return null;
  const target = normalizeName(name);
  if (!target) return null;
  if (!nameIndex || nameIndex.size !== products.length) {
    nameIndex = new Map();
    for (const p of products) nameIndex.set(normalizeName(p.name), p);
  }
  return nameIndex.get(target) ?? null;
}

function findProduct(
  externalId: string | null,
  sku: string | null,
  name: string | null = null,
): WidgetProduct | null {
  return (
    (externalId ? findProductByExternalId(externalId) : null) ||
    (sku ? findProductBySku(sku) : null) ||
    (name ? findProductByName(name) : null)
  );
}

function extractIdFromUrl(href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    const u = new URL(href, window.location.origin);
    const pid = u.searchParams.get('product_id');
    if (pid) return pid;
    // /product_name-123.html or /index.php?dispatch=products.view&product_id=X
    const m = u.pathname.match(/-(\d+)\.html?$/);
    if (m) return m[1];
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Read the current product id from the page scope.
 *
 * IMPORTANT: do NOT trust the form `name` attribute. CS-Cart's content blocks
 * (carousels on the homepage, "you may also like", etc.) prefix the form name
 * with the block instance id, e.g. `product_form_175000131607` where the real
 * product id is `131607` and `175000` is the block id glued in front. The
 * canonical place for the product id is the inner inputs: form fields are
 * named `product_data[<product_id>][amount]` etc. Hidden `product_data[product_id]`
 * inputs are also reliable when present.
 */
function getCurrentProductId(scope: ParentNode = document): string | null {
  // 1) Inputs whose NAME contains the product_id literal — most reliable.
  //    Pattern: <input name="product_data[131607][amount]" ...>
  const formish = scope as Element;
  const containers: Element[] = [];
  if (formish?.querySelectorAll) {
    containers.push(...Array.from(formish.querySelectorAll('form[name^="product_form_"]')));
  }
  if (formish && (formish as HTMLElement).matches?.('form[name^="product_form_"]')) {
    containers.push(formish);
  }
  for (const cont of containers) {
    const candidates = cont.querySelectorAll(
      'input[name^="product_data["], select[name^="product_data["], textarea[name^="product_data["]',
    );
    for (const el of Array.from(candidates)) {
      const n = (el as HTMLInputElement).name;
      const m = n.match(/^product_data\[(\d+)\]/);
      if (m) return m[1];
    }
    // Hidden inputs without index syntax
    const hidden = cont.querySelector('input[name="product_data[product_id]"], input[name="product_id"]') as HTMLInputElement | null;
    if (hidden?.value) return hidden.value;
  }
  // 2) data-ca-product-id (read from the scope element itself, then descendants)
  const scopeEl = scope as Element;
  const onScope = scopeEl?.getAttribute?.('data-ca-product-id');
  if (onScope) return onScope;
  const holder = scope.querySelector?.('[data-ca-product-id]') as HTMLElement | null;
  if (holder) {
    const attr = holder.getAttribute('data-ca-product-id');
    if (attr) return attr;
  }
  // 3) Product link inside the card → ?product_id=... or trailing -123.html
  const link = scope.querySelector?.(
    'a[href*="product_id="], a[href$=".html"], a.product-title',
  ) as HTMLAnchorElement | null;
  const fromLink = extractIdFromUrl(link?.getAttribute('href'));
  if (fromLink) return fromLink;
  // 4) Tygh.product_id fallback (rarely populated in modern themes)
  const tygh = (window as unknown as Record<string, unknown>).Tygh as
    | { product_id?: string | number }
    | undefined;
  if (tygh?.product_id != null && scope === document) {
    return String(tygh.product_id);
  }
  return null;
}

/**
 * Read SKU (CS-Cart "product_code") from the current scope. PDPs render it as
 * `<span class="ty-control-group__item">КОД: ABC-123</span>` in most themes;
 * cards rarely have it visibly but sometimes have a hidden input.
 */
function getCurrentSku(scope: ParentNode = document): string | null {
  // Hidden inputs / data attrs first
  const fromInput = (scope.querySelector?.(
    'input[name="product_data[product_code]"], input[name="product_code"]',
  ) as HTMLInputElement | null)?.value;
  if (fromInput) return fromInput.trim();
  const fromAttr = (scope.querySelector?.('[data-ca-product-code]') as HTMLElement | null)?.getAttribute('data-ca-product-code');
  if (fromAttr) return fromAttr.trim();
  // Visible "КОД: XXX" / "Код товара: XXX" / "SKU: XXX"
  const candidates = scope.querySelectorAll?.(
    '.ty-control-group__item, .ty-product-code, .ty-sku-item, [class*="product-code" i], [class*="sku" i]',
  );
  if (candidates) {
    for (const el of Array.from(candidates)) {
      const txt = (el.textContent || '').trim();
      const m = txt.match(/(?:КОД|Код товара|Артикул|SKU)\s*:?\s*([A-Za-z0-9_/\-.]+)/i);
      if (m) return m[1];
    }
  }
  return null;
}

/**
 * For Multi-Vendor PDPs the master product is split into per-vendor "offers"
 * with their own product_id. The "В корзину" buttons are rendered as
 *   <a id="button_cart_vendor_product<VENDOR_PRODUCT_ID>"
 *      data-ca-dispatch="dispatch[checkout.add..<VENDOR_PRODUCT_ID>]">
 * Adding the master id to the cart silently no-ops (CS-Cart returns
 * `added_products` but nothing actually appears in the cart). The vendor
 * offer id from the first cart button is the correct id for checkout.add.
 *
 * Returns null on non-MVE pages or simple catalog cards where no such button
 * is rendered — caller should fall back to the master id.
 */
function getVendorProductId(scope: ParentNode = document): string | null {
  const root = (scope as Element)?.querySelector ? scope : document;
  const btn = root.querySelector?.(
    'a[id^="button_cart_vendor_product"], button[id^="button_cart_vendor_product"]',
  ) as HTMLElement | null;
  if (!btn) return null;
  const m = btn.id.match(/^button_cart_vendor_product(\d+)/);
  if (m) return m[1];
  // Fallback: parse from data-ca-dispatch="dispatch[checkout.add..NNN]"
  const disp = btn.getAttribute('data-ca-dispatch') || '';
  const m2 = disp.match(/checkout\.add\.\.(\d+)/);
  if (m2) return m2[1];
  return null;
}

/**
 * Collect all vendor offers on a Multi-Vendor PDP. Each `.ty-sellers-list__item`
 * has one cart button keyed by its own product_id plus vendor name and price.
 * Prices can differ significantly between vendors (e.g. 6 450 ₽ vs 12 900 ₽),
 * so the widget must let the user pick rather than silently taking the first.
 */
export interface VendorOffer {
  productId: string;
  name: string;
  price: string | null;
}

function getVendorOffers(scope: ParentNode = document): VendorOffer[] {
  const items = Array.from(
    (scope as Element).querySelectorAll?.('.ty-sellers-list__item') || [],
  );
  const offers: VendorOffer[] = [];
  for (const item of items) {
    const btn = item.querySelector('a[id^="button_cart_vendor_product"], button[id^="button_cart_vendor_product"]') as HTMLElement | null;
    if (!btn) continue;
    const productId = btn.id.match(/(\d+)$/)?.[1];
    if (!productId) continue;
    // Vendor name: try specific selectors first, then fall back to the first
    // meaningful text node that's NOT the button label / cart controls.
    let name = (item.querySelector('[class*="vendor-name" i], [class*="company-name" i], .ty-product-vendor') as HTMLElement | null)?.textContent?.trim();
    if (!name) {
      const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const t = n.textContent?.trim() || '';
        if (
          t.length > 2 &&
          !/в корзину|подобрать образ|купить|examples/i.test(t) &&
          !/^[\d ]+₽?$/.test(t) &&
          !/^\d+$/.test(t)
        ) {
          name = t;
          break;
        }
      }
    }
    const price = (item.querySelector('[class*="price-num" i], [class*="price" i]') as HTMLElement | null)?.textContent?.trim() || null;
    offers.push({ productId, name: (name || '').replace(/\s+/g, ' ').trim() || productId, price });
  }
  return offers;
}

/**
 * For products with size variations, each size is a separate CS-Cart master
 * product (variation_id). Each variation has its own set of vendor offers
 * with distinct product_ids. To support "pick size + pick vendor" in the
 * widget's add-to-cart flow, we fetch the HTML of each variation in parallel
 * and parse its sellers list. Results are stashed on window as
 *   __mmlSizeVendorOffers[publicId][size] = VendorOffer[]
 * so ShowroomStage can look them up when the user clicks "В корзину".
 *
 * The current variation's offers are taken from the live DOM (no extra
 * request). Other sizes are fetched with the current page URL's
 * `?variation_id=<id>` so storefront context (store_access_key) is
 * preserved via cookies.
 */
// Dedup in-flight prefetches so multiple callers (initCSCart on PDP,
// card overlay click, Showroom preselect effect) only do one fetch.
const prefetchPromises = new Map<string, Promise<void>>();

async function prefetchSizeVendorOffers(
  product: WidgetProduct,
  currentSize: string | null,
  currentOffers: VendorOffer[],
): Promise<void> {
  if (!product.sizeVariants || Object.keys(product.sizeVariants).length === 0) return;
  const w = window as unknown as Record<string, unknown>;
  const sizeOffers: Record<string, VendorOffer[]> = {};
  if (currentSize && currentOffers.length > 0) sizeOffers[currentSize] = currentOffers;

  // CS-Cart sizeVariants[size] is the master product_id of that size (e.g.
  // 117423 for "L"). Its full storefront page lives at
  // `/index.php?dispatch=products.view&product_id=<id>` — the seo-path
  // variant (the current URL) hard-404s for other sizes because their slug
  // differs. Preserve storefront context (store_access_key) from the
  // current URL.
  const storeAccessKey = new URL(window.location.href).searchParams.get('store_access_key');
  const origin = window.location.origin;

  const tasks = Object.entries(product.sizeVariants)
    .filter(([size]) => size !== currentSize)
    .map(async ([size, variantProductId]) => {
      try {
        const u = new URL(`${origin}/index.php`);
        u.searchParams.set('dispatch', 'products.view');
        u.searchParams.set('product_id', String(variantProductId));
        if (storeAccessKey) u.searchParams.set('store_access_key', storeAccessKey);
        const resp = await fetch(u.toString(), { credentials: 'include' });
        if (!resp.ok) return;
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const offers = getVendorOffers(doc);
        if (offers.length > 0) sizeOffers[size] = offers;
      } catch (err) {
        log('prefetch size offers failed', { size, err: String(err) });
      }
    });

  await Promise.all(tasks);

  const map = (w.__mmlSizeVendorOffers as Record<string, Record<string, VendorOffer[]>> | undefined) || {};
  map[product.publicId] = sizeOffers;
  if (product.externalId) map[product.externalId] = sizeOffers;
  w.__mmlSizeVendorOffers = map;
  log('size×vendor offers prefetched', {
    sizes: Object.keys(sizeOffers),
    perSizeCounts: Object.fromEntries(
      Object.entries(sizeOffers).map(([s, o]) => [s, o.length]),
    ),
  });
}

/**
 * Detect the currently selected size on the PDP. The checked radio button's
 * label carries the display text like "42 S"; we match it against the MML
 * sizeVariants keys (usually "S", "M", "L"...) to figure out which entry
 * to keep as "current".
 */
function detectCurrentSize(product: WidgetProduct): string | null {
  if (!product.sizeVariants) return null;
  const sizeKeys = Object.keys(product.sizeVariants);
  const checked = document.querySelector('input[type="radio"][name^="feature_"]:checked') as HTMLInputElement | null;
  if (!checked) return null;
  const label = document.querySelector(`label[for="${checked.id}"]`)?.textContent?.trim() || '';
  if (!label) return null;
  // Match label against any sizeVariants key (case-insensitive, substring).
  const upper = label.toUpperCase();
  for (const k of sizeKeys) {
    const up = k.toUpperCase();
    if (upper === up || upper.split(/\s+/).includes(up) || upper.endsWith(' ' + up)) return k;
  }
  return null;
}

function openWidget(productId: string | null): void {
  const w = window as unknown as Record<string, unknown>;
  const mml = w.makeMeLook as { open: (opts?: { productId?: string }) => void } | undefined;
  if (!mml) return;
  if (productId) mml.open({ productId });
  else mml.open();
}

function createCardOverlay(productId: string | null): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'mml-card-overlay';
  overlay.setAttribute(MML_OVERLAY_ATTR, 'true');

  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'mml-card-overlay__chip';
  chip.setAttribute(MML_BTN_ATTR, 'true');
  chip.style.backgroundColor = config?.buttonColor || '#1a1a1a';
  chip.style.color = config?.buttonTextColor || '#ffffff';
  chip.style.fontFamily = `${config?.fontFamily || 'inherit'}, sans-serif`;

  const logo = document.createElement('span');
  logo.setAttribute('aria-hidden', 'true');
  logo.innerHTML = MML_LOGO_SVG;
  const label = document.createElement('span');
  label.textContent = getLang() === 'ru' ? 'Примерить' : 'Try On';
  chip.appendChild(logo);
  chip.appendChild(label);

  chip.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openWidget(productId);
  });

  overlay.appendChild(chip);
  return overlay;
}

function getCardProductName(card: Element): string | null {
  // CS-Cart catalog cards commonly expose the product name on the main link
  // or via a dedicated title element.
  const selectors = [
    '.ut2-gl__name',
    '.ty-product-thumb__title',
    '.ty-grid-list__item-name',
    '.ty-product-list__item-name',
    '.ty-compact-list__item-name',
    'a.product-title',
    'a.ty-grid-list__item-name',
  ];
  for (const sel of selectors) {
    const el = card.querySelector(sel) as HTMLElement | null;
    const txt = el?.textContent?.trim();
    if (txt) return txt;
  }
  // Fallback: the first <a> that actually contains a product name (has text)
  const anchors = Array.from(card.querySelectorAll('a[href]')) as HTMLAnchorElement[];
  for (const a of anchors) {
    const txt = a.textContent?.trim() || '';
    if (txt.length > 5 && !/в корзину|подобрать образ/i.test(txt)) return txt;
  }
  return null;
}

function injectCardOverlay(card: Element): void {
  // If an overlay already exists but sits on the whole card (not the
  // image wrapper), and the image wrapper has since appeared (lazy-load),
  // tear it down and re-inject at the proper host.
  const existing = card.querySelector(`[${MML_OVERLAY_ATTR}]`);
  if (existing) {
    const existingHost = existing.parentElement;
    const imgWrap = card.querySelector(
      '.ut2-gl__image, .ty-product-img, .ty-grid-list__image, .ty-product-thumb__image',
    ) as HTMLElement | null;
    const img = card.querySelector('img') as HTMLImageElement | null;
    const properHost = imgWrap || img?.closest('a') || img?.parentElement || null;
    if (!properHost || existingHost === properHost) return;
    existing.remove();
    if (existingHost && existingHost.classList.contains('mml-card-host') && existingHost !== properHost) {
      existingHost.classList.remove('mml-card-host');
      if (existingHost.style.position === 'relative') existingHost.style.position = '';
      if ((existingHost as HTMLElement).tagName === 'A' && (existingHost as HTMLElement).style.display === 'block') {
        (existingHost as HTMLElement).style.display = '';
      }
    }
  }
  const productId = getCurrentProductId(card);
  const sku = getCurrentSku(card);
  const name = getCardProductName(card);
  const matched = findProduct(productId, sku, name);
  if (!matched) return;

  // Host the overlay inside the image wrapper so the sliding "Примерить" bar
  // sits at the bottom of the image (not under the product name/price).
  // Strategy:
  //   1. Explicit image-wrapper classes (most themes).
  //   2. The anchor that wraps the image — CS-Cart catalog cards render
  //      <a class="product-link"><img .../></a> and the image name/price
  //      sit as siblings of that anchor, so anchoring to <a> gives us
  //      exactly the image bounds.
  //   3. The card's first <a href] (catalog cards always link the image).
  let host: HTMLElement | null = card.querySelector(
    '.ut2-gl__image, .ty-product-img, .ty-grid-list__image, .ty-product-thumb__image',
  ) as HTMLElement | null;
  if (!host) {
    const img = card.querySelector('img') as HTMLImageElement | null;
    if (img) {
      const anchor = img.closest('a');
      if (anchor && card.contains(anchor)) host = anchor as HTMLElement;
      else host = img.parentElement as HTMLElement | null;
    }
  }
  // If still no host (lazy-load hasn't run yet), the card's first <a href>
  // is almost always the image link — catalog cards always link the image.
  if (!host) {
    const firstLink = card.querySelector('a[href]') as HTMLAnchorElement | null;
    if (firstLink && firstLink.offsetWidth > 0 && firstLink.offsetHeight > 80) {
      host = firstLink;
    }
  }
  // Defer injection if we can't find a proper image wrapper — the
  // MutationObserver will retry once the image/anchor is laid out.
  if (!host) return;
  host.classList.add('mml-card-host');
  // Anchors default to display:inline which breaks absolute positioning
  // of the overlay — promote to block with explicit sizing.
  if (host.tagName === 'A') {
    host.style.display = 'block';
  }
  const pos = getComputedStyle(host).position;
  if (pos === 'static') host.style.position = 'relative';

  // passId priority: page product_id (works on simple stores or when it
  // matches), otherwise catalog external_id. When the card was matched by
  // name (vendor offer with id that's not in MML) we pass catalog external_id
  // — the widget's Showroom preselect effect looks that up, and the page's
  // own vendor-picker flow handles add-to-cart once the user is on the PDP.
  const passId = (productId && matched.externalId === productId)
    ? productId
    : (matched.externalId || matched.publicId);
  const overlay = createCardOverlay(passId);
  host.appendChild(overlay);
  log('card overlay injected', { productId, sku, name, matchedExt: matched.externalId });
}

function scanAndInject(): void {
  // Detail-page button intentionally NOT injected: client themes already
  // ship their own "Примерить" / "Подобрать образ" CTA next to "В корзину"
  // which calls window.makeMeLook.open(). Our initCSCart monkey-patches
  // open() to auto-preselect the current page product, so that existing
  // CTA does the right thing without us adding a duplicate button.

  const cards = document.querySelectorAll(SELECTORS.productCard);
  let matchedCount = 0;
  cards.forEach((card) => {
    const before = card.querySelector(`[${MML_OVERLAY_ATTR}]`);
    injectCardOverlay(card);
    if (!before && card.querySelector(`[${MML_OVERLAY_ATTR}]`)) matchedCount++;
  });
  if (cards.length > 0) {
    log('card scan summary', {
      cards: cards.length,
      matched: matchedCount,
      alreadyOverlayed: document.querySelectorAll(`[${MML_OVERLAY_ATTR}]`).length,
    });
  }
}

function startObserver(): void {
  if (observer) return;
  observer = new MutationObserver(() => scanAndInject());
  observer.observe(document.body, { childList: true, subtree: true });
}

export function initCSCart(
  widgetProducts: WidgetProduct[],
  widgetConfig: WidgetConfig,
): void {
  products = widgetProducts;
  config = widgetConfig;

  // Debug flag: either ?mml_debug=1 or <script data-mml-debug="1">
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('mml_debug') === '1') debug = true;
    const scriptDbg = document.querySelector(
      'script[data-project][data-mml-debug="1"]',
    );
    if (scriptDbg) debug = true;
  } catch {
    /* ignore */
  }

  injectStyles();

  console.log(`[MML] CS-Cart integration: ${products.length} products loaded`);
  log('externalIds in catalog', products.map((p) => p.externalId).filter(Boolean));

  // Expose a global "ensure offers" so ShowroomStage can kick off (and await)
  // the size×vendor prefetch for any matched product. Needed when the widget
  // is opened from a catalog card, not a PDP — in that case initCSCart didn't
  // prefetch yet, and the vendor picker would otherwise be empty.
  const ww = window as unknown as Record<string, unknown>;
  ww.__mmlEnsureOffers = async (productKey: string): Promise<void> => {
    const key = String(productKey || '').trim();
    if (!key) return;
    // Already in flight / done?
    const existing = prefetchPromises.get(key);
    if (existing) return existing;
    // Look up the matched product in the current catalog.
    const product =
      products.find((p) => normalizeExternalId(p.externalId) === normalizeExternalId(key)) ||
      products.find((p) => p.publicId === key);
    if (!product) return;
    // Fetch the product's own page to get its current vendor offers + detect
    // a default size, then prefetch the rest.
    const productUrl = product.productUrl || '';
    let currentSize: string | null = null;
    let currentOffers: VendorOffer[] = [];
    try {
      if (productUrl) {
        const resp = await fetch(productUrl, { credentials: 'include' });
        if (resp.ok) {
          const html = await resp.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          currentOffers = getVendorOffers(doc);
          // Seed __mmlVendorOffers with fallback offers (whole-product list),
          // used when the user hasn't picked a size yet.
          if (currentOffers.length > 0) {
            const offersMap = (ww.__mmlVendorOffers as Record<string, VendorOffer[]> | undefined) || {};
            offersMap[product.publicId] = currentOffers;
            if (product.externalId) offersMap[product.externalId] = currentOffers;
            ww.__mmlVendorOffers = offersMap;
          }
        }
      }
    } catch (err) {
      log('ensureOffers initial fetch failed', { key, err: String(err) });
    }
    const p = prefetchSizeVendorOffers(product, currentSize, currentOffers);
    prefetchPromises.set(product.publicId, p);
    if (product.externalId) prefetchPromises.set(product.externalId, p);
    return p;
  };

  // Expose current product id so the widget can auto-preselect on manual open
  const currentId = getCurrentProductId();
  const currentSku = getCurrentSku();
  const currentMatch = findProduct(currentId, currentSku);
  log('current product on page', { currentId, currentSku, matchedExt: currentMatch?.externalId, matchedName: currentMatch?.name });
  if (currentMatch) {
    const w = window as unknown as Record<string, unknown>;
    // The Showroom preselect effect looks up products by external_id, so we
    // pass the catalog external_id (matching may have happened via SKU when
    // the page-side product_id differs from the MML catalog id).
    const preselectId = currentMatch.externalId || currentMatch.publicId;
    w.__mmlCurrentProductId = preselectId;
    // Stash the id we should use for CS-Cart's checkout.add, keyed by MML
    // publicId and externalId. Priority:
    //   1. Vendor offer id from "button_cart_vendor_productXXX" (MVE PDPs)
    //      — master_product_id silently no-ops in checkout.add on MVE.
    //   2. Plain page-side product_id from form inputs (simple stores).
    // Crucial when staging/prod or master/vendor product ids diverge from
    // the MML catalog external_id.
    const cartId = getVendorProductId() || currentId;
    if (cartId) {
      log('cart id resolved', { cartId, fromVendorBtn: getVendorProductId() != null });
      const pageMap = (w.__mmlPageProductIds as Record<string, string> | undefined) || {};
      pageMap[currentMatch.publicId] = cartId;
      if (currentMatch.externalId) pageMap[currentMatch.externalId] = cartId;
      w.__mmlPageProductIds = pageMap;
    }

    // Collect all vendor offers for the Showroom vendor picker. Different
    // vendors may have very different prices, so the widget must let the
    // user choose rather than silently pick the first.
    const offers = getVendorOffers();
    if (offers.length > 0) {
      const offersMap = (w.__mmlVendorOffers as Record<string, VendorOffer[]> | undefined) || {};
      offersMap[currentMatch.publicId] = offers;
      if (currentMatch.externalId) offersMap[currentMatch.externalId] = offers;
      w.__mmlVendorOffers = offersMap;
      log('vendor offers collected', { count: offers.length, preview: offers.slice(0, 3) });
    }

    // Pre-crawl every size variant's vendor offers in parallel — so that when
    // the user picks "S" or "M" in the Showroom size picker we already know
    // which vendor product_ids belong to that size. Without this the widget
    // can only add the size currently loaded on the PDP.
    const currentSize = detectCurrentSize(currentMatch);
    log('current size on PDP', currentSize);
    const p = prefetchSizeVendorOffers(currentMatch, currentSize, offers);
    prefetchPromises.set(currentMatch.publicId, p);
    if (currentMatch.externalId) prefetchPromises.set(currentMatch.externalId, p);
    void p;
    // Patch makeMeLook.open so the floating button / themed "Примерить"
    // buttons / queued calls all resolve to the current PDP product.
    // We prefer `preselectId` (our matched MML master id) over whatever
    // the page's own onclick handler passed in — on CS-Cart MVE those
    // handlers typically inject a storefront-specific vendor id (e.g.
    // 113222 for XS) which has no match in our catalog. The master id
    // does match, so forcing it wins here rather than silently dropping
    // the preselect and opening an empty widget.
    const mml = w.makeMeLook as
      | { open: (opts?: { productId?: string }) => void }
      | undefined;
    if (mml) {
      const originalOpen = mml.open;
      mml.open = (opts?: { productId?: string }) => {
        originalOpen({ productId: preselectId || opts?.productId });
      };
    }
  } else if (currentId || currentSku) {
    log('product on page is not in MML catalog — neither external_id nor SKU matched');
  }

  scanAndInject();
  startObserver();
}

export function destroyCSCart(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  document
    .querySelectorAll(`[${MML_BTN_ATTR}], [${MML_OVERLAY_ATTR}]`)
    .forEach((el) => el.remove());
  document
    .querySelectorAll('.mml-card-host')
    .forEach((el) => el.classList.remove('mml-card-host'));
  products = [];
  config = null;
}
