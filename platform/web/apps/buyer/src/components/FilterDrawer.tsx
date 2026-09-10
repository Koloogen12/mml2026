import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { sx } from "../sx";

// Панель фильтров витрины — выезжает справа на всю высоту (образец — Daydream).
// Фильтры применяются к уже загруженным товарам бренда, поэтому и список зон,
// и границы цены берём из самих товаров: предлагать фильтр, под который нет
// ни одной вещи, — это тупик вместо выбора.

export interface Filters {
  min: string;
  max: string;
  gender: string; // "" | female | male
  zones: string[];
}

export const emptyFilters: Filters = { min: "", max: "", gender: "", zones: [] };

export const isEmptyFilters = (f: Filters) =>
  !f.min && !f.max && !f.gender && f.zones.length === 0;

export function countActive(f: Filters) {
  return (f.min || f.max ? 1 : 0) + (f.gender ? 1 : 0) + f.zones.length;
}

const ZONE_LABEL: Record<string, string> = {
  dress: "Платья",
  outerwear: "Верхняя одежда",
  tops: "Верх",
  bottoms: "Низ",
  footwear: "Обувь",
  accessories: "Аксессуары",
};
const GENDER_LABEL: Record<string, string> = { female: "Женское", male: "Мужское", unisex: "Унисекс" };

export function FilterDrawer({
  open,
  onClose,
  value,
  onChange,
  zones,
  genders,
  priceRange,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  value: Filters;
  onChange: (f: Filters) => void;
  zones: string[];
  genders: string[];
  priceRange: [number, number];
  resultCount: number;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (open) setLocal(value);
  }, [open, value]);

  // Esc закрывает — панель во весь экран, без выхода клавиатурой это ловушка.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const apply = (f: Filters) => {
    setLocal(f);
    onChange(f);
  };
  const toggleZone = (z: string) =>
    apply({ ...local, zones: local.zones.includes(z) ? local.zones.filter((x) => x !== z) : local.zones.concat(z) });

  // Портал в body обязателен: панель живёт внутри экрана с классом dp-fade,
  // у которого анимация оставляет transform: matrix(1,0,0,1,0,0) — ненулевой
  // transform создаёт containing block, и position:fixed цепляется за него,
  // а не за окно. Без портала панель была не во всю высоту (top:90, а не 0).
  return createPortal(
    <>
      <div onClick={onClose} style={sx("position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.35)")}></div>
      <aside className="fd-panel" style={sx("position:fixed;top:0;right:0;bottom:0;z-index:71;width:100%;max-width:420px;background:#fff;box-shadow:-8px 0 40px rgba(0,0,0,.16);display:flex;flex-direction:column")}>
        <div style={sx("display:flex;align-items:center;justify-content:space-between;padding:22px 24px 14px")}>
          <span style={sx("font:400 26px 'Spectral',Georgia,serif")}>Фильтры</span>
          <span className="dp-btn" onClick={onClose} title="Закрыть" style={sx("width:38px;height:38px;border-radius:50%;border:1px solid rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;flex:none")}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l9 9M12 3l-9 9"></path></svg>
          </span>
        </div>

        <div style={sx("flex:1;overflow-y:auto;padding:0 24px 20px")}>
          <Section title="Цена">
            <div style={sx("display:flex;align-items:center;gap:10px")}>
              <NumInput value={local.min} placeholder={`от ${priceRange[0].toLocaleString("ru-RU")}`} onChange={(v) => apply({ ...local, min: v })} />
              <span style={sx("font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.4)")}>до</span>
              <NumInput value={local.max} placeholder={`до ${priceRange[1].toLocaleString("ru-RU")}`} onChange={(v) => apply({ ...local, max: v })} />
            </div>
          </Section>

          {genders.length > 1 && (
            <Section title="Пол">
              <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:10px")}>
                {genders.map((g) => (
                  <Cell key={g} on={local.gender === g} onClick={() => apply({ ...local, gender: local.gender === g ? "" : g })}>
                    {GENDER_LABEL[g] ?? g}
                  </Cell>
                ))}
              </div>
            </Section>
          )}

          {zones.length > 0 && (
            <Section title="Категории">
              <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:10px")}>
                <Cell on={local.zones.length === 0} onClick={() => apply({ ...local, zones: [] })}>Все</Cell>
                {zones.map((z) => (
                  <Cell key={z} on={local.zones.includes(z)} onClick={() => toggleZone(z)}>
                    {ZONE_LABEL[z] ?? z}
                  </Cell>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div style={sx("border-top:1px solid rgba(0,0,0,.1);padding:16px 24px;display:flex;align-items:center;gap:12px")}>
          <span className="dp-btn" onClick={() => apply(emptyFilters)} style={sx(`font:500 13.5px 'Inter',sans-serif;color:${isEmptyFilters(local) ? "rgba(0,0,0,.3)" : "#000"};padding:12px 4px`)}>
            Сбросить
          </span>
          <span className="dp-btn" onClick={onClose} style={sx("flex:1;text-align:center;font:500 14px 'Inter',sans-serif;color:#fff;background:#000;border-radius:999px;padding:13px 0")}>
            {resultCount > 0 ? `Показать ${resultCount}` : "Ничего не найдено"}
          </span>
        </div>
      </aside>
    </>,
    document.body,
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sx("border-top:1px solid rgba(0,0,0,.09);padding:18px 0")}>
      <div style={sx("font:500 15px 'Inter',sans-serif;margin-bottom:12px")}>{title}</div>
      {children}
    </div>
  );
}

function Cell({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <span
      className="dp-btn"
      onClick={onClick}
      style={sx(`text-align:center;font:500 13.5px 'Inter',sans-serif;border:1px solid ${on ? "#2B2BCC" : "rgba(0,0,0,.14)"};background:${on ? "#ECEBFB" : "#fff"};color:${on ? "#2B2BCC" : "#16150F"};border-radius:10px;padding:13px 8px;cursor:pointer`)}
    >
      {children}
    </span>
  );
}

function NumInput({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <span style={sx("flex:1;display:flex;align-items:center;gap:6px;border:1px solid rgba(0,0,0,.14);border-radius:10px;padding:11px 12px")}>
      <span style={sx("font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.35)")}>₽</span>
      <input
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        // Только цифры: буквы в поле цены молча ломали бы фильтр.
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        style={sx("width:100%;min-width:0;border:none;outline:none;font:400 13.5px 'Inter',sans-serif;background:transparent")}
      />
    </span>
  );
}
