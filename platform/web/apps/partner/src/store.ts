import { create } from "zustand";
import type { MMLProduct } from "@mml/ui";

// ────────────────────────────────────────────────────────────────────────────
// Партнёрская поверхность MakeMeLook. Три surface (макеты-страницы связаны
// ссылками в оригинале): маркетинг → вход → кабинет.
// Стор держит: surface-навигацию, auth (email-код, зеркало buyer для партнёра)
// и данные партнёра (бренд, товары, превью-по-ссылке, источники каталога).
// Реальные эндпоинты — /api/v1/partner/*. Если бэк ещё не готов (404) —
// молча деградируем на demo/empty-состояние макета (см. TODO(Ф6)).
// ────────────────────────────────────────────────────────────────────────────

export type Surface = "marketing" | "auth" | "cabinet";

// Форма POST /partner/preview-product → распарсенная карточка (ГЕРОЙ).
// source_ok=false → og-тегов не хватило (нет name+image) → ручной ввод.
export interface PreviewProduct {
  url: string;
  name: string;
  image_url: string;
  price: string;
  currency: string;
  brand: string;
  source_ok: boolean;
}

export interface CatalogSource {
  kind: string;
  url: string;
  status: string;
  last_sync_at?: string;
  last_error?: string;
}

export interface PartnerBrand {
  name: string;
  slug?: string;
  logo_url?: string;
  description?: string;
}

export interface PartnerSettings {
  company: string;
  contact_person: string;
  email: string;
  notify_feed_errors: boolean;
  notify_weekly_digest: boolean;
}

interface PartnerState {
  surface: Surface;
  authChecked: boolean; // попытка восстановить сессию завершена
  init: () => Promise<void>;
  // auth
  accessToken: string | null;
  partner: { id: string; brand_name: string } | null;

  // data
  brand: PartnerBrand | null;
  settings: PartnerSettings | null;
  products: MMLProduct[];
  productsLoaded: boolean;
  catalogSources: CatalogSource[];

  setSurface: (s: Surface) => void;
  logout: () => Promise<void>;

  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
  requestCode: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verify: (
    email: string,
    code: string,
  ) => Promise<{ ok: boolean; is_new?: boolean; error?: string }>;

  loadBrand: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (s: PartnerSettings) => Promise<boolean>;
  uploadFile: (kind: "logo" | "size_chart", file: File) => Promise<string | null>;
  loadProducts: () => Promise<void>;
  hideProducts: (ids: string[], hidden: boolean) => Promise<boolean>;
  loadCatalogSources: () => Promise<void>;
  previewProduct: (url: string) => Promise<PreviewProduct | null>;
  connectSource: (
    kind: string,
    url?: string,
    schedule?: string,
  ) => Promise<{ ok: boolean; sync?: SyncSummary }>;
}

export interface SyncSummary {
  status: string; // ok | partial | failed
  added: number;
  updated: number;
  rejected: number;
}

async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/partner/auth/refresh", { method: "POST" });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export const usePartner = create<PartnerState>((set, get) => ({
  surface: "marketing",
  accessToken: null,
  partner: null,
  authChecked: false,

  brand: null,
  settings: null,
  products: [],
  productsLoaded: false,
  catalogSources: [],

  // Восстановление сессии по refresh-cookie при загрузке страницы.
  // Без этого партнёр, перезагрузив вкладку, оказывался снова на лендинге:
  // токен жил только в памяти, а init'а, в отличие от покупателя, не было.
  async init() {
    const tok = await refreshToken();
    if (!tok) {
      set({ authChecked: true });
      return;
    }
    set({ accessToken: tok, surface: "cabinet", authChecked: true });
    void get().loadBrand();
    void get().loadSettings();
    void get().loadProducts();
    void get().loadCatalogSources();
  },

  setSurface(s) {
    set({ surface: s });
    if (s === "cabinet") {
      void get().loadBrand();
      void get().loadSettings();
      void get().loadProducts();
      void get().loadCatalogSources();
    }
  },

  async logout() {
    try {
      await fetch("/api/v1/partner/auth/logout", { method: "POST" });
    } catch {
      /* всё равно чистим клиент */
    }
    set({ accessToken: null, partner: null, brand: null, settings: null, products: [], catalogSources: [], surface: "marketing" });
  },

  // fetch с Bearer; на 401 — одна попытка refresh + повтор.
  async authFetch(path, init = {}) {
    const doReq = (tok: string | null) =>
      fetch(path, {
        ...init,
        headers: {
          ...(init.headers || {}),
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        },
      });
    let res = await doReq(get().accessToken);
    if (res.status === 401) {
      const tok = await refreshToken();
      if (tok) {
        set({ accessToken: tok });
        res = await doReq(tok);
      } else {
        set({ accessToken: null, partner: null });
      }
    }
    return res;
  },

  async requestCode(email) {
    try {
      const res = await fetch("/api/v1/partner/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: e.error ?? "Не удалось отправить код" };
      }
      return { ok: true };
    } catch {
      // TODO(Ф6): реальный эндпоинт /partner/auth/request-code
      return { ok: false, error: "offline" };
    }
  },

  async verify(email, code) {
    try {
      const res = await fetch("/api/v1/partner/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: e.error ?? "Неверный код" };
      }
      const data = (await res.json()) as {
        access_token: string;
        partner: { id: string; brand_name: string };
        is_new: boolean;
      };
      set({ accessToken: data.access_token, partner: data.partner });
      return { ok: true, is_new: data.is_new };
    } catch {
      // TODO(Ф6): реальный эндпоинт /partner/auth/verify
      return { ok: false, error: "offline" };
    }
  },

  async loadBrand() {
    try {
      const res = await get().authFetch("/api/v1/partner/brand");
      if (!res.ok) return; // TODO(Ф6): fallback на demo-бренд макета
      const data = (await res.json()) as { brand: PartnerBrand };
      set({ brand: data.brand });
    } catch {
      /* noop — макет отрисует demo-бренд */
    }
  },

  async loadSettings() {
    try {
      const res = await get().authFetch("/api/v1/partner/settings");
      if (!res.ok) return;
      const data = (await res.json()) as { settings: PartnerSettings };
      set({ settings: data.settings });
    } catch {
      /* noop */
    }
  },

  async saveSettings(s) {
    try {
      const res = await get().authFetch("/api/v1/partner/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!res.ok) return false;
      set({ settings: s });
      return true;
    } catch {
      return false;
    }
  },

  async uploadFile(kind, file) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      // без Content-Type: браузер сам проставит multipart boundary
      const res = await get().authFetch(`/api/v1/partner/upload/${kind}`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { url?: string };
      if (kind === "logo" && data.url) {
        set((s) => ({ brand: s.brand ? { ...s.brand, logo_url: data.url } : s.brand }));
      }
      return data.url ?? null;
    } catch {
      return null;
    }
  },

  async loadProducts() {
    try {
      const res = await get().authFetch("/api/v1/partner/products");
      if (!res.ok) {
        set({ productsLoaded: true });
        return; // TODO(Ф6): fallback на demo-таблицу макета
      }
      const data = (await res.json()) as { items: MMLProduct[] | null };
      set({ products: data.items ?? [], productsLoaded: true });
    } catch {
      set({ productsLoaded: true });
    }
  },

  async hideProducts(ids, hidden) {
    try {
      const res = await get().authFetch("/api/v1/partner/products/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, hidden }),
      });
      if (!res.ok) return false;
      await get().loadProducts();
      return true;
    } catch {
      return false;
    }
  },

  async loadCatalogSources() {
    try {
      const res = await get().authFetch("/api/v1/partner/catalog-sources");
      if (!res.ok) return;
      const data = (await res.json()) as { items: CatalogSource[] | null };
      set({ catalogSources: data.items ?? [] });
    } catch {
      /* noop */
    }
  },

  // THE HERO: вставили одну ссылку → распарсенная карточка (og-теги).
  // source_ok=false → парсинг не вытащил name+image → ручной ввод.
  async previewProduct(url) {
    try {
      const res = await get().authFetch("/api/v1/partner/preview-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return null; // на 404/ошибку — demo-успех макета
      const data = (await res.json()) as { product: PreviewProduct };
      return data.product;
    } catch {
      return null;
    }
  },

  async connectSource(kind, url, schedule) {
    try {
      const res = await get().authFetch("/api/v1/partner/catalog-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, url, schedule }),
      });
      if (!res.ok) return { ok: false };
      const data = (await res.json()) as { added?: boolean; sync?: SyncSummary };
      await get().loadCatalogSources();
      await get().loadProducts();
      // Синк упал на бэке — считаем подключение неуспешным для визарда.
      if (data.sync && data.sync.status === "failed") return { ok: false, sync: data.sync };
      return { ok: !!data.added, sync: data.sync };
    } catch {
      return { ok: false };
    }
  },
}));
