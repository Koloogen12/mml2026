import { useEffect, useState } from "react";
import { blogApi } from "../blog/api";

// Раздел «Главная»: правка контента главной страницы покупателя без разработчика.
// Контракт — internal/content/handler.go. Дефолты держит бэкенд, здесь их
// не дублируем: разъедутся — админка покажет не то, что видит покупатель.

interface Query { label: string; q: string }
interface Tab { zone: string; label: string }
interface Trend { tag: string; title: string; q: string; image: string }
interface Feature { label: string; title: string; body: string }
interface Home {
  queries: Record<string, Query[]>;
  placeholders: Record<string, string[]>;
  refine_tabs: Tab[];
  trending: Record<string, Trend[]>;
  features: Feature[];
}

const ZONE_LABEL: Record<string, string> = {
  tops: "Верх", bottoms: "Низ", outerwear: "Верхняя одежда",
  accessories: "Аксессуары", dress: "Платья", footwear: "Обувь",
};

export function HomeContent() {
  const [home, setHome] = useState<Home | null>(null);
  const [zones, setZones] = useState<string[]>([]);
  const [gender, setGender] = useState<"women" | "men">("women");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/v1/admin/content");
    const d = (await res.json()) as { home: Home; zones: string[] };
    setHome(d.home);
    setZones(d.zones);
  };
  useEffect(() => { void load(); }, []);

  if (!home) return <div style={{ padding: 40, font: "400 14px 'Inter',sans-serif", color: "rgba(0,0,0,.5)" }}>Загружаем…</div>;

  const patch = (p: Partial<Home>) => setHome({ ...home, ...p });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(home),
      });
      if (!res.ok) {
        const e = (await res.json()) as { error?: string };
        setMsg(e.error || "Не удалось сохранить");
        return;
      }
      setMsg("Сохранено — обновите главную");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("Вернуть главную к исходному виду? Ваши правки пропадут.")) return;
    const res = await fetch("/api/v1/admin/content/reset", { method: "POST" });
    setHome((await res.json()) as Home);
    setMsg("Возвращено к исходному");
  };

  const qs = home.queries[gender] ?? [];
  const phs = home.placeholders[gender] ?? [];
  const trs = home.trending[gender] ?? [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "26px 22px 90px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
        <h1 style={{ font: "400 30px 'Spectral',Georgia,serif", margin: 0 }}>Главная страница</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ font: "500 12.5px 'Inter',sans-serif", color: "#2B2BCC" }}>{msg}</span>}
          <button onClick={() => void reset()} style={btn()}>Сбросить</button>
          <button onClick={() => void save()} disabled={saving} style={btn(true)}>{saving ? "Сохраняем…" : "Сохранить"}</button>
        </div>
      </div>
      <p style={{ font: "400 13.5px 'Inter',sans-serif", color: "rgba(0,0,0,.5)", margin: "0 0 22px" }}>
        Что здесь меняется — то видит покупатель на makemelook.ai. Запросы и подсказки свои для женской и мужской витрины.
      </p>

      <div style={{ display: "inline-flex", background: "#F4F1EA", borderRadius: 999, padding: 4, marginBottom: 22 }}>
        {(["women", "men"] as const).map((g) => (
          <button key={g} onClick={() => setGender(g)} style={{ ...btn(gender === g), borderRadius: 999, border: "none", padding: "8px 18px" }}>
            {g === "women" ? "Женская витрина" : "Мужская витрина"}
          </button>
        ))}
      </div>

      <Card title="Популярные запросы" hint="Чипы под поиском. Подпись — что видно, запрос — что уходит ассистенту.">
        <List
          items={qs}
          onChange={(v) => patch({ queries: { ...home.queries, [gender]: v } })}
          empty={{ label: "", q: "" }}
          render={(it, set) => (
            <>
              <Inp value={it.label} onChange={(v) => set({ ...it, label: v })} placeholder="Подпись на чипе" />
              <Inp value={it.q} onChange={(v) => set({ ...it, q: v })} placeholder="Запрос ассистенту (пусто = как подпись)" />
            </>
          )}
        />
      </Card>

      <Card title="Подсказки в поле поиска" hint="Печатаются по очереди в пустом поле.">
        <List
          items={phs}
          onChange={(v) => patch({ placeholders: { ...home.placeholders, [gender]: v } })}
          empty=""
          render={(it, set) => <Inp value={it} onChange={set} placeholder="Например: Куртка на весну в город" />}
        />
      </Card>

      <Card title="Плитки трендов" hint="Блок «Сейчас смотрят». Картинка необязательна — без неё плитка красится цветом.">
        <List
          items={trs}
          onChange={(v) => patch({ trending: { ...home.trending, [gender]: v } })}
          empty={{ tag: "ПО ОБРАЗУ", title: "", q: "", image: "" }}
          render={(it, set) => (
            <>
              <Inp value={it.tag} onChange={(v) => set({ ...it, tag: v })} placeholder="Надпись сверху" />
              <Inp value={it.title} onChange={(v) => set({ ...it, title: v })} placeholder="Заголовок плитки" />
              <Inp value={it.q} onChange={(v) => set({ ...it, q: v })} placeholder="Запрос по клику" />
              <ImagePick url={it.image} onPick={(u) => set({ ...it, image: u })} />
            </>
          )}
        />
      </Card>

      <Card title="Табы уточнения" hint="Фильтруют карусель товаров. Зона должна существовать в каталоге, иначе таб покажет пустоту.">
        <List
          items={home.refine_tabs}
          onChange={(v) => patch({ refine_tabs: v })}
          empty={{ zone: "tops", label: "" }}
          render={(it, set) => (
            <>
              <Inp value={it.label} onChange={(v) => set({ ...it, label: v })} placeholder="Подпись таба" />
              <select value={it.zone} onChange={(e) => set({ ...it, zone: e.target.value })} style={{ ...inpSt, cursor: "pointer" }}>
                {zones.map((z) => <option key={z} value={z}>{ZONE_LABEL[z] ?? z}</option>)}
              </select>
            </>
          )}
        />
      </Card>

      <Card title="Блоки «как это работает»" hint="Секция ниже по главной. Общая для обеих витрин.">
        <List
          items={home.features}
          onChange={(v) => patch({ features: v })}
          empty={{ label: "", title: "", body: "" }}
          render={(it, set) => (
            <>
              <Inp value={it.label} onChange={(v) => set({ ...it, label: v })} placeholder="Ярлык" />
              <Inp value={it.title} onChange={(v) => set({ ...it, title: v })} placeholder="Заголовок" />
              <textarea value={it.body} onChange={(e) => set({ ...it, body: e.target.value })} rows={2} placeholder="Текст" style={{ ...inpSt, resize: "vertical" }} />
            </>
          )}
        />
      </Card>
    </div>
  );
}

// Загрузка картинки — через медиатеку блога: одно хранилище на весь контент.
function ImagePick({ url, onPick }: { url: string; onPick: (u: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 54, height: 54, flex: "none", borderRadius: 8, background: url ? `#F4F1EA url('${url}') center/cover` : "#F4F1EA", border: "1px solid rgba(0,0,0,.12)" }} />
      <label style={{ ...btn(), display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
        {busy ? "Загружаем…" : url ? "Заменить" : "Загрузить картинку"}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              const m = await blogApi.upload(f);
              onPick(m.url);
            } catch (err) {
              window.alert((err as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {url && <button onClick={() => onPick("")} style={btn()}>Убрать</button>}
    </div>
  );
}

// Список с добавлением, удалением и порядком.
function List<T>({ items, onChange, empty, render }: {
  items: T[];
  onChange: (v: T[]) => void;
  empty: T;
  render: (item: T, set: (v: T) => void) => React.ReactNode;
}) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10, padding: 10, background: "#FAFAF8", borderRadius: 10 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
            {render(it, (v) => { const next = [...items]; next[i] = v; onChange(next); })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={mini}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === items.length - 1} style={mini}>↓</button>
            <button onClick={() => onChange(items.filter((_, k) => k !== i))} style={{ ...mini, color: "#C4553B" }}>✕</button>
          </div>
        </div>
      ))}
      <button onClick={() => onChange([...items, structuredClone(empty)])} style={{ ...btn(), width: "100%", marginTop: 4 }}>+ Добавить</button>
    </>
  );
}

function Card({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: 18, marginBottom: 18, background: "#fff" }}>
      <div style={{ font: "600 10.5px 'Inter',sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(0,0,0,.45)" }}>{title}</div>
      <div style={{ font: "400 12.5px 'Inter',sans-serif", color: "rgba(0,0,0,.45)", margin: "5px 0 14px" }}>{hint}</div>
      {children}
    </div>
  );
}

function Inp({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inpSt} />;
}

const inpSt: React.CSSProperties = {
  width: "100%",
  padding: "8px 11px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,.16)",
  font: "400 13px 'Inter',sans-serif",
  outline: "none",
  background: "#fff",
};

const btn = (on?: boolean): React.CSSProperties => ({
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid " + (on ? "#16150F" : "rgba(0,0,0,.16)"),
  background: on ? "#16150F" : "#fff",
  color: on ? "#fff" : "#16150F",
  font: "500 13px 'Inter',sans-serif",
  cursor: "pointer",
});

const mini: React.CSSProperties = {
  width: 26,
  height: 24,
  borderRadius: 6,
  border: "1px solid rgba(0,0,0,.14)",
  background: "#fff",
  cursor: "pointer",
  font: "500 11px 'Inter',sans-serif",
};
