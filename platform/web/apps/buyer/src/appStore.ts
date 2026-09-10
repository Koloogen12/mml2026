import { create } from "zustand";
import type { MMLProduct, MMLOffer } from "@mml/ui";
import { useChat } from "./store";
import { useAuth } from "./authStore";
import { buyUrl } from "./product-utils";

// Контент главной — с сервера (/content), правится из админки.
// Дефолты держит бэкенд: держать вторую копию во фронте — гарантированный
// разъезд между тем, что редактор правит, и тем, что видит покупатель.
export interface HomeQuery { label: string; q: string }
export interface HomeTab { zone: string; label: string }
export interface HomeTrend { tag: string; title: string; q: string; image: string }
export interface HomeFeature { label: string; title: string; body: string }
export interface HomeContent {
  queries: Record<string, HomeQuery[]>;
  placeholders: Record<string, string[]>;
  refine_tabs: HomeTab[];
  trending: Record<string, HomeTrend[]>;
  features: HomeFeature[];
}

// Коллекция — форма /api/v1/collections (борд со счётчиком и обложкой).
export interface Collection {
  id: string;
  name: string;
  is_default: boolean;
  count: number;
  cover_url?: string;
}

export type Screen =
  | "home"
  | "chat"
  | "favorites"
  | "passport"
  | "brand"
  | "redirect"
  | "blog"
  | "post";

interface AppState {
  screen: Screen;
  prevScreen: Screen;
  catalog: MMLProduct[];
  // Витрина бренда: какой бренд открыт и его товары (реальные, с бэка).
  activeBrand: { slug: string; name: string } | null;
  brandProducts: MMLProduct[];
  brandLoading: boolean;
  catalogLoaded: boolean;

  favIds: string[];
  wardrobe: string[];
  dismissed: string[];
  unfollowed: string[];
  favMode: "items" | "collections";
  // Коллекции — с сервера (/collections). «Избранное» среди них дефолтная.
  collections: Collection[];
  collectionsLoaded: boolean;
  // Товар, для которого открыт пикер «сохранить в коллекцию» (null — закрыт).
  pickerProduct: MMLProduct | null;
  // Товары открытой коллекции: id коллекции → public_id товаров.
  collectionItems: Record<string, string[]>;
  openCollection: Collection | null;
  // Кэш товаров по public_id: сохранённая вещь может лежать вне текущей
  // витрины (другой пол, глубже 24-х) — без него избранное молча теряло вещи.
  productCache: Record<string, MMLProduct>;
  // Контент главной; null — ещё не загрузили.
  homeContent: HomeContent | null;

  activeProduct: MMLProduct | null;
  notMyStyle: MMLProduct | null;
  nmText: string;
  cardChat: string | null;
  cardChatText: string;

  gender: "women" | "men";
  refineTab: number;
  featTab: number;
  listening: boolean;
  homeInput: string;

  loggedIn: boolean;
  authOpen: boolean;
  authMode: "signin" | "signup";
  authPhone: string;

  redirectProduct: MMLProduct | null;
  redirectOffer: MMLOffer | null;

  toast: string;

  pdColorIdx: number;
  pdSizeIdx: number;
  pdSizeOpen: boolean;

  // actions
  loadCatalog: () => Promise<void>;
  loadHomeContent: () => Promise<void>;
  setGender: (g: "women" | "men") => void;
  // Гейт действий, требующих аккаунта: гостю открываем регистрацию, а не имитируем.
  requireAuth: () => boolean;
  openBrand: (brand: { slug: string; name: string }) => void;
  // Блог: slug открытой статьи.
  activePostSlug: string;
  openPost: (slug: string) => void;
  go: (s: Screen) => void;
  showToast: (t: string) => void;
  runSearch: (q: string) => void;
  openProduct: (p: MMLProduct) => void;
  closeProduct: () => void;
  toggleFav: (p: MMLProduct) => void;
  toggleWardrobe: (p: MMLProduct) => void;
  loadFavorites: () => Promise<void>;
  loadCollections: () => Promise<void>;
  createCollection: (name: string, addProduct?: MMLProduct | null) => Promise<boolean>;
  deleteCollection: (id: string) => Promise<void>;
  addToCollection: (c: Collection, p: MMLProduct) => Promise<void>;
  openCollectionBoard: (c: Collection) => Promise<void>;
  ensureProducts: (ids: string[]) => Promise<void>;
  productsByIds: (ids: string[]) => MMLProduct[];
  goRedirect: (p: MMLProduct, offer?: MMLOffer) => void;
  toggleVoice: () => void;
  excludeNm: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let rdTimer: ReturnType<typeof setTimeout> | undefined;
let voiceTimer: ReturnType<typeof setTimeout> | undefined;
let catalogPromise: Promise<void> | null = null;
let contentPromise: Promise<void> | null = null;

export const useApp = create<AppState>((set, get) => ({
  screen: "home",
  prevScreen: "home",
  catalog: [],
  activePostSlug: "",
  activeBrand: null,
  brandProducts: [],
  brandLoading: false,
  catalogLoaded: false,

  // Избранное живёт на сервере (дефолтная коллекция); здесь — гидратация из /favorites.
  favIds: [],
  wardrobe: [],
  dismissed: [],
  unfollowed: [],
  favMode: "items",
  collections: [],
  collectionsLoaded: false,
  pickerProduct: null,
  collectionItems: {},
  openCollection: null,
  productCache: {},
  homeContent: null,

  activeProduct: null,
  notMyStyle: null,
  nmText: "",
  cardChat: null,
  cardChatText: "",

  gender: "women",
  refineTab: 0,
  featTab: 0,
  listening: false,
  homeInput: "",

  // Стартуем гостем; authStore.init() восстановит сессию из refresh-cookie.
  loggedIn: false,
  authOpen: false,
  authMode: "signin",
  authPhone: "",

  redirectProduct: null,
  redirectOffer: null,

  toast: "",

  pdColorIdx: 0,
  pdSizeIdx: 1,
  pdSizeOpen: false,

  requireAuth() {
    if (get().loggedIn) return true;
    set({ authOpen: true, authMode: "signup" });
    return false;
  },

  openPost(slug) {
    set({ activePostSlug: slug });
    get().go("post");
  },

  openBrand(brand) {
    set({ activeBrand: brand, brandProducts: [], brandLoading: true });
    get().go("brand");
    void (async () => {
      try {
        const res = await fetch(`/api/v1/products?limit=48&brand=${encodeURIComponent(brand.slug)}`);
        if (!res.ok) throw new Error("brand products");
        const data = (await res.json()) as { items: MMLProduct[] | null };
        set({ brandProducts: data.items ?? [], brandLoading: false });
      } catch {
        set({ brandProducts: [], brandLoading: false });
      }
    })();
  },

  setGender(g) {
    if (get().gender === g) return;
    set({ gender: g });
    catalogPromise = null; // каталог зависит от пола — перезабираем
    void get().loadCatalog();
  },

  async loadHomeContent() {
    if (get().homeContent || contentPromise) return contentPromise ?? undefined;
    contentPromise = (async () => {
      try {
        const res = await fetch("/api/v1/content");
        if (!res.ok) throw new Error("content");
        set({ homeContent: (await res.json()) as HomeContent });
      } catch {
        /* не доехало — Home покажет пустые блоки, а не выдуманный контент */
      }
    })();
    return contentPromise;
  },

  async loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = (async () => {
      try {
        // Пол — реальный фильтр каталога (бэк добавляет unisex к выбранному).
        const g = get().gender === "men" ? "male" : "female";
        const res = await fetch(`/api/v1/products?limit=24&gender=${g}`);
        if (!res.ok) throw new Error(`products http ${res.status}`);
        const data = (await res.json()) as { items: MMLProduct[] };
        const items = data.items ?? [];
        set({
          catalog: items,
          catalogLoaded: true,
          // Избранное пустое по умолчанию: пользователь наполняет его сам
          // (раньше сидилось первыми 6 товарами — ложные «избранные»).
        });
      } catch {
        set({ catalogLoaded: true });
      }
    })();
    return catalogPromise;
  },

  go(s) {
    set({ prevScreen: get().screen, screen: s, activeProduct: null });
  },

  showToast(t) {
    set({ toast: t });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: "" }), 2200);
  },

  runSearch(q) {
    set({
      prevScreen: get().screen,
      screen: "chat",
      activeProduct: null,
      cardChat: null,
      cardChatText: "",
      homeInput: "",
      listening: false,
    });
    void useChat.getState().send(q);
  },

  openProduct(p) {
    set({ activeProduct: p, pdColorIdx: 0, pdSizeIdx: 1, pdSizeOpen: false });
  },
  closeProduct() {
    set({ activeProduct: null, pdSizeOpen: false });
  },

  // Сердце ♡ — оптимистично в UI, источник правды на сервере. Если сервер
  // отказал — откатываем и говорим честно, а не оставляем ложную отметку.
  toggleFav(p) {
    if (!get().requireAuth()) return;
    const has = get().favIds.includes(p.id);
    const before = get().favIds;
    set({ favIds: has ? before.filter((x) => x !== p.id) : before.concat(p.id) });
    get().showToast(has ? "Убрано из избранного" : "Сохранено в избранное ♡");
    void (async () => {
      try {
        const res = await useAuth.getState().authFetch("/api/v1/favorites/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: p.id }),
        });
        if (!res.ok) throw new Error("toggle");
        set({ collectionsLoaded: false }); // счётчики бордов освежатся при заходе
      } catch {
        set({ favIds: before });
        get().showToast("Не удалось сохранить — попробуйте ещё раз");
      }
    })();
  },

  async loadFavorites() {
    if (!get().loggedIn) return;
    try {
      const res = await useAuth.getState().authFetch("/api/v1/favorites");
      if (!res.ok) return;
      const data = (await res.json()) as { product_ids: string[] | null };
      const ids = data.product_ids ?? [];
      set({ favIds: ids });
      await get().ensureProducts(ids);
    } catch {
      /* без гидратации — сердечки пустые, но ничего не врёт */
    }
  },

  async loadCollections() {
    if (!get().loggedIn) return;
    try {
      const res = await useAuth.getState().authFetch("/api/v1/collections");
      if (!res.ok) return;
      const data = (await res.json()) as { items: Collection[] | null };
      set({ collections: data.items ?? [], collectionsLoaded: true });
    } catch {
      set({ collectionsLoaded: true });
    }
  },

  async createCollection(name, addProduct) {
    if (!get().requireAuth()) return false;
    try {
      const res = await useAuth.getState().authFetch("/api/v1/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        get().showToast(e.error ?? "Не удалось создать коллекцию");
        return false;
      }
      const { id } = (await res.json()) as { id: string };
      if (addProduct) {
        await useAuth.getState().authFetch(`/api/v1/collections/${id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: addProduct.id }),
        });
      }
      await get().loadCollections();
      get().showToast(addProduct ? `Сохранено в «${name}»` : `Коллекция «${name}» создана`);
      return true;
    } catch {
      get().showToast("Нет связи с сервером");
      return false;
    }
  },

  async deleteCollection(id) {
    try {
      const res = await useAuth.getState().authFetch(`/api/v1/collections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        get().showToast("Не удалось удалить коллекцию");
        return;
      }
      set({ openCollection: null });
      await get().loadCollections();
      get().showToast("Коллекция удалена");
    } catch {
      get().showToast("Нет связи с сервером");
    }
  },

  async addToCollection(c, p) {
    try {
      const res = await useAuth.getState().authFetch(`/api/v1/collections/${c.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: p.id }),
      });
      if (!res.ok) throw new Error("add");
      set({ pickerProduct: null });
      if (c.is_default && !get().favIds.includes(p.id)) {
        set({ favIds: get().favIds.concat(p.id) });
      }
      await get().loadCollections();
      get().showToast(`Сохранено в «${c.name}»`);
    } catch {
      get().showToast("Не удалось сохранить");
    }
  },

  // Дозагрузка недостающих товаров по public_id в кэш.
  async ensureProducts(ids) {
    const cache = get().productCache;
    const known = new Set(get().catalog.map((p) => p.id));
    const missing = ids.filter((id) => !cache[id] && !known.has(id));
    if (missing.length === 0) return;
    try {
      const res = await fetch(`/api/v1/products?limit=100&ids=${missing.join(",")}`);
      if (!res.ok) return;
      const data = (await res.json()) as { items: MMLProduct[] | null };
      const next = { ...get().productCache };
      for (const p of data.items ?? []) next[p.id] = p;
      set({ productCache: next });
    } catch {
      /* чего не добрали — просто не покажем, а не подменим чужим */
    }
  },

  // Товары по id в порядке ids: сперва витрина, затем кэш.
  productsByIds(ids) {
    const { catalog, productCache } = get();
    const byId = new Map(catalog.map((p) => [p.id, p]));
    return ids
      .map((id) => byId.get(id) ?? productCache[id])
      .filter((p): p is MMLProduct => !!p);
  },

  async openCollectionBoard(c) {
    set({ openCollection: c });
    try {
      const res = await useAuth.getState().authFetch(`/api/v1/collections/${c.id}/items`);
      if (!res.ok) return;
      const data = (await res.json()) as { product_ids: string[] | null };
      const ids = data.product_ids ?? [];
      set({ collectionItems: { ...get().collectionItems, [c.id]: ids } });
      await get().ensureProducts(ids);
    } catch {
      /* борд откроется пустым, а не с чужими вещами */
    }
  },

  toggleWardrobe(p) {
    if (!get().requireAuth()) return;
    const has = get().wardrobe.includes(p.id);
    set({
      wardrobe: has
        ? get().wardrobe.filter((x) => x !== p.id)
        : get().wardrobe.concat(p.id),
    });
    get().showToast(has ? "Убрано из Шкафа" : "В Шкаф — примерочная готова 🧥");
  },

  goRedirect(p, offer) {
    const from = get().screen;
    set({
      prevScreen: from,
      screen: "redirect",
      redirectProduct: p,
      redirectOffer: offer ?? p.offers[0] ?? null,
      activeProduct: null,
    });
    clearTimeout(rdTimer);
    rdTimer = setTimeout(() => {
      // CPA-редирект строго через /r/{id} (никогда сырой URL мерчанта)
      window.open(buyUrl(p, offer), "_blank", "noopener");
      set({ screen: get().prevScreen === "redirect" ? "chat" : get().prevScreen });
    }, 2600);
  },

  toggleVoice() {
    if (get().listening) {
      clearTimeout(voiceTimer);
      set({ listening: false });
      return;
    }
    set({ listening: true });
    clearTimeout(voiceTimer);
    // демо голосового ввода — как в макете
    voiceTimer = setTimeout(() => {
      set({ listening: false, homeInput: "Платье на выпускной, пастельных тонов" });
    }, 2200);
  },

  excludeNm() {
    set({ notMyStyle: null, nmText: "" });
    get().showToast("Учла — реже буду показывать похожее");
  },
}));

// Стор наружу только в dev — чтобы гонять состояния (вошедший/гость, пол) из
// консоли при отладке, не заводя настоящую сессию. В прод-сборке этой ветки нет.
if (import.meta.env.DEV) (window as unknown as { __app: typeof useApp }).__app = useApp;
