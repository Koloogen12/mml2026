import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { useWidgetStore } from '@/store';
import { initApi } from '@/api';
import type {
  ApiWidgetConfigResponse,
  Platform,
  SessionWithConfigResponse,
  WidgetConfig,
} from '@/types';
import { initPlatform } from '@/platforms';
import { initLocale } from '@/i18n';
import { setAssetsBase } from '@/lib/utils';
import '@/styles/widget.css';

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Montserrat',
  'Playfair Display',
  'Lato',
  'Poppins',
  'Open Sans',
  'Raleway',
];

function loadGoogleFont(fontFamily: string) {
  const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  if (!fontName || fontName === 'System Default') return;
  if (!GOOGLE_FONTS.includes(fontName)) return;

  const encodedFamily = fontName.replace(/\s+/g, '+');
  const linkId = `mml-font-${encodedFamily}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/**
 * Normalize a product's category to one of the Showroom layer buckets
 * (outerwear / tops / bottoms / shoes / accessories). When admin mapping
 * is missing or wrong (e.g. shoes labelled as 'tops' or left empty),
 * CS-Cart subcategory label + product name heuristics pick the right
 * layer — otherwise shoes land in the tops carousel. Plain-word patterns
 * (no `\b`) are intentional: JS `\b` is defined only for ASCII chars and
 * never fires on Cyrillic word boundaries.
 */
function inferProductCategory(name: string, subcategory: string | null | undefined, current: string | null | undefined): string {
  const n = (name || '').toLowerCase();
  const sub = (subcategory || '').toLowerCase();
  const cur = (current || '').toLowerCase();
  const matchSub = (): string | null => {
    if (/обувь|shoes|footwear/.test(sub)) return 'shoes';
    if (/аксессуар|сумк|ремн|пояс|украш|бижутер|accessor/.test(sub)) return 'accessories';
    if (/верхн.*одежд|пальто|куртк|outerwear/.test(sub)) return 'outerwear';
    if (/юбк|брюк|джинс|шорт|bottoms|skirts?|pants?/.test(sub)) return 'bottoms';
    if (/плать|топ|блуз|рубашк|dress|top|blouse|shirts?/.test(sub)) return 'tops';
    return null;
  };
  const matchName = (): string | null => {
    if (/юбк|брюк|джинс|шорт|бридж|лосин|леггинс|легинс|штан|клеш|капри/.test(n)) return 'bottoms';
    if (/пальт|куртк|тренч|кардиган|жакет|пиджак|плащ|дублёнк|дубленк|шуб|жилет|пуховик|бомбер|парк/.test(n)) return 'outerwear';
    if (/туфли|ботинк|ботильон|кроссов|кеды|сапог|босоножк|балетк|мокасин|сандали|угги|лофер|оксфорд|слипон|эспадрил|шлёп|шлеп|тапочк/.test(n)) return 'shoes';
    if (/сумк|клатч|кошел|ремен|пояс|шарф|платок|перчатк|шляп|шапк|берет|украш|бижутер|очки|часы|ожерел|кольц|сереж|браслет/.test(n)) return 'accessories';
    if (/плать|блуз|топ|рубашк|водолазк|джемпер|свитер|толстовк|худи|лонгслив|боди|футболк|комбинезон|костюм/.test(n)) return 'tops';
    return null;
  };
  const inferred = matchSub() || matchName();
  // Use inferred when admin category is empty OR clearly wrong (the common
  // mis-map of shoes/accessories as 'tops' seen in practice).
  if (!cur || (cur === 'tops' && inferred && inferred !== 'tops')) {
    return inferred || cur || 'tops';
  }
  return cur;
}

function mapApiConfig(raw: ApiWidgetConfigResponse): WidgetConfig {
  return {
    projectId: raw.projectId,
    apiBaseUrl: raw.apiBaseUrl,
    buttonPosition: raw.button_position,
    buttonOffsetX: raw.button_offset_x,
    buttonOffsetY: raw.button_offset_y,
    buttonType: raw.button_type,
    buttonSize: raw.button_size,
    buttonColor: raw.button_color,
    buttonTextColor: raw.button_text_color,
    buttonText: raw.button_text,
    buttonShadow: raw.button_shadow,
    buttonAnimation: raw.button_animation,
    modalWidth: raw.modal_width,
    modalHeight: raw.modal_height,
    primaryColor: raw.primary_color,
    secondaryColor: raw.secondary_color,
    backgroundColor: raw.background_color,
    textColor: raw.text_color,
    accentColor: raw.accent_color,
    fontFamily: raw.font_family,
    borderRadius: raw.border_radius ?? 12,
    stages: {
      intro: raw.stages?.intro,
      gender: raw.stages?.gender,
      parameters: raw.stages?.parameters,
      measurements: raw.stages?.measurements,
      bellyShape: raw.stages?.belly_shape,
      figureType: raw.stages?.figure_type,
      privacyPolicy: raw.stages?.privacy_policy,
      photoUpload: raw.stages?.photo_upload,
    },
    products: (raw.products ?? []).map((p) => ({
      id: p.id,
      publicId: p.public_id,
      name: p.name,
      photoUrl: p.photo_url,
      thumbnailUrl: p.thumbnail_url,
      category: inferProductCategory(p.name, p.subcategory, p.category),
      subcategory: p.subcategory,
      marketingTag: p.marketing_tag ?? '',
      sku: p.sku,
      color: p.color ?? null,
      price: p.price,
      currency: p.currency,
      productUrl: p.product_url,
      externalId: p.external_id ?? null,
      gender: (p as { gender?: string | null }).gender ?? null,
      sizeVariants: p.size_variants ?? null,
    })),
    avatarsEnabled: raw.avatars_enabled,
    avatarsMode: raw.avatars_mode,
    logoUrl: raw.logo_url,
    poweredByEnabled: raw.powered_by_enabled,
    rememberProgress: raw.remember_progress,
    autoOpen: raw.auto_open ?? false,
    autoOpenDelay: raw.auto_open_delay ?? 5,
    language: raw.language ?? 'auto',
    monthlyTryOnLimit: raw.monthly_tryon_limit ?? 10,
    elementsEnabled: {
      favorites: raw.elements_enabled?.favorites ?? true,
      cart: raw.elements_enabled?.cart ?? true,
      history: raw.elements_enabled?.history ?? true,
      settings: raw.elements_enabled?.settings ?? true,
    },
    clothTypesEnabled: {
      outerwear: raw.cloth_types_enabled?.outerwear ?? true,
      tops: raw.cloth_types_enabled?.tops ?? true,
      bottoms: raw.cloth_types_enabled?.bottoms ?? true,
      shoes: raw.cloth_types_enabled?.shoes ?? true,
    },
    introTitle: raw.intro_title ?? '',
    introDescription: raw.intro_description ?? '',
    introImage: raw.intro_image ?? '',
    paramsTitle: raw.params_title ?? '',
    paramsSubtitle: raw.params_subtitle ?? '',
    measurementsTitle: raw.measurements_title ?? '',
    measurementsSubtitle: raw.measurements_subtitle ?? '',
    bellyTitle: raw.belly_title ?? '',
    bellySubtitle: raw.belly_subtitle ?? '',
    figureTitle: raw.figure_title ?? '',
    figureSubtitle: raw.figure_subtitle ?? '',
  };
}

let widgetInitialized = false;

export function initWidget(data: SessionWithConfigResponse & { platform?: Platform }) {
  if (widgetInitialized) {
    console.log('[MML] initWidget already called, skipping');
    return;
  }
  widgetInitialized = true;

  console.log('[MML] initWidget called', data);

  const platform = data.platform ?? null;
  const config = mapApiConfig(data.config);

  console.log('[MML] config mapped', config);

  const assetsBase = config.assetsBaseUrl || config.apiBaseUrl;
  if (assetsBase) {
    setAssetsBase(assetsBase);
  }

  loadGoogleFont(config.fontFamily);

  const root = document.createElement('div');
  root.id = 'mml-widget-root';
  root.className = 'mml-root';
  root.style.cssText = `
    --mml-primary: ${config.primaryColor};
    --mml-secondary: ${config.secondaryColor};
    --mml-bg: ${config.backgroundColor};
    --mml-text: ${config.textColor};
    --mml-accent: ${config.accentColor};
    --mml-font: '${config.fontFamily}', sans-serif;
    --mml-modal-width: ${config.modalWidth}px;
    --mml-modal-height: ${config.modalHeight}px;
    --mml-button-size: ${config.buttonSize}px;
    --mml-button-color: ${config.buttonColor};
    --mml-button-text-color: ${config.buttonTextColor};
    --mml-radius: ${config.borderRadius}px;
    --mml-radius-sm: ${Math.max(config.borderRadius - 4, 4)}px;
    --mml-button-shadow: ${config.buttonShadow ? '0 4px 16px rgba(0,0,0,0.2)' : 'none'};
  `;
  document.body.appendChild(root);

  initLocale(config.language);
  initApi(config.apiBaseUrl);

  const store = useWidgetStore.getState();
  store.setConfig(config);
  store.applySession(data);

  console.log('[MML] store initialized, rendering App');

  const w = window as unknown as Record<string, unknown>;

  const openWidget = (opts?: { productId?: string }) => {
    const s = useWidgetStore.getState();
    if (opts?.productId) {
      s.setPendingProductExternalId(String(opts.productId).trim());
      if (s.modelPhotoId) {
        s.goToStage('showroom');
      }
    }
    s.open();
  };

  // IMPORTANT: expose makeMeLook BEFORE initPlatform so platform modules
  // (CS-Cart, Tilda) can monkey-patch `open` to auto-preselect the current
  // product. If the assignment happens *after* initPlatform, any monkey-patch
  // is wiped out and floating-button clicks never preselect.
  w.makeMeLook = { open: openWidget };

  // Render the React app. Order: store → makeMeLook → render → initPlatform.
  createRoot(root).render(<App />);

  // Initialize platform-specific features (e.g., Tilda/CS-Cart "Try On" buttons)
  if (platform) {
    initPlatform(platform, config.products, config, data.session_token, config.apiBaseUrl);
  }

  // Auto-open widget after configured delay
  if (config.autoOpen) {
    setTimeout(() => {
      useWidgetStore.getState().open();
    }, (config.autoOpenDelay ?? 5) * 1000);
  }

  // Re-read makeMeLook AFTER initPlatform so queued calls go through any
  // platform monkey-patch (current-product preselect on CS-Cart).
  const mml = w.makeMeLook as { open: (o?: { productId?: string }) => void };
  const queue = w._mmlQueue as Array<{ productId?: string }> | undefined;
  if (Array.isArray(queue)) {
    queue.forEach((opts) => mml.open(opts));
    delete w._mmlQueue;
  }
}

(window as unknown as Record<string, unknown>).__MML_INIT_WIDGET__ = initWidget;

(function () {
  const w = window as unknown as Record<string, unknown>;
  if (!w.makeMeLook) {
    w.makeMeLook = {
      open: (opts?: { productId?: string }) => {
        const queue = (w._mmlQueue as Array<unknown>) ?? [];
        queue.push(opts ?? {});
        w._mmlQueue = queue;
      },
    };
  }
})();
