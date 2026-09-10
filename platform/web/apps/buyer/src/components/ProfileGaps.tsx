import { useState } from "react";
import { sx } from "../sx";
import { useApp } from "../appStore";
// Стоп-лист зависит от пола: мужчине незачем исключать пайетки, мини и макси.
import { NEVER_WEAR, BUDGET_ZONES, genderOf } from "../wardrobe";
import { useAuth } from "../authStore";

// Прогрессивный профайлинг: добираем паспорт по одному вопросу прямо на
// главной (образец — Daydream). Смысл в том, что онбординг короткий и данных
// не хватает, а гнать человека обратно в анкету никто не станет.
//
// Правило: карточка показывается ТОЛЬКО если этих данных в паспорте нет.
// Ответил или отказался — карточка исчезает и больше не спрашивает.
// Спрашивать то, что человек уже сказал, — худший вид навязчивости.

// Границы в рублях; последний — «и выше», верхнего потолка нет.
const BUDGET_BUCKETS: Array<{ label: string; value: number }> = [
  { label: "до 10 000 ₽", value: 10000 },
  { label: "10–30 000 ₽", value: 30000 },
  { label: "30–70 000 ₽", value: 70000 },
  { label: "70 000 ₽ и выше", value: 150000 },
];



// Ключ отказа в localStorage: «не сейчас» не должно спрашиваться на каждой
// перезагрузке, но и в паспорт отказ писать незачем — это не факт о человеке.
const SKIP_KEY = "mml_gaps_skipped";
const readSkipped = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SKIP_KEY) || "[]") as string[];
  } catch {
    return [];
  }
};
const addSkipped = (k: string) => {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify([...new Set([...readSkipped(), k])]));
  } catch {
    /* без localStorage карточка просто вернётся — не страшно */
  }
};

export function ProfileGaps() {
  const app = useApp();
  const prefs = useAuth((s) => s.prefs);
  const [skipped, setSkipped] = useState<string[]>(readSkipped);

  const skip = (k: string) => {
    addSkipped(k);
    setSkipped((s) => [...s, k]);
  };

  if (!app.loggedIn || !prefs) return null;

  const hasBudget = Object.keys(prefs.budget_by_category ?? {}).length > 1; // онбординг пишет один общий ключ
  const hasNever = Array.isArray((prefs.hard_constraints as { never_wear?: string[] })?.never_wear);

  const cards: React.ReactNode[] = [];
  if (!hasBudget && !skipped.includes("budget")) {
    cards.push(<BudgetCard key="budget" onSkip={() => skip("budget")} />);
  }
  if (!hasNever && !skipped.includes("never")) {
    cards.push(<NeverCard key="never" onSkip={() => skip("never")} />);
  }
  if (cards.length === 0) return null;

  return <>{cards}</>;
}

function BudgetCard({ onSkip }: { onSkip: () => void }) {
  const app = useApp();
  // Вкладки — по полу из паспорта: вкладка «Платья» мужчине не нужна.
  const gender = genderOf(useAuth((st) => st.prefs)?.for_whom);
  const zones = BUDGET_ZONES[gender];
  const [tab, setTab] = useState(0);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const zone = zones[Math.min(tab, zones.length - 1)];

  const save = async () => {
    if (Object.keys(picked).length === 0) return;
    setSaving(true);
    const ok = await useAuth.getState().savePassport({ budget_by_category: picked });
    setSaving(false);
    app.showToast(ok ? "Записали в паспорт" : "Не удалось сохранить");
    if (ok) onSkip(); // карточка закрывается: данные теперь в паспорте
  };

  return (
    <Card
      title="Сколько обычно тратите?"
      sub="Будем показывать в первую очередь то, что в вашем диапазоне."
      onSave={() => void save()}
      onSkip={onSkip}
      saveLabel={saving ? "Сохраняем…" : "В паспорт"}
      canSave={Object.keys(picked).length > 0}
      skipLabel="Пропустить"
    >
      <div style={sx("display:flex;gap:0;border-bottom:1px solid rgba(0,0,0,.1);margin-bottom:18px;overflow-x:auto")} className="ml-hidescroll">
        {zones.map((z, i) => (
          <span
            key={z.zone}
            className="dp-btn"
            onClick={() => setTab(i)}
            style={sx(`white-space:nowrap;font:600 10.5px 'Inter',sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:0 18px 12px;color:${i === tab ? "#16150F" : "rgba(0,0,0,.35)"};border-bottom:2px solid ${i === tab ? "#16150F" : "transparent"};margin-bottom:-1px`)}
          >
            {z.label}
            {picked[z.zone] ? " ·" : ""}
          </span>
        ))}
      </div>
      <div style={sx("font:400 17px 'Spectral',Georgia,serif;margin-bottom:12px")}>{zone.label}</div>
      <div style={sx("display:flex;gap:9px;flex-wrap:wrap")}>
        {BUDGET_BUCKETS.map((b) => {
          const on = picked[zone.zone] === b.value;
          return (
            <span
              key={b.value}
              className="dp-chip"
              onClick={() => setPicked((p) => (on ? omit(p, zone.zone) : { ...p, [zone.zone]: b.value }))}
              style={sx(`font:${on ? "500" : "400"} 13.5px 'Inter',sans-serif;color:${on ? "#fff" : "#000"};background:${on ? "#000" : "#fff"};border:1px solid ${on ? "#000" : "rgba(0,0,0,.16)"};border-radius:999px;padding:10px 16px;cursor:pointer`)}
            >
              {b.label}
            </span>
          );
        })}
      </div>
    </Card>
  );
}

function NeverCard({ onSkip }: { onSkip: () => void }) {
  const app = useApp();
  // Селектором, а не getState(): паспорт догружается асинхронно, и список
  // должен перерисоваться, когда станет известен пол.
  const gender = genderOf(useAuth((st) => st.prefs)?.for_whom);
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const list = [...picked, ...text.split(",").map((s) => s.trim()).filter(Boolean)];
    if (list.length === 0) return;
    setSaving(true);
    const hc = (useAuth.getState().prefs?.hard_constraints ?? {}) as Record<string, unknown>;
    const ok = await useAuth.getState().savePassport({ hard_constraints: { ...hc, never_wear: list } });
    setSaving(false);
    app.showToast(ok ? "Больше не покажем" : "Не удалось сохранить");
    if (ok) onSkip();
  };

  return (
    <Card
      title="Что точно не наденете?"
      sub="Исключим это из выдачи навсегда."
      onSave={() => void save()}
      onSkip={onSkip}
      saveLabel={saving ? "Сохраняем…" : "В паспорт"}
      canSave={picked.length > 0 || text.trim() !== ""}
      skipLabel="Нечего исключать"
    >
      <div style={sx("display:flex;gap:9px;flex-wrap:wrap;margin-bottom:14px")}>
        {NEVER_WEAR[gender].map((n) => {
          const on = picked.includes(n);
          return (
            <span
              key={n}
              className="dp-chip"
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== n) : p.concat(n)))}
              style={sx(`font:${on ? "500" : "400"} 13.5px 'Inter',sans-serif;color:${on ? "#fff" : "#000"};background:${on ? "#C4553B" : "#fff"};border:1px solid ${on ? "#C4553B" : "rgba(0,0,0,.16)"};border-radius:999px;padding:10px 16px;cursor:pointer`)}
            >
              {n}
            </span>
          );
        })}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Что-то ещё? Например: «колючая шерсть» или «глубокое декольте»"
        style={sx("width:100%;border:1px solid rgba(0,0,0,.16);border-radius:12px;padding:12px 14px;font:400 13.5px 'Inter',sans-serif;outline:none;resize:vertical")}
      />
    </Card>
  );
}

function Card({
  title, sub, children, onSave, onSkip, saveLabel, skipLabel, canSave,
}: {
  title: string; sub: string; children: React.ReactNode;
  onSave: () => void; onSkip: () => void; saveLabel: string; skipLabel: string; canSave: boolean;
}) {
  return (
    <div className="dp-fade dp-gap-card" style={sx("display:grid;grid-template-columns:270px 1fr;gap:30px;align-items:start;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:18px;padding:26px 28px;margin-bottom:18px")}>
      <div>
        <div style={sx("font:400 26px/1.15 'Spectral',Georgia,serif;margin-bottom:8px")}>{title}</div>
        <p style={sx("font:400 13.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.5);margin:0 0 16px")}>{sub}</p>
        <div style={sx("display:flex;align-items:center;gap:16px")}>
          <span className="dp-btn" onClick={canSave ? onSave : undefined} style={sx(`font:500 13.5px 'Inter',sans-serif;color:#fff;background:${canSave ? "#000" : "rgba(0,0,0,.22)"};border-radius:999px;padding:12px 22px;cursor:${canSave ? "pointer" : "default"}`)}>
            {saveLabel}
          </span>
          <span className="dp-btn" onClick={onSkip} style={sx("font:500 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>{skipLabel}</span>
        </div>
      </div>
      <div style={sx("background:#F7F5F0;border-radius:14px;padding:22px 24px;min-width:0")}>{children}</div>
    </div>
  );
}

function omit<T extends Record<string, unknown>>(obj: T, key: string) {
  const { [key]: _drop, ...rest } = obj;
  return rest as T;
}
