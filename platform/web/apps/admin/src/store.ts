import { create } from "zustand";

// ────────────────────────────────────────────────────────────────────────────
// Внутренняя админ-консоль MakeMeLook (Ф1). Один экран, левое меню, 9 разделов.
// Стор держит: nav-навигацию (view), гейт-заголовки (X-Admin-Token / X-Admin-Actor)
// и данные всех разделов, загружаемые с /api/v1/admin/*.
// Правило честности: где бэк отдаёт has_data=false / пусто — показываем честное
// пустое состояние эталона, НЕ выдумываем цифры. При недоступном бэке (404/502)
// молча деградируем на пустые данные (мок-состояния эталона), помечено TODO(Ф7).
// ────────────────────────────────────────────────────────────────────────────

export type NavKey =
  | "desk"
  | "sitehome"
  | "blog"
  | "rate"
  | "users"
  | "partners"
  | "products"
  | "tryons"
  | "consents"
  | "funnel"
  | "flags";

const API = "/api/v1/admin";

// ── формы ответов бэка ──
export interface QueueItem {
  id: string;
  contact: string;
  display_name?: string;
  source?: string;
  status: string;
  last_action_at?: string;
  dialogs: number;
  tryons: number;
}
export interface DialogMessage {
  id: number;
  role: string;
  content: string;
  product_ids?: string[];
  created_at: string;
}
// A0 · паспорт стиля выбранного человека — GET /users/{publicID}/passport.
// passport === null → паспорт не заполнен (честное пустое состояние).
export interface DeskPassport {
  for_whom: string;
  persona: string[];
  brands_love: string[];
  brands_avoid: string[];
  self_described: string[];
  aspirational: string[];
  mood: string;
  budget_by_category: Record<string, number> | null;
  size_by_category: Record<string, string> | null;
}
export interface PartnerRow {
  id: string;
  brand_name: string;
  email: string;
  sources: number;
  last_sync_at?: string;
  last_sync_status?: string;
}
export interface RejectRow {
  external_id: string;
  title: string;
  reason: string;
  detail: string;
  created_at: string;
}
export interface ProductRow {
  id: string;
  brand: string;
  name: string;
  garment_zone?: string;
  tryon_eligible: boolean;
  tryon_ineligible_reason: string;
  enriched: boolean;
  price: number | null;
}
export interface TryonRow {
  id: string;
  status: string;
  model: string;
  cost_kopecks: number | null;
  error_reason: string;
  items: number | null;
  user: string;
  created_at: string;
}
export interface CostSummary {
  generations: number;
  pro_count: number;
  cost_kopecks_total: number;
  has_data: boolean;
  pro_share?: number;
  avg_cost_kopecks?: number;
}
export interface ConsentRow {
  user_id: string;
  email: string;
  kind: string;
  version: string;
  granted: boolean;
  ip: string;
  created_at: string;
}
export interface FunnelStage {
  key: string;
  label: string;
  count: number;
}
export interface AuditRow {
  actor: string;
  action: string;
  target: string;
  detail: unknown;
  created_at: string;
}
export type Flags = Record<string, string>;

interface AdminState {
  view: NavKey;
  adminToken: string;
  actor: string;

  // A0/A2
  queue: QueueItem[];
  queueCounts: Record<string, number>;
  queueLoaded: boolean;
  dialog: DialogMessage[];
  deskPassport: DeskPassport | null;
  deskPassportLoaded: boolean;
  // A1
  labeled: number;
  labelTarget: number;
  // A3
  partners: PartnerRow[];
  partnersLoaded: boolean;
  rejects: RejectRow[];
  // A4
  products: ProductRow[];
  productsLoaded: boolean;
  // A5
  tryons: TryonRow[];
  cost: CostSummary | null;
  tryonsLoaded: boolean;
  // A6
  consents: ConsentRow[];
  consentsLoaded: boolean;
  // A7
  funnel: FunnelStage[];
  funnelHasData: boolean;
  funnelLoaded: boolean;
  // A8
  flags: Flags;
  flagsLoaded: boolean;
  audit: AuditRow[];

  setView: (v: NavKey) => void;
  adminFetch: (path: string, init?: RequestInit) => Promise<Response>;

  loadQueue: (status?: string) => Promise<void>;
  loadDialog: (userId: string) => Promise<void>;
  loadDeskPassport: (userId: string) => Promise<void>;
  loadLabelStats: () => Promise<void>;
  loadPartners: () => Promise<void>;
  createPartner: (email: string, brandName: string) => Promise<boolean>;
  syncPartner: (publicID: string) => Promise<void>;
  pausePartner: (publicID: string, paused: boolean) => Promise<void>;
  hideProducts: (ids: string[]) => Promise<void>;
  enrichProducts: (ids: string[]) => Promise<number>;
  exportUser: (publicID: string) => Promise<void>;
  loadRejects: (partnerId: string) => Promise<void>;
  loadProducts: () => Promise<void>;
  loadTryons: (days?: number) => Promise<void>;
  loadConsents: (user?: string) => Promise<void>;
  loadFunnel: () => Promise<void>;
  loadFlags: () => Promise<void>;
  loadAudit: () => Promise<void>;

  markLead: (
    userId: string,
    status: string,
    amountKopecks?: number,
  ) => Promise<boolean>;
  setFlag: (key: string, value: string) => Promise<boolean>;
  deleteBiometric: (userId: string) => Promise<boolean>;
}

export const useAdmin = create<AdminState>((set, get) => ({
  view: "desk",
  adminToken: "",
  actor: "operator",

  queue: [],
  queueCounts: {},
  queueLoaded: false,
  dialog: [],
  deskPassport: null,
  deskPassportLoaded: false,
  labeled: 0,
  labelTarget: 300,
  partners: [],
  partnersLoaded: false,
  rejects: [],
  products: [],
  productsLoaded: false,
  tryons: [],
  cost: null,
  tryonsLoaded: false,
  consents: [],
  consentsLoaded: false,
  funnel: [],
  funnelHasData: false,
  funnelLoaded: false,
  flags: {},
  flagsLoaded: false,
  audit: [],

  setView(v) {
    set({ view: v });
    const g = get();
    // ленивая загрузка данных раздела при первом заходе
    switch (v) {
      case "desk":
      case "users":
        if (!g.queueLoaded) void g.loadQueue();
        break;
      case "rate":
        void g.loadLabelStats();
        break;
      case "partners":
        if (!g.partnersLoaded) void g.loadPartners();
        break;
      case "products":
        if (!g.productsLoaded) void g.loadProducts();
        break;
      case "tryons":
        if (!g.tryonsLoaded) void g.loadTryons();
        break;
      case "consents":
        if (!g.consentsLoaded) void g.loadConsents();
        break;
      case "funnel":
        if (!g.funnelLoaded) void g.loadFunnel();
        break;
      case "flags":
        if (!g.flagsLoaded) void g.loadFlags();
        void g.loadAudit();
        break;
    }
  },

  // fetch с гейт-заголовками. В dev ADMIN_TOKEN пуст → гейт открыт (заголовок
  // можно не слать), но закладываем возможность их проставить из стора.
  async adminFetch(path, init = {}) {
    const { adminToken, actor } = get();
    const headers: Record<string, string> = {
      ...((init.headers as Record<string, string>) || {}),
      "X-Admin-Actor": actor,
    };
    if (adminToken) headers["X-Admin-Token"] = adminToken;
    return fetch(path, { ...init, headers });
  },

  async loadQueue(status) {
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await get().adminFetch(`${API}/queue${q}`);
      if (!res.ok) {
        set({ queueLoaded: true }); // TODO(Ф7): деградация на мок эталона
        return;
      }
      const data = (await res.json()) as {
        items: QueueItem[] | null;
        counts: Record<string, number> | null;
      };
      set({
        queue: data.items ?? [],
        queueCounts: data.counts ?? {},
        queueLoaded: true,
      });
    } catch {
      set({ queueLoaded: true });
    }
  },

  async loadDialog(userId) {
    try {
      const res = await get().adminFetch(`${API}/users/${userId}/dialog`);
      if (!res.ok) {
        set({ dialog: [] });
        return;
      }
      const data = (await res.json()) as { messages: DialogMessage[] | null };
      set({ dialog: data.messages ?? [] });
    } catch {
      set({ dialog: [] });
    }
  },

  async loadDeskPassport(userId) {
    set({ deskPassport: null, deskPassportLoaded: false });
    try {
      const res = await get().adminFetch(`${API}/users/${userId}/passport`);
      if (!res.ok) {
        set({ deskPassportLoaded: true });
        return;
      }
      const data = (await res.json()) as { passport: DeskPassport | null };
      set({ deskPassport: data.passport ?? null, deskPassportLoaded: true });
    } catch {
      set({ deskPassportLoaded: true });
    }
  },

  async loadLabelStats() {
    try {
      const res = await get().adminFetch(`${API}/labels/stats`);
      if (!res.ok) return;
      const data = (await res.json()) as { labeled: number; target: number };
      set({ labeled: data.labeled, labelTarget: data.target });
    } catch {
      /* noop — эталонное 47/300 останется дефолтом */
    }
  },

  async loadPartners() {
    try {
      const res = await get().adminFetch(`${API}/partners`);
      if (!res.ok) {
        set({ partnersLoaded: true });
        return;
      }
      const data = (await res.json()) as { items: PartnerRow[] | null };
      set({ partners: data.items ?? [], partnersLoaded: true });
    } catch {
      set({ partnersLoaded: true });
    }
  },

  async exportUser(publicID) {
    try {
      const res = await get().adminFetch(`${API}/users/${publicID}/export`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-${publicID}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* игнор */
    }
  },

  async pausePartner(publicID, paused) {
    try {
      await get().adminFetch(`${API}/partners/${publicID}/pause`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused }) });
      await get().loadPartners();
    } catch { /* игнор */ }
  },

  async createPartner(email, brandName) {
    try {
      const res = await get().adminFetch(`${API}/partners`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, brand_name: brandName }) });
      if (!res.ok) return false;
      set({ partnersLoaded: false });
      await get().loadPartners();
      return true;
    } catch {
      return false;
    }
  },

  async syncPartner(publicID) {
    try {
      await get().adminFetch(`${API}/partners/${publicID}/sync`, { method: "POST" });
    } catch {
      /* async на бэке; результат ляжет в журнал синков */
    }
  },

  async loadRejects(partnerId) {
    try {
      const res = await get().adminFetch(
        `${API}/partners/${partnerId}/rejects`,
      );
      if (!res.ok) {
        set({ rejects: [] });
        return;
      }
      const data = (await res.json()) as { items: RejectRow[] | null };
      set({ rejects: data.items ?? [] });
    } catch {
      set({ rejects: [] });
    }
  },

  async loadProducts() {
    try {
      const res = await get().adminFetch(`${API}/products`);
      if (!res.ok) {
        set({ productsLoaded: true });
        return;
      }
      const data = (await res.json()) as { items: ProductRow[] | null };
      set({ products: data.items ?? [], productsLoaded: true });
    } catch {
      set({ productsLoaded: true });
    }
  },

  async hideProducts(ids) {
    try {
      await get().adminFetch(`${API}/products/hide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, hidden: true }),
      });
      set({ productsLoaded: false });
      await get().loadProducts();
    } catch {
      /* оставляем как есть */
    }
  },

  // Пересобрать атрибуты выбранных товаров ИИ. Асинхронно на бэке; возвращаем
  // число поставленных в очередь (0 при ошибке/недоступности LLM).
  async enrichProducts(ids) {
    try {
      const res = await get().adminFetch(`${API}/products/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) return 0;
      const data = (await res.json()) as { queued?: number };
      return data.queued ?? ids.length;
    } catch {
      return 0;
    }
  },

  async loadTryons(days = 30) {
    try {
      const res = await get().adminFetch(`${API}/tryons?days=${days}`);
      if (!res.ok) {
        set({ tryonsLoaded: true });
        return;
      }
      const data = (await res.json()) as {
        items: TryonRow[] | null;
        cost: CostSummary;
      };
      set({
        tryons: data.items ?? [],
        cost: data.cost,
        tryonsLoaded: true,
      });
    } catch {
      set({ tryonsLoaded: true });
    }
  },

  async loadConsents(user) {
    try {
      const q = user ? `?user=${encodeURIComponent(user)}` : "";
      const res = await get().adminFetch(`${API}/consents${q}`);
      if (!res.ok) {
        set({ consentsLoaded: true });
        return;
      }
      const data = (await res.json()) as { items: ConsentRow[] | null };
      set({ consents: data.items ?? [], consentsLoaded: true });
    } catch {
      set({ consentsLoaded: true });
    }
  },

  async loadFunnel() {
    try {
      const res = await get().adminFetch(`${API}/funnel`);
      if (!res.ok) {
        set({ funnelLoaded: true });
        return;
      }
      const data = (await res.json()) as {
        stages: FunnelStage[] | null;
        has_data: boolean;
      };
      set({
        funnel: data.stages ?? [],
        funnelHasData: data.has_data,
        funnelLoaded: true,
      });
    } catch {
      set({ funnelLoaded: true });
    }
  },

  async loadFlags() {
    try {
      const res = await get().adminFetch(`${API}/flags`);
      if (!res.ok) {
        set({ flagsLoaded: true });
        return;
      }
      const data = (await res.json()) as { flags: Flags | null };
      set({ flags: data.flags ?? {}, flagsLoaded: true });
    } catch {
      set({ flagsLoaded: true });
    }
  },

  async loadAudit() {
    try {
      const res = await get().adminFetch(`${API}/audit`);
      if (!res.ok) return;
      const data = (await res.json()) as { items: AuditRow[] | null };
      set({ audit: data.items ?? [] });
    } catch {
      /* noop */
    }
  },

  async markLead(userId, status, amountKopecks) {
    try {
      const res = await get().adminFetch(`${API}/users/${userId}/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(amountKopecks != null ? { amount_kopecks: amountKopecks } : {}),
        }),
      });
      if (!res.ok) return false;
      await get().loadQueue();
      return true;
    } catch {
      return false;
    }
  },

  async setFlag(key, value) {
    try {
      const res = await get().adminFetch(`${API}/flags/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) return false;
      // оптимистично + перезагрузка журнала
      set((st) => ({ flags: { ...st.flags, [key]: value } }));
      void get().loadAudit();
      return true;
    } catch {
      return false;
    }
  },

  async deleteBiometric(userId) {
    try {
      const res = await get().adminFetch(`${API}/users/${userId}/biometric`, {
        method: "DELETE",
      });
      if (!res.ok) return false;
      void get().loadConsents();
      return true;
    } catch {
      return false;
    }
  },
}));
