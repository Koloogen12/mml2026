/**
 * CS-Cart / Multi-Vendor integration module.
 *
 * - Detects the current product on product detail pages via Tygh.product_id
 *   or [data-ca-product-id], then preselects it when the widget opens.
 * - Injects a branded "Try On" button next to the "Add to cart" button on
 *   product detail pages and catalog cards.
 *
 * Matching strategy: product.externalId === CS-Cart product_id (string compare).
 */

import type { WidgetConfig, WidgetProduct } from '@/types';

const SELECTORS = {
  // Product detail container (CS-Cart Multi-Vendor 4.17 RU)
  productDetail: '.ty-product-block, form[name^="product_form_"]',
  // Add-to-cart button on product detail
  addToCartDetail: '.ty-product-block__button .ty-btn-primary, button.ty-btn__add-to-cart, .ty-product-block__buttons .ty-btn__add-to-cart',
  // Catalog product cards
  productCard: '.ty-grid-list__item, .ty-column4 .ty-product',
  // Add-to-cart button on card
  addToCartCard: '.ty-btn__add-to-cart, .ty-grid-list__item .ty-btn-primary',
  // Any element exposing the current product id
  productIdHolder: '[data-ca-product-id], input[name="product_data[product_id]"]',
} as const;

const MML_BTN_ATTR = 'data-mml-injected';

const MML_LOGO_SVG = `<svg width="20" height="15" viewBox="0 0 62 45" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M57.78 0.51C56.6 0.01 55.3-0.13 54.04 0.12C52.79 0.37 51.63 0.99 50.74 1.9L18.05 34.37C17.63 34.76 17.09 34.98 16.52 34.98C15.95 34.98 15.41 34.76 15 34.37L11.04 30.44C10.14 29.53 8.99 28.91 7.73 28.66C6.47 28.41 5.17 28.54 3.99 29.04C2.8 29.52 1.78 30.34 1.07 31.4C0.36 32.46 0 33.7 0 34.98V44.95H4.31V34.98C4.31 34.55 4.44 34.14 4.67 33.79C4.91 33.43 5.25 33.16 5.64 33C6.03 32.84 6.47 32.79 6.89 32.88C7.3 32.96 7.69 33.16 7.99 33.46L11.95 37.4C12.55 37.99 13.26 38.47 14.05 38.79C14.83 39.11 15.67 39.28 16.52 39.28C17.37 39.28 18.21 39.11 19 38.79C19.78 38.47 20.49 37.99 21.09 37.4L53.79 4.93C54.09 4.63 54.47 4.42 54.89 4.34C55.31 4.26 55.74 4.3 56.13 4.46C56.53 4.62 56.86 4.9 57.1 5.25C57.34 5.6 57.46 6.02 57.46 6.44V44.95H61.77V6.44C61.79 5.17 61.41 3.92 60.7 2.86C59.99 1.8 58.97 0.98 57.78 0.51Z" fill="currentColor"/></svg>`;

let observer: MutationObserver | null = null;
let products: WidgetProduct[] = [];
let config: WidgetConfig | null = null;
let stylesInjected = false;

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
    .mml-tryon-btn--card { width: 100%; padding: 8px 16px; font-size: 13px; margin-top: 8px; border-radius: 6px; }
    .mml-tryon-btn--detail { padding: 14px 32px; font-size: 15px; margin-top: 16px; border-radius: 8px; }
    .mml-tryon-btn__logo { display: inline-flex; align-items: center; flex-shrink: 0; }
    .mml-tryon-btn__logo svg { width: 18px; height: 18px; }
    .mml-tryon-btn--detail .mml-tryon-btn__logo svg { width: 20px; height: 20px; }
  `;
  document.head.appendChild(style);
}

function getLang(): string {
  if (!config) return 'en';
  if (config.language !== 'auto') return config.language;
  const lang = document.documentElement.getAttribute('lang') || navigator.language || 'en';
  return lang.startsWith('ru') ? 'ru' : 'en';
}

function findProductByExternalId(externalId: string): WidgetProduct | null {
  if (!externalId) return null;
  return products.find((p) => p.externalId && p.externalId === externalId) ?? null;
}

function getCurrentProductId(scope: ParentNode = document): string | null {
  // 1) The most reliable CS-Cart signal: the add-to-cart form is always
  //    named product_form_<product_id>. This works even when Tygh is not
  //    exposed on window (some Multi-Vendor themes sandbox it).
  const form = (scope.querySelector?.('form[name^="product_form_"]') ||
    (scope === document
      ? document.querySelector('form[name^="product_form_"]')
      : null)) as HTMLFormElement | null;
  if (form?.name) {
    const m = form.name.match(/^product_form_(\d+)/);
    if (m) return m[1];
  }
  // 2) Hidden inputs on the form or card
  const hiddenInput = scope.querySelector?.(
    'input[name="product_data[product_id]"], input[name="product_id"]',
  ) as HTMLInputElement | null;
  if (hiddenInput?.value) return hiddenInput.value;
  // 3) data-ca-product-id
  const holder = scope.querySelector?.('[data-ca-product-id]') as HTMLElement | null;
  if (holder) {
    const attr = holder.getAttribute('data-ca-product-id');
    if (attr) return attr;
  }
  // 4) Tygh.product_id fallback (rarely populated in modern themes)
  const tygh = (window as unknown as Record<string, unknown>).Tygh as
    | { product_id?: string | number }
    | undefined;
  if (tygh?.product_id != null && scope === document) {
    return String(tygh.product_id);
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

type ButtonVariant = 'card' | 'detail';

function createTryOnButton(productId: string | null, variant: ButtonVariant): HTMLElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `mml-tryon-btn mml-tryon-btn--${variant}`;
  btn.setAttribute(MML_BTN_ATTR, 'true');

  const bgColor = config?.buttonColor || '#1a1a1a';
  const textColor = config?.buttonTextColor || '#ffffff';
  const font = config?.fontFamily || 'inherit';

  btn.style.backgroundColor = bgColor;
  btn.style.color = textColor;
  btn.style.fontFamily = `${font}, sans-serif`;

  const lang = getLang();

  if (variant === 'card') {
    btn.textContent = lang === 'ru' ? 'Примерить' : 'Try On';
  } else {
    const logo = document.createElement('span');
    logo.className = 'mml-tryon-btn__logo';
    logo.innerHTML = MML_LOGO_SVG;
    const text = document.createElement('span');
    text.textContent = lang === 'ru' ? 'Примерить на себя' : 'Try On Yourself';
    btn.appendChild(logo);
    btn.appendChild(text);
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openWidget(productId);
  });

  return btn;
}

function injectDetailButton(): void {
  const detail = document.querySelector(SELECTORS.productDetail);
  if (!detail) return;
  if (detail.querySelector(`[${MML_BTN_ATTR}]`)) return;

  const productId = getCurrentProductId();
  // Only inject if this CS-Cart product maps to a MakeMeLook product
  if (!productId || !findProductByExternalId(productId)) return;

  const btn = createTryOnButton(productId, 'detail');

  const cartBtn = detail.querySelector(SELECTORS.addToCartDetail);
  if (cartBtn?.parentElement) {
    cartBtn.parentElement.insertBefore(btn, cartBtn.nextSibling);
    return;
  }
  detail.appendChild(btn);
}

function injectCardButton(card: Element): void {
  if (card.querySelector(`[${MML_BTN_ATTR}]`)) return;
  const productId = getCurrentProductId(card);
  if (!productId || !findProductByExternalId(productId)) return;

  const btn = createTryOnButton(productId, 'card');
  const cartBtn = card.querySelector(SELECTORS.addToCartCard);
  if (cartBtn?.parentElement) {
    cartBtn.parentElement.insertBefore(btn, cartBtn.nextSibling);
    return;
  }
  card.appendChild(btn);
}

function scanAndInject(): void {
  injectDetailButton();
  document.querySelectorAll(SELECTORS.productCard).forEach((card) => injectCardButton(card));
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

  injectStyles();

  console.log(`[MML] CS-Cart integration: ${products.length} products loaded`);

  // Expose current product id so the widget can auto-preselect on manual open
  const currentId = getCurrentProductId();
  if (currentId && findProductByExternalId(currentId)) {
    const w = window as unknown as Record<string, unknown>;
    w.__mmlCurrentProductId = currentId;
    // Patch makeMeLook.open so the floating button / queued calls preselect too
    const mml = w.makeMeLook as
      | { open: (opts?: { productId?: string }) => void }
      | undefined;
    if (mml) {
      const originalOpen = mml.open;
      mml.open = (opts?: { productId?: string }) => {
        originalOpen({ productId: opts?.productId ?? currentId });
      };
    }
  }

  scanAndInject();
  startObserver();
}

export function destroyCSCart(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  document.querySelectorAll(`[${MML_BTN_ATTR}]`).forEach((el) => el.remove());
  products = [];
  config = null;
}
