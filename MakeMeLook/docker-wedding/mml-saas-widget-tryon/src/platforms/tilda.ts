/**
 * Tilda Store integration module.
 *
 * Scans the page for Tilda Store product cards, injects branded "Try On" buttons,
 * and watches for product detail popups via MutationObserver.
 *
 * Matching strategy:
 *  1. product.externalId === tildaProductName (case-insensitive)
 *  2. product.name normalized === tildaProductName normalized (fallback)
 *  3. No match → button still shown, opens widget with full catalog
 */

import type { WidgetConfig, WidgetProduct } from '@/types';

// Selectors for Tilda Store elements (covers multiple block types: t754, t-store, etc.)
const SELECTORS = {
  // Product cards on catalog/carousel pages
  productCard: '.js-product:not(.t754__product-full)',
  // Product full-page detail (inside popup container)
  productFull: '.t754__product-full.js-product',
  // Product name inside a card or popup
  productName:
    '.js-product-name, .js-store-prod-name, .t-store__card__title, .t-store__prod-popup__name',
  // "Add to cart" button wrapper — inject our button as a sibling
  addToCartWrapper:
    '.t754__btn-wrapper, .t-store__card__btn-wrapper, .t-store__prod-popup__btn-wrapper',
  // "Add to cart" button itself
  addToCartBtn:
    '[href="#order"], [href^="#order"], .t-store__card__btn, .t754__btn',
  // Product popup overlay
  popup: '.t-popup',
} as const;

const MML_BTN_ATTR = 'data-mml-injected';

// MakeMeLook logo SVG (inline M-symbol)
const MML_LOGO_SVG = `<svg width="20" height="15" viewBox="0 0 62 45" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M57.78 0.51C56.6 0.01 55.3-0.13 54.04 0.12C52.79 0.37 51.63 0.99 50.74 1.9L18.05 34.37C17.63 34.76 17.09 34.98 16.52 34.98C15.95 34.98 15.41 34.76 15 34.37L11.04 30.44C10.14 29.53 8.99 28.91 7.73 28.66C6.47 28.41 5.17 28.54 3.99 29.04C2.8 29.52 1.78 30.34 1.07 31.4C0.36 32.46 0 33.7 0 34.98V44.95H4.31V34.98C4.31 34.55 4.44 34.14 4.67 33.79C4.91 33.43 5.25 33.16 5.64 33C6.03 32.84 6.47 32.79 6.89 32.88C7.3 32.96 7.69 33.16 7.99 33.46L11.95 37.4C12.55 37.99 13.26 38.47 14.05 38.79C14.83 39.11 15.67 39.28 16.52 39.28C17.37 39.28 18.21 39.11 19 38.79C19.78 38.47 20.49 37.99 21.09 37.4L53.79 4.93C54.09 4.63 54.47 4.42 54.89 4.34C55.31 4.26 55.74 4.3 56.13 4.46C56.53 4.62 56.86 4.9 57.1 5.25C57.34 5.6 57.46 6.02 57.46 6.44V44.95H61.77V6.44C61.79 5.17 61.41 3.92 60.7 2.86C59.99 1.8 58.97 0.98 57.78 0.51Z" fill="currentColor"/></svg>`;

let observer: MutationObserver | null = null;
let popupObserver: MutationObserver | null = null;
let products: WidgetProduct[] = [];
let config: WidgetConfig | null = null;
let stylesInjected = false;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    .mml-tryon-btn:hover {
      opacity: 0.85;
      transform: translateY(-1px);
    }
    .mml-tryon-btn:active {
      transform: translateY(0);
    }
    .mml-tryon-btn--card {
      width: 100%;
      padding: 8px 16px;
      font-size: 13px;
      margin-top: 8px;
      border-radius: 6px;
    }
    .mml-tryon-btn--detail {
      padding: 14px 32px;
      font-size: 15px;
      margin-top: 16px;
      border-radius: 8px;
    }
    .mml-tryon-btn__logo {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    .mml-tryon-btn__logo svg {
      width: 18px;
      height: 18px;
    }
    .mml-tryon-btn--detail .mml-tryon-btn__logo svg {
      width: 20px;
      height: 20px;
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findMatchingProduct(tildaName: string): WidgetProduct | null {
  if (!tildaName) return null;
  const norm = normalize(tildaName);

  // 1) Match by externalId (case-insensitive)
  for (const p of products) {
    if (p.externalId && normalize(p.externalId) === norm) return p;
  }

  // 2) Fallback: match by product name
  for (const p of products) {
    if (normalize(p.name) === norm) return p;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Button creation
// ---------------------------------------------------------------------------

function getLang(): string {
  if (!config) return 'en';
  if (config.language !== 'auto') return config.language;
  const lang = document.documentElement.getAttribute('lang') || navigator.language || 'en';
  return lang.startsWith('ru') ? 'ru' : 'en';
}

function openWidget(matchedProduct: WidgetProduct | null): void {
  const w = window as unknown as Record<string, unknown>;
  const mml = w.makeMeLook as { open: (opts?: { productId?: string }) => void } | undefined;
  if (!mml) return;

  if (matchedProduct) {
    mml.open({ productId: matchedProduct.externalId || matchedProduct.publicId });
  } else {
    mml.open();
  }
}

type ButtonVariant = 'card' | 'detail';

function createTryOnButton(
  matchedProduct: WidgetProduct | null,
  variant: ButtonVariant,
): HTMLElement {
  const btn = document.createElement('button');
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
    // Detail page — branded button with logo
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
    openWidget(matchedProduct);
  });

  return btn;
}

// ---------------------------------------------------------------------------
// Injection — catalog cards
// ---------------------------------------------------------------------------

function getProductNameFromCard(card: Element): string {
  const nameEl = card.querySelector(SELECTORS.productName);
  return nameEl?.textContent?.trim() || '';
}

function injectButtonIntoCard(container: Element): void {
  if (container.querySelector(`[${MML_BTN_ATTR}]`)) return;

  const tildaName = getProductNameFromCard(container);
  const matched = findMatchingProduct(tildaName);
  const btn = createTryOnButton(matched, 'card');

  // Insert into the visible text wrapper (t754 carousel cards)
  const textWrapper = container.querySelector(
    '.t754__textwrapper, .t-store__card__content',
  ) as HTMLElement | null;
  if (textWrapper && textWrapper.offsetWidth > 0) {
    textWrapper.appendChild(btn);
    return;
  }

  // Insert into the button wrapper (standard store blocks)
  const btnWrapper = container.querySelector(
    SELECTORS.addToCartWrapper,
  ) as HTMLElement | null;
  if (btnWrapper && btnWrapper.offsetWidth > 0) {
    btnWrapper.appendChild(btn);
    return;
  }

  // Insert after the "Add to cart" button
  const cartBtn = container.querySelector(SELECTORS.addToCartBtn);
  if (cartBtn) {
    cartBtn.parentElement?.insertBefore(btn, cartBtn.nextSibling);
    return;
  }

  container.appendChild(btn);
}

function scanAndInjectCards(): void {
  const cards = document.querySelectorAll(SELECTORS.productCard);
  cards.forEach((card) => injectButtonIntoCard(card));
}

// ---------------------------------------------------------------------------
// Injection — product detail popup
// ---------------------------------------------------------------------------

function injectButtonIntoProductDetail(productEl: Element): void {
  if (productEl.querySelector(`[${MML_BTN_ATTR}]`)) return;

  const tildaName = getProductNameFromCard(productEl);
  const matched = findMatchingProduct(tildaName);
  const btn = createTryOnButton(matched, 'detail');

  // In t754 detail: insert into .t754__wrapper (right column with title + price + cart btn)
  const rightCol = productEl.querySelector('.t754__wrapper.t754__col_right');
  if (rightCol) {
    // Insert after the add-to-cart button or at the end of the right column
    const cartBtn = rightCol.querySelector(SELECTORS.addToCartBtn);
    if (cartBtn?.parentElement) {
      cartBtn.parentElement.insertBefore(btn, cartBtn.nextSibling);
    } else {
      rightCol.appendChild(btn);
    }
    return;
  }

  // Fallback for other store block types
  const btnWrapper = productEl.querySelector(
    SELECTORS.addToCartWrapper,
  ) as HTMLElement | null;
  if (btnWrapper) {
    btnWrapper.appendChild(btn);
    return;
  }

  productEl.appendChild(btn);
}

function scanPopupProducts(): void {
  const popup = document.querySelector(SELECTORS.popup) as HTMLElement | null;
  if (!popup) return;

  const isVisible =
    getComputedStyle(popup).display !== 'none' && popup.offsetWidth > 0;
  if (!isVisible) return;

  // Find the currently visible product-full inside popup
  const fullProducts = popup.querySelectorAll(SELECTORS.productFull);
  fullProducts.forEach((fp) => {
    const el = fp as HTMLElement;
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      injectButtonIntoProductDetail(el);
    }
  });
}

// ---------------------------------------------------------------------------
// MutationObserver
// ---------------------------------------------------------------------------

function startObserver(): void {
  if (observer) return;

  // Observer 1: Watch for new nodes (dynamically added cards, popups)
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        // New product cards (lazy loading)
        if (node.matches?.(SELECTORS.productCard)) {
          injectButtonIntoCard(node);
        }
        node
          .querySelectorAll?.(SELECTORS.productCard)
          ?.forEach((card) => injectButtonIntoCard(card));
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Observer 2: Watch .t-popup for attribute/style changes (Tilda toggles display)
  const popup = document.querySelector(SELECTORS.popup);
  if (popup) {
    popupObserver = new MutationObserver(() => {
      const el = popup as HTMLElement;
      if (getComputedStyle(el).display !== 'none' && el.offsetWidth > 0) {
        // Popup just became visible — inject into the active product detail
        setTimeout(scanPopupProducts, 200);
      }
    });
    popupObserver.observe(popup, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  }

  // Also listen for hash changes (Tilda uses #!/tproduct/... for product pages)
  window.addEventListener('hashchange', onHashChange);
}

function onHashChange(): void {
  if (window.location.hash.includes('tproduct')) {
    // Product detail opened — wait for popup to render, then inject
    setTimeout(scanPopupProducts, 300);
    setTimeout(scanPopupProducts, 800);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Auto-sync: parse products from DOM and send to backend
// ---------------------------------------------------------------------------

interface ParsedProduct {
  name: string;
  price: number | null;
  currency: string;
  description: string;
  imageUrls: string[];
  productUrl: string;
}

function parseProductsFromDOM(): ParsedProduct[] {
  // Parse from product-full elements (complete data) or fallback to cards
  const fullProducts = document.querySelectorAll(SELECTORS.productFull);
  const cards = fullProducts.length > 0
    ? fullProducts
    : document.querySelectorAll(SELECTORS.productCard);

  const seen = new Set<string>();
  const parsed: ParsedProduct[] = [];

  cards.forEach((card) => {
    const nameEl = card.querySelector(SELECTORS.productName);
    const name = nameEl?.textContent?.trim();
    if (!name || seen.has(name)) return;
    seen.add(name);

    // Parse price and currency
    const priceEl = card.querySelector(
      '.js-product-price, .t754__price-value, .t-store__card__price',
    );
    let price: number | null = null;
    let detectedCurrency = 'RUB';
    if (priceEl?.textContent) {
      const raw = priceEl.textContent.trim();
      const priceText = raw.replace(/[^\d.,]/g, '').replace(',', '.');
      const parsed = parseFloat(priceText);
      if (!isNaN(parsed)) price = parsed;
      // Detect currency from symbols/text in the price element
      if (/\$|USD/i.test(raw)) detectedCurrency = 'USD';
      else if (/€|EUR/i.test(raw)) detectedCurrency = 'EUR';
      else if (/£|GBP/i.test(raw)) detectedCurrency = 'GBP';
      else if (/₸|KZT/i.test(raw)) detectedCurrency = 'KZT';
      else if (/₴|UAH/i.test(raw)) detectedCurrency = 'UAH';
      else if (/₽|руб|RUB/i.test(raw)) detectedCurrency = 'RUB';
    }

    // Parse description
    const descrEl = card.querySelector('.t754__descr, .t-store__card__descr');
    const description = descrEl?.textContent?.trim() || '';

    // Parse image URLs
    const imageUrls: string[] = [];
    const imgEl = card.querySelector('.js-product-img') as HTMLElement | null;
    if (imgEl) {
      const bgStyle = getComputedStyle(imgEl).backgroundImage;
      const match = bgStyle.match(/url\(["']?(.*?)["']?\)/);
      if (match?.[1]) {
        // Convert thumbnail URL to full-size
        let url = match[1];
        url = url.replace(/-\/resizeb\/\d+x\//, '/');
        url = url.replace(/^\/\//, 'https://');
        // Switch from thb.tildacdn.com to static.tildacdn.com for full res
        url = url.replace('thb.tildacdn.com', 'static.tildacdn.com');
        imageUrls.push(url);
      }
    }

    // Product URL (hash-based in Tilda)
    const linkEl = card.querySelector('.js-product-link') as HTMLAnchorElement | null;
    let productUrl = '';
    if (linkEl?.href && linkEl.href.includes('#')) {
      productUrl = window.location.origin + window.location.pathname + linkEl.hash;
    }

    parsed.push({ name, price, currency: detectedCurrency, description, imageUrls, productUrl });
  });

  return parsed;
}

async function syncProductsToBackend(
  sessionToken: string,
  apiBaseUrl: string,
): Promise<void> {
  const parsed = parseProductsFromDOM();
  if (parsed.length === 0) {
    console.log('[MML] Tilda sync: no products found in DOM');
    return;
  }

  console.log(`[MML] Tilda sync: found ${parsed.length} products, syncing...`);

  try {
    const resp = await fetch(`${apiBaseUrl}/api/widget/v1/sessions/${sessionToken}/products/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'tilda',
        products: parsed.map((p) => ({
          name: p.name,
          price: p.price,
          currency: p.currency,
          description: p.description,
          image_urls: p.imageUrls,
          product_url: p.productUrl,
          external_id: p.name,
        })),
      }),
    });

    if (resp.ok) {
      const result = await resp.json();
      console.log(`[MML] Tilda sync: created=${result.created} updated=${result.updated} skipped=${result.skipped}`);

      // If new products were created, re-fetch session to get updated product list
      if (result.created > 0) {
        console.log('[MML] Tilda sync: new products created, refreshing session...');
        try {
          const sessionResp = await fetch(`${apiBaseUrl}/api/widget/v1/sessions/${sessionToken}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          if (sessionResp.ok) {
            const sessionData = await sessionResp.json();
            if (sessionData.config?.products) {
              const { useWidgetStore } = await import('@/store');
              const config = useWidgetStore.getState().config;
              if (config) {
                useWidgetStore.getState().setConfig({ ...config, products: sessionData.config.products });
                console.log('[MML] Tilda sync: session refreshed with new products');
              }
            }
          }
        } catch (e) {
          console.warn('[MML] Tilda sync: failed to refresh session', e);
        }
      }
    } else {
      console.warn(`[MML] Tilda sync failed: ${resp.status}`);
    }
  } catch (err) {
    console.warn('[MML] Tilda sync error:', err);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initTilda(
  widgetProducts: WidgetProduct[],
  widgetConfig: WidgetConfig,
  sessionToken?: string,
  apiBaseUrl?: string,
): void {
  products = widgetProducts;
  config = widgetConfig;

  injectStyles();

  console.log(`[MML] Tilda integration: ${products.length} products loaded`);

  // Auto-sync products from DOM to backend (only if no products yet)
  if (products.length === 0 && sessionToken && apiBaseUrl) {
    syncProductsToBackend(sessionToken, apiBaseUrl);
  }

  // Initial scan for product cards already on the page
  scanAndInjectCards();

  // If already on a product detail page, inject there too
  if (window.location.hash.includes('tproduct')) {
    setTimeout(scanPopupProducts, 500);
  }

  // Watch for popups and dynamically loaded cards
  startObserver();
}

export function destroyTilda(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (popupObserver) {
    popupObserver.disconnect();
    popupObserver = null;
  }

  window.removeEventListener('hashchange', onHashChange);

  // Remove all injected buttons
  document.querySelectorAll(`[${MML_BTN_ATTR}]`).forEach((el) => el.remove());

  products = [];
  config = null;
}
