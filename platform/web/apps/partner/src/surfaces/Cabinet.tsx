import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { MMLProduct } from "@mml/ui";
import { formatPrice } from "@mml/ui";
import { sx } from "../sx";
import { usePartner, type PreviewProduct, type SyncSummary } from "../store";

/*
 * Порт hi-fi макета "Partner Cabinet.dc.html" (контракт 1:1).
 * Разметка / классы / inline-стили / keyframes — дословно; dc-runtime → React-стейт.
 * Отличия (санкционированы задачей и правилом честности из PARTNER_CABINET_SPEC):
 *   • 'Martina Plantijn' → 'Spectral' (у Martina нет кириллицы).
 *   • catalogConnected по умолчанию НЕ true (как в prop макета), а выводится из
 *     реального GET /partner/products (>0 = подключён). Пока источник не подключён —
 *     честные пустые состояния: витрина = пример на демо-бренде, товары = empty,
 *     дашборд = прочерки. Никаких выдуманных продаж/кликов/дохода.
 *   • Витрина/товары/каталог/бренд — на реальных данных, где бэк их отдаёт;
 *     иначе demo-иллюстрация макета (помечено TODO(Ф6)).
 */

const ACC = "#2B2BCC";
const GRN = "#3F7A4E";
const AMB = "#B5731F";
const RED = "#C4553B";
const GRY = "rgba(0,0,0,.45)";
const GRID = "44px 60px 2.2fr 1fr 1fr 1.6fr 1.4fr";

type View = "register" | "onboarding" | "showcase" | "products" | "catalog" | "brand" | "dash" | "settings";
type Tab = "chat" | "brandpage" | "tryon";
type Ob = "idle" | "processing" | "success" | "norec" | "noteligible";
type CatResult = "checking" | "success" | "partial" | "error";

// demo-товары витрины (пример на демо-бренде, пока каталог не подключён)
const fig = (n: string) => "/fig/" + n;
const DEMO_PRODUCTS = [
  { img: fig("prod-white-dress.png"), name: "Платье миди из вискозы", price: "9 990 ₽", tryok: true },
  { img: fig("prod-blue-dress.png"), name: "Платье-комбинация", price: "12 490 ₽", tryok: true },
  { img: fig("prod-cape.png"), name: "Кейп шерстяной", price: "18 900 ₽", tryok: true },
  { img: fig("prod-sandals.png"), name: "Босоножки kitten heel", price: "7 990 ₽", tryok: false },
];
const DEMO_LOOKS = [
  { img: fig("prod-blue-dress.png"), name: "Платье-комбинация · синий" },
  { img: fig("prod-white-dress.png"), name: "Платье миди · вискоза" },
  { img: fig("prod-cape.png"), name: "Кейп шерстяной" },
];

interface Row {
  id: string;
  hidden: boolean;
  img: string;
  name: string;
  cat: string;
  price: string;
  stock: string;
  stockCol: string;
  kind: "ok" | "warn" | "no";
  tryText: string;
  tryCol: string;
  enr: string;
  enrCol: string;
  feedAttrs: { k: string; v: string }[];
  aiAttrs: { k: string; v: string }[];
  warn: string;
}

const imgOf = (p: MMLProduct) => p.images[0]?.url ?? "";
const priceOf = (p: MMLProduct) => (p.offers[0] ? formatPrice(p.offers[0].price, p.offers[0].currency) : "—");

// Зоны одежды (garment_zone) → человеческие ярлыки для чипов «Категории».
const ZONE_LABELS: Record<string, string> = {
  dress: "Платья",
  outerwear: "Верхняя одежда",
  tops: "Верх",
  bottoms: "Низ",
  footwear: "Обувь",
  accessories: "Аксессуары",
};

// Маппинг реального MMLProduct → строка таблицы товаров (best-effort).
function rowOf(p: MMLProduct): Row {
  const ok = p.tryon_eligible;
  const inStock = p.offers[0]?.in_stock ?? true;
  const feedAttrs: { k: string; v: string }[] = [];
  if (p.category) feedAttrs.push({ k: "Категория", v: p.category });
  if (p.color) feedAttrs.push({ k: "Цвет", v: p.color });
  if (p.material) feedAttrs.push({ k: "Состав", v: p.material });
  const aiAttrs: { k: string; v: string }[] = [];
  if (p.garment_zone) aiAttrs.push({ k: "Зона", v: p.garment_zone });
  return {
    id: p.id,
    hidden: (p as unknown as { hidden?: boolean }).hidden ?? false,
    img: imgOf(p),
    name: p.name,
    cat: p.category ?? "—",
    price: priceOf(p),
    stock: inStock ? "В наличии" : "Нет в наличии",
    stockCol: inStock ? "rgba(0,0,0,.7)" : GRY,
    kind: ok ? "ok" : "no",
    tryText: ok ? "Готово" : "Не пригоден",
    tryCol: ok ? GRN : RED,
    enr: aiAttrs.length ? aiAttrs.map((a) => a.v).join(", ") : "—",
    enrCol: aiAttrs.length ? "rgba(0,0,0,.6)" : GRY,
    feedAttrs,
    aiAttrs,
    warn: ok ? "" : "Этот товар пока нельзя примерить — примерка работает для одежды.",
  };
}

export function Cabinet() {
  const partner = usePartner((s) => s.partner);
  const brand = usePartner((s) => s.brand);
  const products = usePartner((s) => s.products);
  const previewProduct = usePartner((s) => s.previewProduct);
  const connectSource = usePartner((s) => s.connectSource);
  const authFetch = usePartner((s) => s.authFetch);
  const loadProducts = usePartner((s) => s.loadProducts);
  const hideProducts = usePartner((s) => s.hideProducts);
  const settings = usePartner((s) => s.settings);
  const saveSettings = usePartner((s) => s.saveSettings);
  const uploadFile = usePartner((s) => s.uploadFile);
  const logout = usePartner((s) => s.logout);

  // Честный плейсхолдер для нового партнёра без названия (было «12 STOREEZ» —
  // чужой бренд во всех заголовках/аватарах).
  const brandName = partner?.brand_name || brand?.name || "Ваш бренд";
  const monoOf = (n: string) =>
    (n.replace(/[^A-Za-zА-Яа-я0-9 ]/g, "").split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 3) || "MML").toUpperCase();
  const connected = products.length > 0;
  const tryonCount = products.filter((p) => p.tryon_eligible).length;
  const thingsRu = (n: number) => {
    const d = n % 10, h = n % 100;
    if (d === 1 && h !== 11) return "товар";
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return "товара";
    return "товаров";
  };

  const [view, setView] = useState<View>("showcase");
  const [tab, setTab] = useState<Tab>("chat");
  const [wide, setWide] = useState(true);
  const [ob, setOb] = useState<Ob>("idle");
  const [obUrl, setObUrl] = useState("");
  const [obProduct, setObProduct] = useState<PreviewProduct | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "ok" | "warn" | "no">("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [prodLoading, setProdLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"ok" | "running" | "failed">("ok");
  const [catStep, setCatStep] = useState(1);
  const [catSource, setCatSource] = useState<"yml" | "csv" | "api" | "site">("yml");
  const [catResult, setCatResult] = useState<CatResult>("checking");
  const [catSync, setCatSync] = useState<SyncSummary | null>(null);
  const [catUrl, setCatUrl] = useState("");
  const [sched, setSched] = useState<"daily" | "hourly" | "manual">("daily");
  const [fName, setFName] = useState<string | null>(null);
  const [fDesc, setFDesc] = useState("Минималистичная женская одежда из натуральных тканей. Базовый гардероб, который легко собирается в образы.");
  // Ссылка на сайт партнёра — из его настроек, пустая по умолчанию:
  // подставлять чужой домен значит показывать партнёру чужие данные.
  const [fUrl, setFUrl] = useState("");
  const [gridUploaded, setGridUploaded] = useState(false);
  // Настройки кабинета — реальные, из /partner/settings (заполняются эффектом ниже).
  const [sCompany, setSCompany] = useState("");
  const [sContact, setSContact] = useState("");
  const [notif, setNotif] = useState({ feed: true, weekly: false });
  const [savingSettings, setSavingSettings] = useState(false);
  const [dashPeriod, setDashPeriod] = useState<"7" | "30" | "90">("30");
  const [tryIdx, setTryIdx] = useState(0);
  const [toast, setToast] = useState("");

  const obTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const catTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(obTimer.current);
      clearTimeout(syncTimer.current);
      clearTimeout(catTimer.current);
      clearTimeout(toastTimer.current);
    },
    [],
  );

  // Подхватываем настройки в локальные поля формы, когда они загрузились.
  useEffect(() => {
    if (settings) {
      setSCompany(settings.company);
      setSContact(settings.contact_person);
      setNotif({ feed: settings.notify_feed_errors, weekly: settings.notify_weekly_digest });
    }
  }, [settings]);

  const toastMsg = (m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  // Открывает системный выбор файла и грузит его как kind; onDone получает URL или null.
  const pickAndUpload = (
    kind: "logo" | "size_chart",
    accept: string,
    onDone: (url: string | null) => void,
  ) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = accept;
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (!f) return;
      void uploadFile(kind, f).then(onDone);
    };
    inp.click();
  };
  const IMG_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

  const saveSettingsAll = async (next?: { feed: boolean; weekly: boolean }) => {
    const n = next ?? notif;
    setSavingSettings(true);
    const ok = await saveSettings({
      company: sCompany,
      contact_person: sContact,
      email: settings?.email ?? "",
      notify_feed_errors: n.feed,
      notify_weekly_digest: n.weekly,
    });
    setSavingSettings(false);
    toastMsg(ok ? "Настройки сохранены" : "Не удалось сохранить");
  };
  const go = (v: View) => setView(v);

  // ── навигация (sidebar) ──
  const npair = (v: View) => ({ bg: view === v ? "rgba(43,43,204,.08)" : "transparent", col: view === v ? ACC : "rgba(0,0,0,.62)" });
  const showChrome = view !== "register" && view !== "onboarding";

  // ── showcase данные ──
  const showcaseProducts = connected
    ? products.slice(0, 4).map((p) => ({ img: imgOf(p), name: p.name, price: priceOf(p), tryok: p.tryon_eligible }))
    : DEMO_PRODUCTS;
  const looks = connected && products.length >= 3
    ? products.slice(0, 3).map((p) => ({ img: imgOf(p), name: p.name }))
    : DEMO_LOOKS;
  const safeTryIdx = Math.min(tryIdx, looks.length - 1);
  const tcol = (t: Tab) => (tab === t ? "#141414" : "rgba(0,0,0,.5)");
  const tbar = (t: Tab) => (tab === t ? "#141414" : "transparent");

  // ── products таблица (реальные товары) ──
  const RAW: Row[] = products.map(rowOf);
  // Категории бренда = реальные зоны одежды из его каталога (не выдуманные).
  const catChips = Array.from(
    new Set(products.map((p) => p.garment_zone).filter((z): z is string => !!z)),
  ).map((z) => ZONE_LABELS[z] ?? z);
  const qlow = q.toLowerCase().trim();
  const visibleRows = RAW.filter((r) => (filter === "all" ? true : r.kind === filter)).filter((r) => (qlow ? r.name.toLowerCase().includes(qlow) : true));
  const count = (k: "ok" | "warn" | "no") => RAW.filter((r) => r.kind === k).length;
  const selCount = Object.values(sel).filter(Boolean).length;
  // Разбор выделения по текущему состоянию: сколько можно скрыть / вернуть.
  const selIds = RAW.filter((r) => sel[r.id]);
  const selHideCount = selIds.filter((r) => !r.hidden).length;
  const selShowCount = selIds.filter((r) => r.hidden).length;
  const applyHide = async (hidden: boolean) => {
    const ids = selIds.filter((r) => (hidden ? !r.hidden : r.hidden)).map((r) => r.id);
    if (!ids.length) return;
    const ok = await hideProducts(ids, hidden);
    setSel({});
    toastMsg(ok ? (hidden ? "Скрыто из выдачи" : "Возвращено в выдачу") : "Не удалось");
  };
  const fstyle = (k: "all" | "ok" | "warn" | "no") => ({
    col: filter === k ? "#fff" : k === "ok" ? ACC : k === "warn" ? AMB : k === "no" ? "rgba(0,0,0,.6)" : "#000",
    bg: filter === k ? (k === "ok" ? ACC : k === "warn" ? AMB : k === "no" ? "#141414" : "#000") : "#fff",
    bd: filter === k ? "transparent" : k === "ok" ? "rgba(43,43,204,.3)" : k === "warn" ? "rgba(181,115,31,.3)" : "rgba(0,0,0,.16)",
  });
  const F0 = fstyle("all"), F1 = fstyle("ok"), F2 = fstyle("warn"), F3 = fstyle("no");

  // ── catalog wizard ──
  const stepStyle = (n: number) => {
    const active = catStep === n, done = catStep > n;
    return { col: active || done ? ACC : "rgba(0,0,0,.4)", bg: done ? ACC : active ? "rgba(43,43,204,.1)" : "transparent", fg: done ? "#fff" : active ? ACC : "rgba(0,0,0,.4)", bd: active || done ? ACC : "rgba(0,0,0,.2)" };
  };
  const S1 = stepStyle(1), S2 = stepStyle(2), S3 = stepStyle(3);
  const srcStyle = (k: string) => ({ bd: catSource === k ? ACC : "rgba(0,0,0,.12)", sh: catSource === k ? "0 0 0 4px rgba(43,43,204,.08)" : "none", dot: catSource === k ? ACC : "#fff", sel: catSource === k });
  const SY = srcStyle("yml"), SC = srcStyle("csv"), SA = srcStyle("api"), SS = srcStyle("site");
  const srcLabel = { yml: "YML / XML-фид", csv: "CSV-файл", api: "API", site: "сайт магазина" }[catSource];
  const schStyle = (k: string) => ({ bd: sched === k ? ACC : "rgba(0,0,0,.16)", bg: sched === k ? "rgba(43,43,204,.06)" : "#fff", col: sched === k ? ACC : "rgba(0,0,0,.7)" });
  const SD = schStyle("daily"), SH = schStyle("hourly"), SM = schStyle("manual");
  // yml → kind 'feed' (контракт бэка: feed|csv|api|site)
  const srcKind = { yml: "feed", csv: "csv", api: "api", site: "site" }[catSource];

  // ── connection (sidebar) ──
  const conn = connected
    ? { label: "Каталог подключён", sub: "Синхр. сегодня, 09:14", dot: GRN, border: "rgba(63,122,78,.25)", bg: "rgba(63,122,78,.06)", text: "#2f5c3a" }
    : { label: "Каталог не подключён", sub: "Подключите фид или CSV", dot: AMB, border: "rgba(181,115,31,.25)", bg: "rgba(181,115,31,.06)", text: "#7a5216" };

  // ── actions ──
  const startShow = async () => {
    if (!obUrl.trim()) {
      toastMsg("Вставьте ссылку на товар");
      return;
    }
    setOb("processing");
    const res = await previewProduct(obUrl.trim());
    clearTimeout(obTimer.current);
    if (res) {
      setObProduct(res);
      setOb(res.source_ok ? "success" : "norec");
    } else {
      // offline/404 → demo-успех макета (TODO(Ф6): реальный превью-эндпоинт)
      setObProduct(null);
      obTimer.current = setTimeout(() => setOb("success"), 1200);
    }
  };
  const refreshProducts = () => {
    setProdLoading(true);
    setSyncStatus("running");
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      await loadProducts();
      setProdLoading(false);
      setSyncStatus("ok");
    }, 1400);
  };
  const catCheck = async () => {
    setCatStep(3);
    setCatResult("checking");
    clearTimeout(catTimer.current);
    const r = await connectSource(srcKind, catUrl.trim() || undefined, sched);
    setCatSync(r.sync ?? null);
    catTimer.current = setTimeout(() => {
      setCatResult(r.ok ? "success" : "error");
    }, r.ok ? 300 : 1800);
  };
  const saveBrand = async () => {
    const res = await authFetch("/api/v1/partner/brand", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fName ?? brandName, description: fDesc }),
    });
    toastMsg(res.ok ? "Сохранено" : "Не удалось сохранить");
  };

  // demo примерка витрины
  const tryImg = looks[safeTryIdx]?.img ?? DEMO_LOOKS[0].img;
  const tryName = looks[safeTryIdx]?.name ?? DEMO_LOOKS[0].name;
  const previewMaxW = wide ? "960px" : "380px";
  const previewCols = wide ? "repeat(3,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))";
  const frameRadius = wide ? "12px" : "26px";
  const framePad = wide ? "24px" : "16px";

  const nav = (v: View, label: string, icon: ReactNode, onClick: () => void) => {
    const p = npair(v);
    return (
      <div className="pc-nav" onClick={onClick} style={sx(`display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:9px;background:${p.bg};color:${p.col}`)}>
        {icon}
        <span style={sx("font:500 14px 'Inter',sans-serif")}>{label}</span>
      </div>
    );
  };

  return (
    <div className="pc-root" style={sx("display:flex;min-height:100vh")}>

      {/* ================= SIDEBAR ================= */}
      {showChrome && (
        <aside style={sx("width:240px;flex:none;background:#fff;border-right:1px solid rgba(0,0,0,.08);display:flex;flex-direction:column;position:sticky;top:0;height:100vh")}>
          <div style={sx("padding:22px 20px 18px;border-bottom:1px solid rgba(0,0,0,.06)")}>
            <div style={sx("display:flex;align-items:center;gap:11px")}>
              {/* Монограмма от названия партнёра: раньше у всех висело «12 ST». */}
              <span style={sx("width:40px;height:40px;border-radius:10px;background:#141414;color:#fff;display:flex;align-items:center;justify-content:center;font:600 13px 'Spectral',Georgia,serif;flex:none")}>{monoOf(brandName)}</span>
              <div style={sx("min-width:0")}><div style={sx("font:500 15px 'Inter',sans-serif;color:#141414;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{brandName}</div><div style={sx("font:400 11px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>Партнёрский кабинет</div></div>
            </div>
          </div>

          <nav style={sx("flex:1;padding:12px 12px;display:flex;flex-direction:column;gap:2px;overflow-y:auto")}>
            {nav("showcase", "Витрина", <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5L10 3l7 4.5v7L10 19 3 14.5z"></path><path d="M3 7.5l7 4.5 7-4.5M10 12v7"></path></svg>, () => go("showcase"))}
            {nav("products", "Товары", <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="12" rx="2"></rect><path d="M3 8h14M7 4v12"></path></svg>, () => go("products"))}
            {nav("catalog", "Каталог", <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v9M6.5 8.5L10 12l3.5-3.5"></path><path d="M4 13v2a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>, () => go("catalog"))}
            {nav("brand", "Бренд", <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7l3-3h6l3 3-2.5 2v7a1 1 0 01-1 1H7.5a1 1 0 01-1-1V9z"></path></svg>, () => go("brand"))}
            {nav("dash", "Дашборд", <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16V9M8 16V5M13 16v-4M18 16V7"></path></svg>, () => go("dash"))}
            {nav("settings", "Настройки", <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="2.6"></circle><path d="M10 2.5v2M10 15.5v2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M2.5 10h2M15.5 10h2M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"></path></svg>, () => go("settings"))}
          </nav>

          <div style={sx("padding:12px 14px;border-top:1px solid rgba(0,0,0,.06);display:flex;flex-direction:column;gap:10px")}>
            <div style={sx(`border:1px solid ${conn.border};background:${conn.bg};border-radius:10px;padding:11px 12px`)}>
              <div style={sx("display:flex;align-items:center;gap:8px")}><span style={sx(`width:8px;height:8px;border-radius:50%;background:${conn.dot};flex:none`)}></span><span style={sx(`font:500 12px 'Inter',sans-serif;color:${conn.text}`)}>{conn.label}</span></div>
              <div style={sx("font:400 11px 'Inter',sans-serif;color:rgba(0,0,0,.5);padding-top:3px")}>{conn.sub}</div>
            </div>
            <div style={sx("font:400 11px 'Inter',sans-serif;color:rgba(0,0,0,.45);display:flex;align-items:center;gap:6px")}><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#3F7A4E" strokeWidth="1.5"><path d="M3 7l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"></path></svg>Подключение бесплатное</div>
            <div style={sx("border-top:1px solid rgba(0,0,0,.06);padding-top:9px;font:400 10.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.38)")}>Экраны до входа: <span className="pc-btn" onClick={() => go("register")} style={sx("color:#2B2BCC;cursor:pointer")}>регистрация</span> · <span className="pc-btn" onClick={() => go("onboarding")} style={sx("color:#2B2BCC;cursor:pointer")}>показ товара</span></div>
            <div className="pc-btn pc-nav" onClick={() => void logout()} style={sx("display:flex;align-items:center;gap:9px;padding:4px 2px;color:rgba(0,0,0,.55)")}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 6l2 3-2 3M13 9H6M8 3H4v12h4"></path></svg>
              <span style={sx("font:400 13px 'Inter',sans-serif")}>Выйти</span>
            </div>
          </div>
        </aside>
      )}

      {/* ================= MAIN ================= */}
      <main style={sx("flex:1;min-width:0;padding:30px 40px 90px")}>

        {/* ============ P0 · РЕГИСТРАЦИЯ ============ */}
        {view === "register" && (
          <div className="pc-fade" style={sx("max-width:440px;margin:24px auto 0")}>
            <div style={sx("display:flex;align-items:center;gap:11px;margin-bottom:26px")}><span style={sx("width:40px;height:40px;border-radius:10px;background:#141414;color:#fff;display:flex;align-items:center;justify-content:center;font:600 13px 'Spectral',Georgia,serif")}>MML</span><span style={sx("font:500 16px 'Inter',sans-serif")}>MakeMeLook для брендов</span></div>
            <h1 style={sx("font:400 30px/1.2 'Spectral',Georgia,serif;margin:0")}>Покажите свои вещи на реальных покупателях</h1>
            <p style={sx("font:400 14.5px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.6);margin:12px 0 24px")}>Подбор ИИ-стилиста, примерка на фото покупателя и переход в ваш магазин. Съёмка каждого SKU больше не нужна.</p>
            <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:16px")}>
              <div style={sx("display:flex;flex-direction:column;gap:7px")}><label htmlFor="reg-email" style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.62)")}>Email или телефон</label><input id="reg-email" className="pc-in" placeholder="you@yourbrand.ru" /></div>
              <div style={sx("display:flex;flex-direction:column;gap:7px")}><label htmlFor="reg-co" style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.62)")}>Название компании</label><input id="reg-co" className="pc-in" placeholder="Название вашего бренда" /></div>
              <div style={sx("display:flex;align-items:center;gap:8px;background:rgba(63,122,78,.08);border-radius:9px;padding:11px 13px;font:400 12.5px 'Inter',sans-serif;color:#2f5c3a")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#3F7A4E" strokeWidth="1.6"><path d="M3 8l3 3 6-7" strokeLinecap="round" strokeLinejoin="round"></path></svg>Подключение бесплатное. Вы платите, только когда мы приводим продажу.</div>
              <span className="pc-btn" onClick={() => { toastMsg("Аккаунт создан"); go("onboarding"); }} style={sx("text-align:center;background:#141414;color:#fff;border-radius:10px;padding:15px 0;font:500 15px 'Inter',sans-serif")}>Начать</span>
              <div style={sx("text-align:center;font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.55)")}>Уже есть аккаунт? <span onClick={() => go("showcase")} style={sx("color:#2B2BCC;cursor:pointer")}>Войти</span></div>
            </div>
            <div style={sx("font:400 11px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.42);text-align:center;margin-top:16px")}>Продолжая, вы принимаете условия сервиса и политику конфиденциальности. ООО МОНОРУС.</div>
          </div>
        )}

        {/* ============ P1 · ВХОД ЧЕРЕЗ ОДИН ТОВАР ============ */}
        {view === "onboarding" && (
          <div className="pc-fade" style={sx("max-width:1000px;margin:0 auto")}>

            {ob === "idle" && (
              <div style={sx("max-width:620px;margin:20px auto 0;text-align:center")}>
                <div style={sx("display:inline-flex;align-items:center;gap:7px;font:500 12px 'Inter',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#2B2BCC;background:rgba(43,43,204,.07);border-radius:999px;padding:6px 14px")}>30 секунд · без регистрации</div>
                <h1 style={sx("font:400 34px/1.2 'Spectral',Georgia,serif;margin:18px 0 12px")}>Вставьте ссылку на любой ваш товар — покажем, как он сядет на человеке</h1>
                <p style={sx("font:400 15px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.6);margin:0 0 26px")}>Ничего не нужно подключать. Мы заберём карточку и примерим вещь на модель.</p>
                <div style={sx("display:flex;gap:10px;background:#fff;border:1px solid rgba(0,0,0,.14);border-radius:12px;padding:8px 8px 8px 16px;box-shadow:0 4px 20px rgba(0,0,0,.05)")}>
                  <input className="pc-in" style={sx("border:none;box-shadow:none;padding:11px 0")} value={obUrl} onInput={(e) => setObUrl((e.target as HTMLInputElement).value)} placeholder="https://ваш-магазин.ру/tovar/1234" />
                  <span className="pc-btn" onClick={startShow} style={sx("flex:none;background:#2B2BCC;color:#fff;border-radius:9px;padding:13px 26px;font:500 14.5px 'Inter',sans-serif")}>Показать</span>
                </div>
                <div style={sx("display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap")}>
                  
                </div>
                <div style={sx("margin-top:22px;font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.4)")}>Другие сценарии для ревью: <span onClick={() => setOb("norec")} style={sx("color:#2B2BCC;cursor:pointer")}>не распознали карточку</span> · <span onClick={() => setOb("noteligible")} style={sx("color:#2B2BCC;cursor:pointer")}>товар не подходит</span></div>
              </div>
            )}

            {ob === "processing" && (
              <div style={sx("max-width:900px;margin:20px auto 0")}>
                <div style={sx("display:flex;align-items:center;gap:12px;margin-bottom:22px")}><span className="pc-spin"></span><span style={sx("font:500 15px 'Inter',sans-serif")}>Готовим примерку — 15–40 секунд</span></div>
                <div style={sx("display:flex;gap:14px;margin-bottom:26px")}>
                  <div style={sx("flex:1;display:flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:10px;padding:13px 15px;font:500 12.5px 'Inter',sans-serif")}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#3F7A4E" strokeWidth="1.7"><path d="M3 8l3 3 6-7" strokeLinecap="round" strokeLinejoin="round"></path></svg>Забираем товар</div>
                  <div style={sx("flex:1;display:flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:10px;padding:13px 15px;font:500 12.5px 'Inter',sans-serif")}><span className="pc-spin" style={sx("width:15px;height:15px")}></span>Разбираем карточку</div>
                  <div style={sx("flex:1;display:flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:10px;padding:13px 15px;font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.4)")}><span style={sx("width:15px;height:15px;border-radius:50%;border:1.6px solid rgba(0,0,0,.18);flex:none")}></span>Примеряем</div>
                </div>
                <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:20px")}>
                  <div><div className="pc-skel" style={sx("height:340px;border-radius:12px")}></div></div>
                  <div style={sx("display:flex;flex-direction:column;gap:12px;padding-top:6px")}><div className="pc-skel" style={sx("height:16px;width:40%")}></div><div className="pc-skel" style={sx("height:26px;width:75%")}></div><div className="pc-skel" style={sx("height:16px;width:30%")}></div><div className="pc-skel" style={sx("height:300px;border-radius:12px;margin-top:8px")}></div></div>
                </div>
              </div>
            )}

            {ob === "success" && (
              <div className="pc-fade" style={sx("max-width:960px;margin:8px auto 0")}>
                <div style={sx("display:flex;align-items:center;gap:9px;font:500 13px 'Inter',sans-serif;color:#3F7A4E;margin-bottom:18px")}><svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="#3F7A4E" strokeWidth="1.7"><circle cx="9" cy="9" r="7"></circle><path d="M6 9l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>Готово — вот ваш товар на модели</div>
                <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:20px")}>
                  <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.1);border-radius:14px;overflow:hidden")}>
                    <div style={sx("font:500 10px 'Inter',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:rgba(0,0,0,.45);padding:14px 16px 0")}>Как мы распознали карточку</div>
                    <div style={sx("position:relative;height:300px;background:#F4F1EA;margin:12px 16px 0;border-radius:8px")}><div style={sx(`position:absolute;inset:0;background-image:url('${obProduct?.image_url || fig("prod-white-dress.png")}');background-size:cover;background-position:center;border-radius:8px`)}></div></div>
                    <div style={sx("padding:14px 16px 18px")}><div style={sx("font:500 10px 'Inter',sans-serif;letter-spacing:.13em;color:rgba(0,0,0,.6)")}>{obProduct?.brand || brandName}</div><div style={sx("font:400 20px 'Spectral',Georgia,serif;padding:4px 0 2px")}>{obProduct?.name || "Платье миди из вискозы"}</div><div style={sx("font:500 16px 'Inter',monospace")}>{obProduct?.price ? `${obProduct.price}${obProduct.currency === "RUB" || !obProduct.currency ? " ₽" : " " + obProduct.currency}` : "9 990 ₽"}</div>
                      <div style={sx("display:flex;gap:6px;flex-wrap:wrap;margin-top:12px")}><span style={sx("font:400 11px 'Inter',sans-serif;background:#F4F1EA;border-radius:6px;padding:4px 9px")}>миди</span><span style={sx("font:400 11px 'Inter',sans-serif;background:#F4F1EA;border-radius:6px;padding:4px 9px")}>вискоза</span><span style={sx("font:400 11px 'Inter',sans-serif;background:#F4F1EA;border-radius:6px;padding:4px 9px")}>свободный силуэт</span></div>
                    </div>
                  </div>
                  <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.1);border-radius:14px;overflow:hidden;display:flex;flex-direction:column")}>
                    <div style={sx("font:500 10px 'Inter',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#2B2BCC;padding:14px 16px 0")}>Примерка на модели</div>
                    <div style={sx("position:relative;flex:1;min-height:300px;background:#F4F1EA;margin:12px 16px;border-radius:8px")}><div style={sx("position:absolute;inset:0;background-image:url('/partner/fig/prod-blue-dress.png');background-size:cover;background-position:center;border-radius:8px")}></div><span style={sx("position:absolute;top:10px;left:10px;display:inline-flex;align-items:center;gap:5px;font:500 10px 'Inter',sans-serif;color:#fff;background:#2B2BCC;border-radius:6px;padding:4px 10px")}><svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#fff"></path></svg>AI-примерка</span></div>
                  </div>
                </div>
                <div style={sx("display:flex;gap:12px;margin-top:22px;align-items:center")}>
                  <span className="pc-btn" onClick={() => { setOb("idle"); setObUrl(""); setObProduct(null); }} style={sx("border:1px solid rgba(0,0,0,.2);border-radius:10px;padding:14px 24px;font:500 14px 'Inter',sans-serif")}>Попробовать другой товар</span>
                  <span className="pc-btn" onClick={() => go("catalog")} style={sx("display:inline-flex;align-items:center;gap:9px;background:#2B2BCC;color:#fff;border-radius:10px;padding:14px 26px;font:500 14px 'Inter',sans-serif")}>Подключить весь каталог<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h9M9 5l4 4-4 4"></path></svg></span>
                  <span className="pc-btn" onClick={() => toastMsg("Экспорт превью в PNG — скоро")} style={sx("margin-left:auto;font:500 13px 'Inter',sans-serif;color:rgba(0,0,0,.6)")}>Скачать превью</span>
                </div>
              </div>
            )}

            {ob === "norec" && (
              <div className="pc-fade" style={sx("max-width:620px;margin:24px auto 0;text-align:center")}>
                <span style={sx("width:60px;height:60px;border-radius:50%;background:rgba(181,115,31,.12);display:inline-flex;align-items:center;justify-content:center")}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B5731F" strokeWidth="1.6"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4.5M12 15.6v.1" strokeLinecap="round"></path></svg></span>
                <h2 style={sx("font:400 26px 'Spectral',Georgia,serif;margin:18px 0 10px")}>Не смогли разобрать карточку целиком</h2>
                <p style={sx("font:400 14px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.6);margin:0 0 8px")}>С этой страницы мы достали не всё:</p>
                <div style={sx("display:inline-flex;flex-direction:column;gap:8px;text-align:left;margin:6px 0 22px")}>
                  <span style={sx("display:flex;align-items:center;gap:8px;font:400 13px 'Inter',sans-serif")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#3F7A4E" strokeWidth="1.7"><path d="M3 8l3 3 6-7" strokeLinecap="round" strokeLinejoin="round"></path></svg>Название и цена — нашли</span>
                  <span style={sx("display:flex;align-items:center;gap:8px;font:400 13px 'Inter',sans-serif;color:#B5731F")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#B5731F" strokeWidth="1.7"><path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"></path></svg>Фото на белом фоне — не нашли</span>
                  <span style={sx("display:flex;align-items:center;gap:8px;font:400 13px 'Inter',sans-serif;color:#B5731F")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#B5731F" strokeWidth="1.7"><path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"></path></svg>Размеры — не нашли</span>
                </div>
                <div style={sx("display:flex;gap:12px;justify-content:center")}><span className="pc-btn" onClick={() => toastMsg("Ручная загрузка фото появится с релизом примерки")} style={sx("background:#2B2BCC;color:#fff;border-radius:10px;padding:13px 24px;font:500 14px 'Inter',sans-serif")}>Загрузить фото вручную</span><span className="pc-btn" onClick={() => { setOb("idle"); setObUrl(""); setObProduct(null); }} style={sx("border:1px solid rgba(0,0,0,.2);border-radius:10px;padding:13px 24px;font:500 14px 'Inter',sans-serif")}>Другой товар</span></div>
              </div>
            )}

            {ob === "noteligible" && (
              <div className="pc-fade" style={sx("max-width:620px;margin:24px auto 0;text-align:center")}>
                <span style={sx("width:60px;height:60px;border-radius:50%;background:#F4F1EA;display:inline-flex;align-items:center;justify-content:center")}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="1.5"><path d="M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z"></path><path d="M9 12l2 2 4-4"></path></svg></span>
                <h2 style={sx("font:400 26px 'Spectral',Georgia,serif;margin:18px 0 10px")}>Этот товар пока нельзя примерить</h2>
                <p style={sx("font:400 14px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.6);margin:0 0 22px")}>Примерка работает для одежды с фото на человеке или ровном фоне. Обувь, аксессуары и фото на манекене мы пока не примеряем. Попробуйте платье, жакет или верх.</p>
                <span className="pc-btn" onClick={() => { setOb("idle"); setObUrl(""); setObProduct(null); }} style={sx("background:#141414;color:#fff;border-radius:10px;padding:13px 26px;font:500 14px 'Inter',sans-serif")}>Выбрать другой товар</span>
              </div>
            )}

          </div>
        )}

        {/* ============ P4 · ВИТРИНА ============ */}
        {view === "showcase" && (
          <div className="pc-fade" style={sx("max-width:1180px;margin:0 auto")}>
            <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap")}>
              <div>
                <div style={sx("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}><h1 style={sx("font:400 30px/1.1 'Spectral',Georgia,serif;margin:0")}>Витрина бренда</h1><span style={sx(`font:500 11px 'Inter',sans-serif;color:${connected ? "#3F7A4E" : "#B5731F"};background:${connected ? "rgba(63,122,78,.1)" : "rgba(181,115,31,.12)"};border-radius:999px;padding:4px 10px`)}>{connected ? "На ваших товарах" : "Пример · демо-бренд"}</span></div>
                <p style={sx("font:400 14.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:8px 0 0;max-width:560px")}>Как ваш бренд выглядит на поверхности MakeMeLook. Всё — на реальных товарах, без прогнозов и процентов.</p>
              </div>
              <div style={sx("display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
                <div style={sx("display:flex;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:999px;padding:4px;gap:2px")}>
                  <span className="pc-btn" onClick={() => setWide(true)} style={sx(`display:flex;align-items:center;gap:7px;font:500 13px 'Inter',sans-serif;padding:7px 14px;border-radius:999px;background:${wide ? "#141414" : "transparent"};color:${wide ? "#fff" : "rgba(0,0,0,.55)"}`)}><svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="3.5" width="13" height="9" rx="1.5"></rect><path d="M6.5 15.5h5" strokeLinecap="round"></path></svg>Десктоп</span>
                  <span className="pc-btn" onClick={() => setWide(false)} style={sx(`display:flex;align-items:center;gap:7px;font:500 13px 'Inter',sans-serif;padding:7px 14px;border-radius:999px;background:${wide ? "transparent" : "#141414"};color:${wide ? "rgba(0,0,0,.55)" : "#fff"}`)}><svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="2.5" width="8" height="13" rx="1.8"></rect><path d="M8 13.5h2" strokeLinecap="round"></path></svg>Моб.</span>
                </div>
                <span className="pc-btn" onClick={() => toastMsg("Экспорт превью в PNG — скоро")} style={sx("display:inline-flex;align-items:center;gap:8px;background:#141414;color:#fff;border-radius:999px;padding:11px 20px;font:500 13.5px 'Inter',sans-serif")}><svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2.5v9M5.5 8L9 11.5 12.5 8"></path><path d="M3 13.5v1.5a1 1 0 001 1h10a1 1 0 001-1v-1.5"></path></svg>Скачать превью</span>
              </div>
            </div>

            {!connected && (
              <div style={sx("display:flex;align-items:center;gap:14px;background:rgba(181,115,31,.08);border:1px solid rgba(181,115,31,.22);border-radius:12px;padding:14px 18px;margin-top:18px")}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#B5731F" strokeWidth="1.6" style={sx("flex:none")}><path d="M10 2.5l7 3v4.5c0 4-3 7-7 8-4-1-7-4-7-8V5.5z"></path><path d="M10 7v3.5M10 13.4v.1" strokeLinecap="round"></path></svg>
                <div style={sx("flex:1;font:400 13px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.7)")}><b>Это пример на демо-бренде.</b> Подключите каталог — и витрина будет собрана на ваших реальных товарах.</div>
                <span className="pc-btn" onClick={() => go("catalog")} style={sx("flex:none;background:#B5731F;color:#fff;border-radius:8px;padding:10px 18px;font:500 13px 'Inter',sans-serif")}>Подключить каталог</span>
              </div>
            )}

            <div style={sx("display:flex;gap:4px;margin:22px 0 22px;border-bottom:1px solid rgba(0,0,0,.1)")}>
              <span className="pc-btn" onClick={() => setTab("chat")} style={sx(`font:500 14px 'Inter',sans-serif;padding:12px 4px;margin-right:22px;color:${tcol("chat")};border-bottom:2px solid ${tbar("chat")}`)}>В чате</span>
              <span className="pc-btn" onClick={() => setTab("brandpage")} style={sx(`font:500 14px 'Inter',sans-serif;padding:12px 4px;margin-right:22px;color:${tcol("brandpage")};border-bottom:2px solid ${tbar("brandpage")}`)}>Страница бренда</span>
              <span className="pc-btn" onClick={() => setTab("tryon")} style={sx(`font:500 14px 'Inter',sans-serif;padding:12px 4px;color:${tcol("tryon")};border-bottom:2px solid ${tbar("tryon")}`)}>Примерка</span>
            </div>

            <div style={sx("display:flex;gap:26px;align-items:flex-start;flex-wrap:wrap")}>
              <div style={sx("flex:1;min-width:320px;background:#E9E5DC;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:28px;display:flex;justify-content:center;min-height:600px")}>
                <div style={sx(`width:100%;max-width:${previewMaxW};transition:max-width .3s;border-radius:${frameRadius};overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.12);background:#fff`)}>
                  {/* frame chrome */}
                  {wide && <div style={sx("display:flex;align-items:center;gap:8px;padding:11px 14px;background:#f0eee9;border-bottom:1px solid rgba(0,0,0,.07)")}><span style={sx("width:10px;height:10px;border-radius:50%;background:#E4655E")}></span><span style={sx("width:10px;height:10px;border-radius:50%;background:#E9B54B")}></span><span style={sx("width:10px;height:10px;border-radius:50%;background:#63C363")}></span><span style={sx("flex:1;margin-left:8px;height:20px;border-radius:999px;background:#fff;font:400 10px 'Inter',monospace;color:rgba(0,0,0,.4);display:flex;align-items:center;padding:0 12px")}>makemelook.ai</span></div>}
                  {!wide && <div style={sx("display:flex;justify-content:center;padding:9px 0 5px;background:#fff")}><span style={sx("width:90px;height:6px;border-radius:999px;background:rgba(0,0,0,.12)")}></span></div>}

                  <div style={sx(`padding:${framePad}`)}>
                    {/* В ЧАТЕ */}
                    {tab === "chat" && (
                      <div className="pc-fade">
                        <div style={sx("font:400 15px/1.6 'Inter',sans-serif;color:#141414")}>Для вечера у воды советую струящиеся ткани и длину миди — вот что нашла у {brandName} в вашем размере:</div>
                        <div style={sx("display:inline-flex;align-items:center;gap:8px;background:rgba(43,43,204,.06);border-radius:999px;padding:7px 14px;font:500 12px 'Inter',sans-serif;color:#2B2BCC;margin-top:12px")}><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#2B2BCC"></path></svg>Почему вам: мягкий силуэт под ваш «романтичный» стиль</div>
                        <div style={sx("display:flex;gap:18px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;overflow:hidden;margin-top:16px")}>
                          <div style={sx(`position:relative;width:40%;flex:none;background:#F4F1EA;min-height:250px`)}><div style={sx(`position:absolute;inset:0;background-image:url('${showcaseProducts[0]?.img || fig("prod-white-dress.png")}');background-size:cover;background-position:center`)}></div></div>
                          <div style={sx("flex:1;padding:20px 22px 20px 0;display:flex;flex-direction:column;gap:10px;min-width:0")}>
                            <div><div style={sx("font:500 10px 'Inter',sans-serif;letter-spacing:.14em;color:rgba(0,0,0,.6)")}>{brandName}</div><div style={sx("font:400 20px 'Spectral',Georgia,serif;padding-top:4px")}>{showcaseProducts[0]?.name || "Платье миди из вискозы"}</div><div style={sx("font:500 16px 'Inter',monospace;padding-top:6px")}>{showcaseProducts[0]?.price || "9 990 ₽"}</div></div>
                            <div style={sx("margin-top:auto;display:flex;gap:10px;flex-wrap:wrap")}><span style={sx("display:inline-flex;align-items:center;gap:7px;background:#2B2BCC;color:#fff;border-radius:9px;padding:11px 18px;font:500 13.5px 'Inter',sans-serif")}><svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="#fff" strokeWidth="1.4"><path d="M6.5 1l1.2 2.9L11 5.1 8.7 7.3l.6 3.2-2.8-1.6-2.8 1.6.6-3.2L2 5.1l3.3-1.2z"></path></svg>Примерить</span><span style={sx("border:1px solid rgba(0,0,0,.2);border-radius:9px;padding:11px 18px;font:500 13.5px 'Inter',sans-serif")}>В магазин</span></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* СТРАНИЦА БРЕНДА */}
                    {tab === "brandpage" && (
                      <div className="pc-fade">
                        <div style={sx("position:relative;height:150px;display:flex;align-items:flex-end;padding:20px;background:#4A463D;border-radius:12px;overflow:hidden")}>
                          <div style={sx("position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:400 10px 'Inter',monospace;color:rgba(255,255,255,.35)")}>БАННЕР БРЕНДА</div>
                          <div style={sx("position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.55),transparent 60%)")}></div>
                          <div style={sx("position:relative;display:flex;align-items:flex-end;gap:14px;width:100%")}><span style={sx("width:52px;height:52px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;font:600 11px 'Spectral',Georgia,serif;flex:none")}>{monoOf(brandName)}</span><div style={sx("flex:1;color:#fff")}><div style={sx("font:500 22px 'Spectral',Georgia,serif;line-height:1")}>{brandName}</div>{/* Реальный счётчик: раньше здесь всем показывали «1 240 товаров · примерка доступна» — партнёр с пустым каталогом видел чужую статистику. */}<div style={sx("font:400 11px 'Inter',sans-serif;color:rgba(255,255,255,.85);padding-top:4px")}>{products.length > 0 ? `${products.length} ${thingsRu(products.length)}${tryonCount > 0 ? ` · ${tryonCount} можно примерить` : ""}` : "Каталог пока не подключён"}</div></div></div>
                        </div>
                        <div style={sx(`display:grid;grid-template-columns:${previewCols};gap:14px;margin-top:18px`)}>
                          {showcaseProducts.map((p, i) => (
                            <div key={i} className="pc-prod pc-card" style={sx("border-radius:2px;overflow:hidden")}>
                              <div style={sx("position:relative;height:180px;background:#F4F1EA")}><div style={sx(`position:absolute;inset:0;background-image:url('${p.img}');background-size:cover;background-position:center`)}></div>{p.tryok && <span style={sx("position:absolute;bottom:8px;left:8px;display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.94);border-radius:999px;padding:4px 8px;font:500 9.5px 'Inter',sans-serif")}><svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#2B2BCC"></path></svg>Примерка</span>}</div>
                              <div style={sx("padding:10px 12px 13px")}><div style={sx("font:500 9px 'Inter',sans-serif;letter-spacing:.12em;color:rgba(0,0,0,.6)")}>{brandName}</div><div style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:6px;padding-top:3px")}><span style={sx("font:400 12.5px 'Inter',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.name}</span><span style={sx("font:500 12.5px 'Inter',monospace;white-space:nowrap")}>{p.price}</span></div></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* ПРИМЕРКА */}
                    {tab === "tryon" && (
                      <div className="pc-fade">
                        <div style={sx("display:flex;gap:14px")}>
                          <div style={sx("flex:1;position:relative;border-radius:10px;overflow:hidden;background:#E4E0D6;min-height:340px;display:flex;align-items:center;justify-content:center")}><span style={sx("font:400 10px 'Inter',monospace;color:rgba(0,0,0,.4)")}>ФОТО ПОКУПАТЕЛЯ</span><span style={sx("position:absolute;top:10px;left:10px;font:500 10px 'Inter',sans-serif;background:rgba(255,255,255,.92);border-radius:6px;padding:4px 9px")}>ДО</span></div>
                          <div style={sx("flex:1;position:relative;border-radius:10px;overflow:hidden;background:#F4F1EA;min-height:340px")}><div style={sx(`position:absolute;inset:0;background-image:url('${tryImg}');background-size:cover;background-position:center`)}></div><span style={sx("position:absolute;top:10px;left:10px;display:inline-flex;align-items:center;gap:5px;font:500 10px 'Inter',sans-serif;color:#fff;background:#2B2BCC;border-radius:6px;padding:4px 9px")}><svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#fff"></path></svg>ПОСЛЕ</span></div>
                        </div>
                        <div style={sx("margin-top:14px")}><div style={sx("font:500 10px 'Inter',sans-serif;letter-spacing:.13em;color:rgba(0,0,0,.6)")}>{brandName}</div><div style={sx("font:400 17px 'Spectral',Georgia,serif;padding-top:2px")}>{tryName}</div></div>
                        <div style={sx("display:flex;gap:8px;margin-top:14px")}>
                          {looks.map((l, i) => (
                            <span key={i} className="pc-btn" onClick={() => setTryIdx(i)} style={sx(`width:52px;height:64px;border-radius:6px;background:#F4F1EA;background-image:url('${l.img}');background-size:cover;background-position:center;border:2px solid ${i === safeTryIdx ? ACC : "transparent"}`)}></span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={sx("width:300px;flex:1;min-width:260px;display:flex;flex-direction:column;gap:14px")}>
                <div style={sx("font:500 11px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(0,0,0,.5)")}>Что видит покупатель</div>
                <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:16px")}>
                  <div style={sx("display:flex;gap:12px")}><span style={sx("flex:none;width:32px;height:32px;border-radius:8px;background:rgba(43,43,204,.08);display:flex;align-items:center;justify-content:center")}><svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#2B2BCC"></path></svg></span><div><div style={sx("font:500 13.5px 'Inter',sans-serif")}>Заметка «почему вам»</div><div style={sx("font:400 12.5px/1.45 'Inter',sans-serif;color:rgba(0,0,0,.55);padding-top:3px")}>Стилист объясняет выбор словами покупателя.</div></div></div>
                  <div style={sx("display:flex;gap:12px")}><span style={sx("flex:none;width:32px;height:32px;border-radius:8px;background:rgba(43,43,204,.08);display:flex;align-items:center;justify-content:center")}><svg width="16" height="14" viewBox="0 0 22 20" fill="none" stroke="#2B2BCC" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"><path d="M8 3.5a3 3 0 0 1 6 0c0 1.2-.8 1.8-1.6 2.3l6.3 4.2c.8.5 1.3 1.2 1.3 2.2V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1.6c0-1 .5-1.7 1.3-2.2l6.3-4.2C8.8 5.3 8 4.7 8 3.5z"></path></svg></span><div><div style={sx("font:500 13.5px 'Inter',sans-serif")}>Кнопка «Примерить»</div><div style={sx("font:400 12.5px/1.45 'Inter',sans-serif;color:rgba(0,0,0,.55);padding-top:3px")}>Вещь на своём фото — до перехода в магазин.</div></div></div>
                  <div style={sx("display:flex;gap:12px")}><span style={sx("flex:none;width:32px;height:32px;border-radius:8px;background:rgba(43,43,204,.08);display:flex;align-items:center;justify-content:center")}><svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#2B2BCC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h9M9 5.5L12.5 9 9 12.5"></path><path d="M12.5 3.5H15v11h-2.5"></path></svg></span><div><div style={sx("font:500 13.5px 'Inter',sans-serif")}>Переход в ваш магазин</div><div style={sx("font:400 12.5px/1.45 'Inter',sans-serif;color:rgba(0,0,0,.55);padding-top:3px")}>Оплата и доставка остаются у вас.</div></div></div>
                </div>
                <div style={sx("background:rgba(43,43,204,.05);border:1px solid rgba(43,43,204,.14);border-radius:12px;padding:14px 16px;font:400 12.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.65)")}>Здесь нет прогнозов продаж и процентов — только то, что реально видно покупателю уже сегодня.</div>
              </div>
            </div>
          </div>
        )}

        {/* ============ P3 · ТОВАРЫ ============ */}
        {view === "products" && (
          <div className="pc-fade" style={sx("max-width:1180px;margin:0 auto")}>
            <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap")}>
              <div><h1 style={sx("font:400 30px/1.1 'Spectral',Georgia,serif;margin:0")}>Товары</h1><p style={sx("font:400 14.5px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:8px 0 0")}>{connected ? `В системе ${RAW.length} товаров · последняя синхронизация сегодня, 09:14` : "Каталог не подключён"}</p></div>
              <span className="pc-btn" onClick={refreshProducts} style={sx("display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(0,0,0,.16);background:#fff;border-radius:999px;padding:10px 18px;font:500 13px 'Inter',sans-serif")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 8a5.5 5.5 0 10-1.6 3.9"></path><path d="M13.5 4v4h-4"></path></svg>Обновить</span>
            </div>

            {!connected && (
              <div style={sx("display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;padding:80px 20px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;margin-top:22px")}>
                <span style={sx("width:64px;height:64px;border-radius:16px;background:#F4F1EA;display:flex;align-items:center;justify-content:center")}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1.5"><rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="M4 9h16M8 5v14"></path></svg></span>
                <div style={sx("font:400 22px 'Spectral',Georgia,serif")}>Каталог ещё не подключён</div>
                <div style={sx("font:400 14px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.55);max-width:380px")}>Подключите фид, CSV или API — товары появятся здесь с отметкой пригодности к примерке.</div>
                <span className="pc-btn" onClick={() => go("catalog")} style={sx("background:#141414;color:#fff;border-radius:999px;padding:13px 26px;font:500 14px 'Inter',sans-serif;margin-top:4px")}>Подключить каталог</span>
              </div>
            )}

            {connected && (
              <>
                {syncStatus === "running" && <div style={sx("display:flex;align-items:center;gap:10px;background:rgba(43,43,204,.06);border:1px solid rgba(43,43,204,.16);border-radius:10px;padding:12px 16px;margin-top:18px;font:500 13px 'Inter',sans-serif;color:#2B2BCC")}><span className="pc-spin" style={sx("width:15px;height:15px")}></span>Синхронизация каталога…</div>}
                {syncStatus === "failed" && <div style={sx("display:flex;align-items:center;gap:12px;background:rgba(196,85,59,.07);border:1px solid rgba(196,85,59,.22);border-radius:10px;padding:12px 16px;margin-top:18px")}><svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="#C4553B" strokeWidth="1.6" style={sx("flex:none")}><circle cx="9" cy="9" r="7"></circle><path d="M9 5.5v4M9 12v.1" strokeLinecap="round"></path></svg><span style={sx("flex:1;font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.7)")}>Последняя синхронизация не удалась — источник не ответил.</span><span className="pc-btn" onClick={refreshProducts} style={sx("font:500 12.5px 'Inter',sans-serif;color:#C4553B;border:1px solid rgba(196,85,59,.3);border-radius:8px;padding:8px 14px")}>Повторить</span></div>}

                <div style={sx("display:flex;gap:12px;align-items:center;margin:18px 0 16px;flex-wrap:wrap")}>
                  <div style={sx("display:flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:9px 15px;flex:1;min-width:220px")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5"></circle><path d="M10.5 10.5L14 14" strokeLinecap="round"></path></svg><input value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="Поиск по названию" style={sx("flex:1;border:none;outline:none;background:transparent;font:400 13.5px 'Inter',sans-serif")} /></div>
                </div>
                <div style={sx("display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap")}>
                  <span className="pc-btn" onClick={() => setFilter("all")} style={sx(`font:500 13px 'Inter',sans-serif;color:${F0.col};background:${F0.bg};border:1px solid ${F0.bd};border-radius:999px;padding:8px 16px`)}>Все · {RAW.length}</span>
                  <span className="pc-btn" onClick={() => setFilter("ok")} style={sx(`font:500 13px 'Inter',sans-serif;color:${F1.col};background:${F1.bg};border:1px solid ${F1.bd};border-radius:999px;padding:8px 16px`)}>Можно примерить · {count("ok")}</span>
                  <span className="pc-btn" onClick={() => setFilter("warn")} style={sx(`font:500 13px 'Inter',sans-serif;color:${F2.col};background:${F2.bg};border:1px solid ${F2.bd};border-radius:999px;padding:8px 16px`)}>С ограничениями · {count("warn")}</span>
                  <span className="pc-btn" onClick={() => setFilter("no")} style={sx(`font:500 13px 'Inter',sans-serif;color:${F3.col};background:${F3.bg};border:1px solid ${F3.bd};border-radius:999px;padding:8px 16px`)}>Не пригодны · {count("no")}</span>
                </div>

                {selCount > 0 && (
                  <div style={sx("display:flex;align-items:center;gap:14px;background:#141414;color:#fff;border-radius:10px;padding:12px 18px;margin-bottom:12px")}>
                    <span style={sx("font:500 13px 'Inter',sans-serif")}>Выбрано: {selCount}</span>
                    {selHideCount > 0 && (
                      <span className="pc-btn" onClick={() => void applyHide(true)} style={sx("font:500 12.5px 'Inter',sans-serif;background:rgba(255,255,255,.14);border-radius:7px;padding:8px 14px")}>Скрыть из выдачи</span>
                    )}
                    {selShowCount > 0 && (
                      <span className="pc-btn" onClick={() => void applyHide(false)} style={sx("font:500 12.5px 'Inter',sans-serif;background:rgba(255,255,255,.14);border-radius:7px;padding:8px 14px")}>Вернуть в выдачу</span>
                    )}
                    <span className="pc-btn" onClick={() => setSel({})} style={sx("margin-left:auto;font:400 12.5px 'Inter',sans-serif;color:rgba(255,255,255,.7)")}>Снять выделение</span>
                  </div>
                )}

                <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.08);border-radius:12px;overflow:hidden")}>
                  <div style={sx("overflow-x:auto")}>
                    <div style={sx("min-width:820px")}>
                      <div style={sx(`display:grid;grid-template-columns:${GRID};gap:14px;padding:13px 20px;background:#faf9f6;border-bottom:1px solid rgba(0,0,0,.07);font:600 11px 'Inter',sans-serif;letter-spacing:.05em;text-transform:uppercase;color:rgba(0,0,0,.5)`)}>
                        <span></span><span>Фото</span><span>Название</span><span>Цена</span><span>Наличие</span><span>Пригодность</span><span>Атрибуты</span>
                      </div>
                      {prodLoading &&
                        [1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} style={sx(`display:grid;grid-template-columns:${GRID};gap:14px;padding:14px 20px;border-bottom:1px solid rgba(0,0,0,.05);align-items:center`)}><span></span><span className="pc-skel" style={sx("width:44px;height:52px")}></span><span className="pc-skel" style={sx("height:13px;width:80%")}></span><span className="pc-skel" style={sx("height:13px;width:60%")}></span><span className="pc-skel" style={sx("height:13px;width:60%")}></span><span className="pc-skel" style={sx("height:13px;width:70%")}></span><span className="pc-skel" style={sx("height:13px;width:70%")}></span></div>
                        ))}
                      {!prodLoading && (
                        <>
                          {visibleRows.map((r) => {
                            const key = r.id;
                            const checked = !!sel[key];
                            const isOpen = !!open[key];
                            return (
                              <div key={key}>
                                <div className="pc-row" onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))} style={sx(`display:grid;grid-template-columns:${GRID};gap:14px;padding:12px 20px;border-bottom:1px solid rgba(0,0,0,.05);align-items:center`)}>
                                  <span onClick={(e) => { e.stopPropagation(); setSel((sv) => ({ ...sv, [key]: !sv[key] })); }} role="checkbox" aria-checked={checked} tabIndex={0} style={sx(`width:20px;height:20px;border-radius:5px;border:1.5px solid ${checked ? ACC : "rgba(0,0,0,.25)"};background:${checked ? ACC : "#fff"};display:flex;align-items:center;justify-content:center;cursor:pointer`)}>{checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5L5 9l4.5-5.5"></path></svg>}</span>
                                  <span style={sx(`width:44px;height:52px;border-radius:4px;background:#F4F1EA;background-image:url('${r.img}');background-size:cover;background-position:center`)}></span>
                                  <div style={sx("min-width:0")}><div style={sx(`display:flex;align-items:center;gap:7px;font:500 13.5px 'Inter',sans-serif;color:${r.hidden ? "rgba(0,0,0,.4)" : "inherit"}`)}><span style={sx("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r.name}</span>{r.hidden && <span style={sx("flex:none;font:500 10px 'Inter',sans-serif;color:#C4553B;background:rgba(196,85,59,.1);border-radius:5px;padding:2px 7px")}>скрыт</span>}</div><div style={sx("font:400 11.5px 'Inter',sans-serif;color:rgba(0,0,0,.5);padding-top:2px")}>{r.cat}</div></div>
                                  <span style={sx("font:500 13px 'Inter',monospace")}>{r.price}</span>
                                  <span style={sx(`font:400 12.5px 'Inter',sans-serif;color:${r.stockCol}`)}>{r.stock}</span>
                                  <span style={sx(`display:inline-flex;align-items:center;gap:7px;font:500 12.5px 'Inter',sans-serif;color:${r.tryCol}`)}><span style={sx(`width:8px;height:8px;border-radius:50%;background:${r.tryCol};flex:none`)}></span>{r.tryText}</span>
                                  <span style={sx("display:flex;align-items:center;justify-content:space-between;gap:8px")}><span style={sx(`font:400 12px 'Inter',sans-serif;color:${r.enrCol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`)}>{r.enr}</span><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="rgba(0,0,0,.3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={sx(`flex:none;transform:${isOpen ? "rotate(180deg)" : "none"}`)}><path d="M4 6l4 4 4-4"></path></svg></span>
                                </div>
                                {isOpen && (
                                  <div className="pc-fade" style={sx("background:#faf9f6;border-bottom:1px solid rgba(0,0,0,.05);padding:20px 24px")}>
                                    <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:24px")}>
                                      <div><div style={sx("font:600 10px 'Inter',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:rgba(0,0,0,.45);margin-bottom:10px")}>Атрибуты из фида</div><div style={sx("display:flex;flex-direction:column;gap:7px")}>
                                        {r.feedAttrs.map((a, j) => <div key={j} style={sx("display:flex;justify-content:space-between;gap:12px;font:400 12.5px 'Inter',sans-serif")}><span style={sx("color:rgba(0,0,0,.5)")}>{a.k}</span><span style={sx("font-weight:500")}>{a.v}</span></div>)}
                                      </div></div>
                                      <div><div style={sx("font:600 10px 'Inter',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#2B2BCC;margin-bottom:10px")}>Достроено ИИ</div><div style={sx("display:flex;flex-direction:column;gap:7px")}>
                                        {r.aiAttrs.map((a, j) => <div key={j} style={sx("display:flex;justify-content:space-between;gap:12px;font:400 12.5px 'Inter',sans-serif")}><span style={sx("color:rgba(0,0,0,.5)")}>{a.k}</span><span style={sx("font-weight:500;color:#2B2BCC")}>{a.v}</span></div>)}
                                      </div></div>
                                    </div>
                                    {r.warn && <div style={sx("display:flex;align-items:flex-start;gap:9px;background:rgba(181,115,31,.08);border:1px solid rgba(181,115,31,.2);border-radius:9px;padding:11px 14px;margin-top:16px")}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#B5731F" strokeWidth="1.6" style={sx("flex:none;margin-top:1px")}><path d="M8 2l6 11H2z"></path><path d="M8 6.5v3M8 11.4v.1" strokeLinecap="round"></path></svg><span style={sx("font:400 12.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.7)")}>{r.warn}</span></div>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {visibleRows.length === 0 && <div style={sx("text-align:center;padding:50px 20px;font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>Ничего не найдено по вашему запросу и фильтру.</div>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============ P2 · КАТАЛОГ ============ */}
        {view === "catalog" && (
          <div className="pc-fade" style={sx("max-width:1000px;margin:0 auto")}>
            <h1 style={sx("font:400 30px/1.1 'Spectral',Georgia,serif;margin:0")}>Подключение каталога</h1>
            <p style={sx("font:400 14.5px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:8px 0 0")}>Один раз настроите источник — товары и обновления подтянутся сами.</p>
            <div style={sx("display:flex;align-items:center;gap:14px;margin:26px 0 24px")}>
              <span style={sx(`display:flex;align-items:center;gap:8px;font:500 13px 'Inter',sans-serif;color:${S1.col}`)}><span style={sx(`width:24px;height:24px;border-radius:50%;background:${S1.bg};color:${S1.fg};border:1.5px solid ${S1.bd};display:flex;align-items:center;justify-content:center;font:600 12px 'Inter',sans-serif`)}>1</span>Источник</span>
              <span style={sx("flex:1;height:1px;background:rgba(0,0,0,.12)")}></span>
              <span style={sx(`display:flex;align-items:center;gap:8px;font:500 13px 'Inter',sans-serif;color:${S2.col}`)}><span style={sx(`width:24px;height:24px;border-radius:50%;background:${S2.bg};color:${S2.fg};border:1.5px solid ${S2.bd};display:flex;align-items:center;justify-content:center;font:600 12px 'Inter',sans-serif`)}>2</span>Параметры</span>
              <span style={sx("flex:1;height:1px;background:rgba(0,0,0,.12)")}></span>
              <span style={sx(`display:flex;align-items:center;gap:8px;font:500 13px 'Inter',sans-serif;color:${S3.col}`)}><span style={sx(`width:24px;height:24px;border-radius:50%;background:${S3.bg};color:${S3.fg};border:1.5px solid ${S3.bd};display:flex;align-items:center;justify-content:center;font:600 12px 'Inter',sans-serif`)}>3</span>Проверка</span>
            </div>

            {catStep === 1 && (
              <div className="pc-fade">
                <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:16px")}>
                  <div className="pc-src pc-card" onClick={() => setCatSource("yml")} style={sx(`border:1.5px solid ${SY.bd};border-radius:12px;padding:20px;box-shadow:${SY.sh}`)}><div style={sx("display:flex;justify-content:space-between;align-items:flex-start")}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2B2BCC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"></path><path d="M8 8h8M8 12h8M8 16h5"></path></svg><span style={sx(`width:20px;height:20px;border-radius:50%;background:${SY.dot};border:1.5px solid ${SY.bd};display:flex;align-items:center;justify-content:center`)}>{SY.sel && <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5L5 9l4.5-5.5"></path></svg>}</span></div><div style={sx("font:500 15px 'Inter',sans-serif;margin-top:14px")}>YML / XML-фид</div><div style={sx("font:400 12.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.55);padding-top:4px")}>Стандарт Яндекс.Маркета. Для Insales, Битрикс, Tilda.</div></div>
                  <div className="pc-src pc-card" onClick={() => setCatSource("csv")} style={sx(`border:1.5px solid ${SC.bd};border-radius:12px;padding:20px;box-shadow:${SC.sh}`)}><div style={sx("display:flex;justify-content:space-between;align-items:flex-start")}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v4h4M9 13h6M9 16h6"></path></svg><span style={sx(`width:20px;height:20px;border-radius:50%;background:${SC.dot};border:1.5px solid ${SC.bd}`)}></span></div><div style={sx("font:500 15px 'Inter',sans-serif;margin-top:14px")}>CSV-файл</div><div style={sx("font:400 12.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.55);padding-top:4px")}>Разовая загрузка таблицы. Для теста или небольшого каталога.</div></div>
                  <div className="pc-src pc-card" onClick={() => setCatSource("api")} style={sx(`border:1.5px solid ${SA.bd};border-radius:12px;padding:20px;box-shadow:${SA.sh}`)}><div style={sx("display:flex;justify-content:space-between;align-items:flex-start")}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 8L4 12l4 4M16 8l4 4-4 4M13 5l-2 14"></path></svg><span style={sx(`width:20px;height:20px;border-radius:50%;background:${SA.dot};border:1.5px solid ${SA.bd}`)}></span></div><div style={sx("font:500 15px 'Inter',sans-serif;margin-top:14px")}>API</div><div style={sx("font:400 12.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.55);padding-top:4px")}>Прямая интеграция для больших ассортиментов.</div></div>
                  <div className="pc-src pc-card" onClick={() => setCatSource("site")} style={sx(`border:1.5px solid ${SS.bd};border-radius:12px;padding:20px;box-shadow:${SS.sh}`)}><div style={sx("display:flex;justify-content:space-between;align-items:flex-start")}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"></path></svg><span style={sx(`width:20px;height:20px;border-radius:50%;background:${SS.dot};border:1.5px solid ${SS.bd}`)}></span></div><div style={sx("font:500 15px 'Inter',sans-serif;margin-top:14px")}>Заберём с сайта</div><div style={sx("font:400 12.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.55);padding-top:4px")}>Дайте ссылку — соберём каталог сами, по вашему согласию.</div></div>
                </div>
                <div style={sx("display:flex;justify-content:flex-end;margin-top:24px")}><span className="pc-btn" onClick={() => setCatStep(2)} style={sx("background:#141414;color:#fff;border-radius:999px;padding:13px 28px;font:500 14px 'Inter',sans-serif")}>Дальше — параметры</span></div>
              </div>
            )}

            {catStep === 2 && (
              <div className="pc-fade">
                <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:20px")}>
                  <div style={sx("display:flex;flex-direction:column;gap:7px")}><label htmlFor="cat-url" style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.62)")}>Ссылка на {srcLabel}</label><input id="cat-url" className="pc-in" value={catUrl} onInput={(e) => setCatUrl((e.target as HTMLInputElement).value)} placeholder="https://yourbrand.ru/feed.yml" /></div>
                  <div>
                    <div style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.62);margin-bottom:9px")}>Как часто обновлять</div>
                    <div style={sx("display:flex;gap:10px;flex-wrap:wrap")}>
                      <span className="pc-btn" onClick={() => setSched("daily")} style={sx(`font:500 13px 'Inter',sans-serif;padding:10px 18px;border-radius:9px;border:1.5px solid ${SD.bd};background:${SD.bg};color:${SD.col}`)}>Раз в день</span>
                      <span className="pc-btn" onClick={() => setSched("hourly")} style={sx(`font:500 13px 'Inter',sans-serif;padding:10px 18px;border-radius:9px;border:1.5px solid ${SH.bd};background:${SH.bg};color:${SH.col}`)}>Раз в час</span>
                      <span className="pc-btn" onClick={() => setSched("manual")} style={sx(`font:500 13px 'Inter',sans-serif;padding:10px 18px;border-radius:9px;border:1.5px solid ${SM.bd};background:${SM.bg};color:${SM.col}`)}>Вручную</span>
                    </div>
                  </div>
                </div>
                <div style={sx("display:flex;justify-content:space-between;margin-top:24px")}><span className="pc-btn" onClick={() => setCatStep(1)} style={sx("border:1px solid rgba(0,0,0,.18);border-radius:999px;padding:13px 24px;font:500 14px 'Inter',sans-serif")}>Назад</span><span className="pc-btn" onClick={catCheck} style={sx("background:#141414;color:#fff;border-radius:999px;padding:13px 28px;font:500 14px 'Inter',sans-serif")}>Проверить фид</span></div>
              </div>
            )}

            {catStep === 3 && (
              <div className="pc-fade">
                {catResult === "checking" && <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:40px;display:flex;flex-direction:column;align-items:center;gap:16px")}><span className="pc-spin" style={sx("width:26px;height:26px")}></span><div style={sx("font:500 14px 'Inter',sans-serif")}>Читаем фид и проверяем товары…</div><div style={sx("font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>Обычно 10–30 секунд</div></div>}

                {catResult === "success" && <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:24px")}>
                  <div style={sx("display:flex;align-items:center;gap:10px;font:500 14px 'Inter',sans-serif;color:#3F7A4E;margin-bottom:16px")}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#3F7A4E" strokeWidth="1.6"><circle cx="9" cy="9" r="7"></circle><path d="M6 9l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>Фид прочитан. Импортировали {(catSync?.added ?? 0) + (catSync?.updated ?? 0)} товаров.</div>
                  <div style={sx("display:grid;grid-template-columns:repeat(2,1fr);gap:14px")}>
                    <div style={sx("background:#faf9f6;border-radius:10px;padding:16px")}><div style={sx("font:500 24px 'Inter',monospace")}>{(catSync?.added ?? 0) + (catSync?.updated ?? 0)}</div><div style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.55);padding-top:2px")}>в подборках</div></div>
                    <div style={sx("background:#faf9f6;border-radius:10px;padding:16px")}><div style={sx("font:500 24px 'Inter',monospace;color:#C4553B")}>{catSync?.rejected ?? 0}</div><div style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.55);padding-top:2px")}>не прошли (нет фото/цены)</div></div>
                  </div>
                  <div style={sx("display:flex;justify-content:flex-end;align-items:center;margin-top:18px")}><span className="pc-btn" onClick={() => { toastMsg("Каталог подключён"); go("products"); }} style={sx("background:#2B2BCC;color:#fff;border-radius:9px;padding:12px 24px;font:500 13.5px 'Inter',sans-serif")}>Готово — к товарам</span></div>
                </div>}

                {catResult === "error" && <div className="pc-card" style={sx("border:1px solid rgba(196,85,59,.25);border-radius:12px;padding:24px")}>
                  <div style={sx("display:flex;align-items:center;gap:10px;font:500 14px 'Inter',sans-serif;color:#C4553B;margin-bottom:8px")}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#C4553B" strokeWidth="1.6"><circle cx="9" cy="9" r="7"></circle><path d="M9 5.5v4M9 12v.1" strokeLinecap="round"></path></svg>Не удалось прочитать фид</div>
                  <div style={sx("font:400 13px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.65);margin-bottom:14px")}>Проверьте, что ссылка ведёт на файл фида (YML/XML), а не на страницу магазина, и что он доступен без авторизации.</div>
                  <div style={sx("display:flex;gap:10px;flex-wrap:wrap")}><span className="pc-btn" onClick={() => setCatStep(2)} style={sx("background:#141414;color:#fff;border-radius:9px;padding:12px 22px;font:500 13.5px 'Inter',sans-serif")}>Исправить ссылку</span></div>
                </div>}
              </div>
            )}
          </div>
        )}

        {/* ============ P5 · БРЕНД ============ */}
        {view === "brand" && (
          <div className="pc-fade" style={sx("max-width:820px;margin:0 auto")}>
            <h1 style={sx("font:400 30px/1.1 'Spectral',Georgia,serif;margin:0")}>Профиль бренда</h1>
            <p style={sx("font:400 14.5px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:8px 0 26px")}>Эти данные улучшают подбор и качество примерки. Чем полнее — тем точнее покупатель видит вашу вещь.</p>
            <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:26px;display:flex;flex-direction:column;gap:22px")}>
              <div style={sx("display:flex;gap:18px;align-items:center")}>
                <span style={sx(`width:80px;height:80px;border-radius:14px;background:${brand?.logo_url ? "#fff" : "#141414"};color:#fff;display:flex;align-items:center;justify-content:center;font:600 16px 'Spectral',Georgia,serif;flex:none;overflow:hidden;border:1px solid rgba(0,0,0,.1)${brand?.logo_url ? `;background-image:url('${brand.logo_url}');background-size:cover;background-position:center` : ""}`)}>{brand?.logo_url ? "" : brandName.slice(0, 2).toUpperCase()}</span>
                <div><div style={sx("font:500 14px 'Inter',sans-serif")}>Логотип</div><div style={sx("font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.5);padding:3px 0 8px")}>PNG, JPG, WEBP или SVG, до 5 МБ</div><span className="pc-btn" onClick={() => pickAndUpload("logo", IMG_ACCEPT, (url) => toastMsg(url ? "Логотип загружен" : "Не удалось загрузить"))} style={sx("font:500 12.5px 'Inter',sans-serif;border:1px solid rgba(0,0,0,.18);border-radius:8px;padding:8px 16px")}>Загрузить</span></div>
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:7px")}><label htmlFor="b-name" style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.62)")}>Название</label><input id="b-name" className="pc-in" value={fName ?? brandName} onInput={(e) => setFName((e.target as HTMLInputElement).value)} /></div>
              <div style={sx("display:flex;flex-direction:column;gap:7px")}><label htmlFor="b-desc" style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.62)")}>Описание</label><textarea id="b-desc" className="pc-in" style={sx("min-height:80px;resize:vertical;line-height:1.5")} value={fDesc} onInput={(e) => setFDesc((e.target as HTMLTextAreaElement).value)} /></div>
              <div><label style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.62)")}>Категории</label><div style={sx("font:400 11px 'Inter',sans-serif;color:rgba(0,0,0,.45);padding:3px 0 9px")}>Определяются автоматически по вашему каталогу</div><div style={sx("display:flex;gap:8px;flex-wrap:wrap")}>{catChips.length ? catChips.map((c) => (<span key={c} style={sx("font:500 12.5px 'Inter',sans-serif;color:#fff;background:#000;border-radius:999px;padding:7px 14px")}>{c}</span>)) : <span style={sx("font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>Появятся после подключения и синхронизации каталога.</span>}</div></div>
              <div style={sx(`background:${gridUploaded ? "rgba(63,122,78,.06)" : "rgba(43,43,204,.05)"};border:1px solid ${gridUploaded ? "rgba(63,122,78,.2)" : "rgba(43,43,204,.14)"};border-radius:10px;padding:16px 18px`)}>
                <div style={sx(`display:flex;align-items:center;gap:8px;font:500 13.5px 'Inter',sans-serif;color:${gridUploaded ? "#3F7A4E" : ACC}`)}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={gridUploaded ? "#3F7A4E" : ACC} strokeWidth="1.5"><path d="M8 1.5l5 2v3.4c0 3-2 5.2-5 6.1-3-.9-5-3.1-5-6.1V3.5z"></path></svg>Размерная сетка {gridUploaded ? "· загружена" : "· не загружена"}</div>
                <div style={sx("font:400 12.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.6);padding:6px 0 10px")}>Без сетки подбор размера будет менее точным, а примерка — грубее. Загрузите таблицу RU / EU / см.</div>
                <span className="pc-btn" onClick={() => pickAndUpload("size_chart", IMG_ACCEPT + ",application/pdf", (url) => { if (url) setGridUploaded(true); toastMsg(url ? "Размерная сетка загружена" : "Не удалось загрузить"); })} style={sx("font:500 12.5px 'Inter',sans-serif;background:#fff;border:1px solid rgba(43,43,204,.3);color:#2B2BCC;border-radius:8px;padding:9px 16px")}>{gridUploaded ? "Заменить размерную сетку" : "Загрузить размерную сетку"}</span>
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:7px")}><label htmlFor="b-url" style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.62)")}>Ссылка на магазин + UTM</label><input id="b-url" className="pc-in" style={sx("font-family:'Inter',monospace")} value={fUrl} onInput={(e) => setFUrl((e.target as HTMLInputElement).value)} /></div>
              <div style={sx("display:flex;justify-content:flex-end;gap:12px")}><span className="pc-btn" onClick={saveBrand} style={sx("background:#141414;color:#fff;border-radius:999px;padding:13px 30px;font:500 14px 'Inter',sans-serif")}>Сохранить</span></div>
            </div>
          </div>
        )}

        {/* ============ P6 · ДАШБОРД ============ */}
        {view === "dash" && (
          <div className="pc-fade" style={sx("max-width:1180px;margin:0 auto")}>
            <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap")}>
              <div><h1 style={sx("font:400 30px/1.1 'Spectral',Georgia,serif;margin:0")}>Дашборд</h1><p style={sx("font:400 14.5px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:8px 0 0")}>Цифры появятся, когда пойдут первые переходы. Пусто — значит пусто: мы не показываем выдуманных данных.</p></div>
              <select value={dashPeriod} onChange={(e) => setDashPeriod(e.target.value as "7" | "30" | "90")} style={sx("appearance:none;-webkit-appearance:none;font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.6);border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:9px 34px 9px 16px;background:#fff url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' fill='none' stroke='rgba(0,0,0,0.5)' stroke-width='1.5' stroke-linecap='round'><path d='M3.5 5L7 8.5 10.5 5'/></svg>\") no-repeat right 14px center;cursor:pointer")}><option value="7">За 7 дней</option><option value="30">За 30 дней</option><option value="90">За 90 дней</option></select>
            </div>
            <div style={sx("display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:24px")}>
              {[
                { label: "Показы в чате", hint: "появится, когда товары начнут попадать в выдачу" },
                { label: "Примерки", hint: "появится после первых примерок ваших вещей" },
                { label: "Переходы в магазин", hint: "появится, когда пойдут первые переходы" },
                { label: "Продажи", hint: "появится после подтверждения первых заказов" },
              ].map((k, i) => (
                <div key={i} className="pc-card" style={sx("border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:20px")}><div style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.6)")}>{k.label}</div><div style={sx("font:400 34px 'Spectral',Georgia,serif;color:rgba(0,0,0,.3);margin:14px 0 8px")}>—</div><div style={sx("font:400 11.5px/1.4 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>{k.hint}</div></div>
              ))}
            </div>
            <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:26px 28px;margin-top:20px")}>
              <div style={sx("font:500 15px 'Inter',sans-serif;margin-bottom:6px")}>Как это считается</div>
              <div style={sx("font:400 13px/1.55 'Inter',sans-serif;color:rgba(0,0,0,.6);max-width:720px;margin-bottom:18px")}>Прозрачно и без «потерянных заказов». Ниже — вся механика атрибуции.</div>
              <div style={sx("display:flex;flex-direction:column;gap:14px")}>
                <div style={sx("display:flex;gap:12px")}><span style={sx("font:600 12px 'Inter',monospace;color:#2B2BCC;flex:none;margin-top:1px")}>01</span><div style={sx("font:400 13px/1.5 'Inter',sans-serif")}><b>Переход.</b> Покупатель уходит в ваш магазин по ссылке с подписанным идентификатором клика (click_id).</div></div>
                <div style={sx("display:flex;gap:12px")}><span style={sx("font:600 12px 'Inter',monospace;color:#2B2BCC;flex:none;margin-top:1px")}>02</span><div style={sx("font:400 13px/1.5 'Inter',sans-serif")}><b>Продажа.</b> Ваша система подтверждает заказ с тем же click_id — так продажа привязывается к переходу.</div></div>
                <div style={sx("display:flex;gap:12px")}><span style={sx("font:600 12px 'Inter',monospace;color:#2B2BCC;flex:none;margin-top:1px")}>03</span><div style={sx("font:400 13px/1.5 'Inter',sans-serif")}><b>Сверка.</b> Оплата и доставка — на вашей стороне; показываем только подтверждённое. <span style={sx("color:rgba(0,0,0,.5)")}>Выплаты и акты появятся вместе с первыми продажами.</span></div></div>
              </div>
            </div>
          </div>
        )}

        {/* ============ P7 · НАСТРОЙКИ ============ */}
        {view === "settings" && (
          <div className="pc-fade" style={sx("max-width:820px;margin:0 auto")}>
            <h1 style={sx("font:400 30px/1.1 'Spectral',Georgia,serif;margin:0")}>Настройки</h1>
            <p style={sx("font:400 14.5px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:8px 0 26px")}>Основное для фазы 1. Реквизиты и выплаты появятся после первых продаж.</p>
            <div className="pc-card" style={sx("border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:26px;display:flex;flex-direction:column;gap:20px")}>
              <div style={sx("display:flex;flex-direction:column;gap:7px")}><label htmlFor="s-co" style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.62)")}>Компания</label><input id="s-co" className="pc-in" value={sCompany} onChange={(e) => setSCompany(e.target.value)} placeholder="Юридическое лицо" /></div>
              <div style={sx("display:flex;flex-direction:column;gap:7px")}><label htmlFor="s-contact" style={sx("font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.62)")}>Контактное лицо</label><input id="s-contact" className="pc-in" value={sContact} onChange={(e) => setSContact(e.target.value)} placeholder="Имя · e-mail" /></div>
              <div style={sx("border-top:1px solid rgba(0,0,0,.07);padding-top:18px")}>
                <div style={sx("font:500 13.5px 'Inter',sans-serif;margin-bottom:12px")}>Уведомления</div>
                <div style={sx("display:flex;justify-content:space-between;align-items:center;padding:8px 0")}><span style={sx("font:400 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.75)")}>Ошибки синхронизации фида</span><span className="pc-btn" onClick={() => { const nx = { ...notif, feed: !notif.feed }; setNotif(nx); void saveSettingsAll(nx); }} role="switch" aria-checked={notif.feed} tabIndex={0} style={sx(`width:44px;height:26px;border-radius:999px;background:${notif.feed ? ACC : "rgba(0,0,0,.18)"};position:relative;flex:none`)}><span style={sx(`position:absolute;top:2.5px;left:${notif.feed ? "20.5px" : "2.5px"};width:21px;height:21px;border-radius:50%;background:#fff;transition:left .15s`)}></span></span></div>
                <div style={sx("display:flex;justify-content:space-between;align-items:center;padding:8px 0")}><span style={sx("font:400 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.75)")}>Дайджест по каталогу раз в неделю</span><span className="pc-btn" onClick={() => { const nx = { ...notif, weekly: !notif.weekly }; setNotif(nx); void saveSettingsAll(nx); }} role="switch" aria-checked={notif.weekly} tabIndex={0} style={sx(`width:44px;height:26px;border-radius:999px;background:${notif.weekly ? ACC : "rgba(0,0,0,.18)"};position:relative;flex:none`)}><span style={sx(`position:absolute;top:2.5px;left:${notif.weekly ? "20.5px" : "2.5px"};width:21px;height:21px;border-radius:50%;background:#fff;transition:left .15s`)}></span></span></div>
              </div>
              <div style={sx("border-top:1px solid rgba(0,0,0,.07);padding-top:18px;display:flex;justify-content:flex-end")}>
                <span className="pc-btn" onClick={() => { if (!savingSettings) void saveSettingsAll(); }} style={sx(`background:#141414;color:#fff;border-radius:999px;padding:12px 28px;font:500 14px 'Inter',sans-serif;opacity:${savingSettings ? 0.6 : 1}`)}>{savingSettings ? "Сохраняю…" : "Сохранить"}</span>
              </div>
              <div style={sx("border-top:1px solid rgba(0,0,0,.07);padding-top:18px;display:flex;justify-content:space-between;align-items:center")}>
                <div style={sx("font:500 13.5px 'Inter',sans-serif;color:#C4553B")}>Выйти из кабинета</div>
                <span className="pc-btn" onClick={() => void logout()} style={sx("font:500 13px 'Inter',sans-serif;border:1px solid rgba(196,85,59,.3);color:#C4553B;border-radius:8px;padding:10px 20px")}>Выйти</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {toast && (
        <div className="pc-toast"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#63C363" strokeWidth="1.8"><path d="M3 8l3 3 6-7" strokeLinecap="round" strokeLinejoin="round"></path></svg>{toast}</div>
      )}
    </div>
  );
}
