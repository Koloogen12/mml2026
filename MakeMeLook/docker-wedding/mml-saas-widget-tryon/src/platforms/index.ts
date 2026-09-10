/**
 * Platform integration dispatcher.
 * Detects the e-commerce platform and initializes platform-specific features
 * like auto-injecting "Try On" buttons on product cards.
 */

import type { Platform, WidgetConfig, WidgetProduct } from '@/types';
import { initTilda, destroyTilda } from './tilda';
import { initCSCart, destroyCSCart } from './cscart';

export function initPlatform(
  platform: Platform,
  products: WidgetProduct[],
  config: WidgetConfig,
  sessionToken?: string,
  apiBaseUrl?: string,
): void {
  if (platform === 'tilda') {
    initTilda(products, config, sessionToken, apiBaseUrl);
  } else if (platform === 'cscart') {
    initCSCart(products, config);
  }
}

export function destroyPlatform(platform: Platform): void {
  if (platform === 'tilda') {
    destroyTilda();
  } else if (platform === 'cscart') {
    destroyCSCart();
  }
}
