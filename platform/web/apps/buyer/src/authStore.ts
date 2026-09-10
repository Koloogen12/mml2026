import { create } from "zustand";
import { useApp } from "./appStore";

// Паспорт стиля — форма /api/v1/passport (Preferences на бэке).
export interface PassportPrefs {
  for_whom?: string;
  display_name?: string;
  style_persona_blend?: string[];
  brands_love?: string[];
  brands_avoid?: string[];
  budget_by_category?: Record<string, number>;
  size_by_category?: Record<string, string>;
  lifestyle_allocation?: Record<string, string>;
  style_self_described?: string[];
  style_aspirational?: string[];
  desired_mood_default?: string;
  body_love?: string[];
  body_downplay?: string[];
  hard_constraints?: Record<string, unknown>;
}

// Стиль-код — генерируется моделью по ответам онбординга (/passport/style-code).
export interface StyleAxis { key: string; left: string; right: string; value: number }
export interface StyleCode { title: string; body: string; axes: StyleAxis[] }

export interface ConsentRecord {
  kind: string;
  version: string;
  granted: boolean;
  created_at: string;
}

// localStorage-флаг «онбординг уже проходили» — чтобы не показывать гостю
// первый экран на каждой перезагрузке. Токен в LS НЕ храним (durable = refresh-cookie).
const OB_DONE = "mml_ob_done";

interface AuthState {
  accessToken: string | null;
  user: { id: string; email: string } | null;
  authChecked: boolean; // попытка восстановить сессию завершена
  onboardingActive: boolean;
  onboardingName: string;
  avatarUrl: string;
  prefs: PassportPrefs | null;
  consents: ConsentRecord[];
  styleCode: StyleCode | null;
  styleCodeLoading: boolean;

  init: () => Promise<void>;
  uploadAvatar: (f: File) => Promise<boolean>;
  removeAvatar: () => Promise<void>;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
  requestCode: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verify: (email: string, code: string) => Promise<{ ok: boolean; is_new?: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadPassport: () => Promise<void>;
  loadStyleCode: () => Promise<void>;
  savePassport: (p: PassportPrefs) => Promise<boolean>;
  refineTaste: () => Promise<{ ok: boolean; addedBrands: string[] }>;
  loadConsents: () => Promise<void>;
  logConsent: (kind: string, version: string, granted: boolean) => Promise<void>;
  deleteBiometric: () => Promise<boolean>;
  startOnboarding: () => void;
  finishOnboarding: () => void;
}

// Обновление access-токена через httpOnly refresh-cookie.
async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/auth/refresh", { method: "POST" });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  authChecked: false,
  onboardingActive: false,
  onboardingName: "",
  avatarUrl: "",
  prefs: null,
  consents: [],
  styleCode: null,
  styleCodeLoading: false,

  async init() {
    const tok = await refreshToken();
    if (tok) {
      set({ accessToken: tok, authChecked: true, onboardingActive: false });
      useApp.setState({ loggedIn: true });
      // Имя для приветствия — из /me (переживает перезагрузку).
      try {
        const meRes = await get().authFetch("/api/v1/me");
        if (meRes.ok) {
          const me = (await meRes.json()) as { display_name?: string; avatar_url?: string };
          if (me.display_name) set({ onboardingName: me.display_name });
          set({ avatarUrl: me.avatar_url ?? "" });
        }
      } catch {
        /* без имени — приветствие без обращения */
      }
      await get().loadPassport();
      // Вход через Google/Яндекс не проходит через verify() и не знает is_new,
      // поэтому «новизну» определяем по факту: паспорта нет → человек тут
      // впервые → онбординг. Иначе зарегистрировавшийся кнопкой попадал бы в
      // приложение с пустым паспортом, и подбор работал бы вслепую.
      if (!get().prefs) set({ onboardingActive: true });
      void useApp.getState().loadFavorites();
    } else {
      const done = (() => {
        try {
          return !!localStorage.getItem(OB_DONE);
        } catch {
          return false;
        }
      })();
      set({ authChecked: true, onboardingActive: !done });
      useApp.setState({ loggedIn: false });
    }
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
        set({ accessToken: null, user: null });
        useApp.setState({ loggedIn: false });
      }
    }
    return res;
  },

  async requestCode(email) {
    try {
      const res = await fetch("/api/v1/auth/request-code", {
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
      return { ok: false, error: "Нет связи с сервером" };
    }
  },

  async verify(email, code) {
    try {
      const res = await fetch("/api/v1/auth/verify", {
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
        user: { id: string; email: string };
        is_new: boolean;
      };
      set({ accessToken: data.access_token, user: data.user });
      useApp.setState({ loggedIn: true });
      void useApp.getState().loadFavorites();
      return { ok: true, is_new: data.is_new };
    } catch {
      return { ok: false, error: "Нет связи с сервером" };
    }
  },

  async logout() {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      /* noop */
    }
    set({ accessToken: null, user: null, prefs: null, consents: [] });
    // Личные данные чистим, иначе следующий вошедший увидит чужие сердечки.
    useApp.setState({
      loggedIn: false,
      screen: "home",
      activeProduct: null,
      favIds: [],
      collections: [],
      collectionsLoaded: false,
      collectionItems: {},
      openCollection: null,
      pickerProduct: null,
    });
  },

  async loadPassport() {
    try {
      const res = await get().authFetch("/api/v1/passport");
      if (!res.ok) return;
      const data = (await res.json()) as { preferences: PassportPrefs | null };
      set({ prefs: data.preferences });
      // Для вошедшего пол берём из паспорта, а не из гостевого тумблера —
      // иначе мужчине показывалась женская витрина.
      const fw = (data.preferences?.for_whom || "").toLowerCase();
      const g = /^(male|men|man|мужское|м)$/.test(fw) ? "men"
        : /^(female|women|woman|женское|ж)$/.test(fw) ? "women" : null;
      if (g) useApp.getState().setGender(g);
    } catch {
      /* noop */
    }
  },

  // Стиль-код собирает модель; на сервере он кэшируется по отпечатку паспорта,
  // так что повторные заходы в паспорт модель не дёргают.
  async loadStyleCode() {
    if (get().styleCodeLoading) return;
    set({ styleCodeLoading: true });
    try {
      const res = await get().authFetch("/api/v1/passport/style-code");
      if (!res.ok) return;
      set({ styleCode: (await res.json()) as StyleCode | null });
    } catch {
      /* не собрался — паспорт честно скажет, что кода пока нет */
    } finally {
      set({ styleCodeLoading: false });
    }
  },

  async savePassport(p) {
    try {
      const res = await get().authFetch("/api/v1/passport", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) return false;
      set({ prefs: { ...(get().prefs || {}), ...p }, styleCode: null });
      void get().loadStyleCode(); // паспорт изменился — код пересоберётся
      return true;
    } catch {
      return false;
    }
  },

  // Фидбек-петля: POST /passport/refine — вытягивает бренды из поведения
  // в brands_love. Возвращает добавленные бренды (может быть пусто).
  async refineTaste() {
    try {
      const res = await get().authFetch("/api/v1/passport/refine", {
        method: "POST",
      });
      if (!res.ok) return { ok: false, addedBrands: [] };
      const data = (await res.json()) as { added_brands: string[] | null };
      const addedBrands = data.added_brands ?? [];
      // подтянуть обновлённый паспорт, чтобы карточка брендов освежилась
      if (addedBrands.length) await get().loadPassport();
      return { ok: true, addedBrands };
    } catch {
      return { ok: false, addedBrands: [] };
    }
  },

  async loadConsents() {
    try {
      const res = await get().authFetch("/api/v1/consents");
      if (!res.ok) return;
      const data = (await res.json()) as { items: ConsentRecord[] | null };
      set({ consents: data.items ?? [] });
    } catch {
      /* noop */
    }
  },

  async logConsent(kind, version, granted) {
    try {
      await get().authFetch("/api/v1/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, version, granted }),
      });
      await get().loadConsents();
    } catch {
      /* noop */
    }
  },

  async deleteBiometric() {
    try {
      const res = await get().authFetch("/api/v1/biometric", { method: "DELETE" });
      if (!res.ok) return false;
      await get().loadConsents();
      return true;
    } catch {
      return false;
    }
  },

  async uploadAvatar(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await get().authFetch("/api/v1/me/avatar", { method: "POST", body: fd });
    if (!res.ok) return false;
    const d = (await res.json()) as { avatar_url?: string };
    set({ avatarUrl: d.avatar_url ?? "" });
    return true;
  },

  async removeAvatar() {
    const res = await get().authFetch("/api/v1/me/avatar", { method: "DELETE" });
    if (res.ok) set({ avatarUrl: "" });
  },

  startOnboarding() {
    set({ onboardingActive: true });
  },

  finishOnboarding() {
    try {
      localStorage.setItem(OB_DONE, "1");
    } catch {
      /* noop */
    }
    set({ onboardingActive: false });
  },
}));

// Стор наружу только в dev — как и appStore: гонять состояния (пол, паспорт) из
// консоли при отладке, не заводя настоящую сессию. В прод-сборке ветки нет.
if (import.meta.env.DEV) (window as unknown as { __auth: typeof useAuth }).__auth = useAuth;
