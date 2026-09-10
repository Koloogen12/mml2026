import { useMemo, useState } from "react";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { useAuth } from "../authStore";
import { ProductCardDp } from "../components/ProductCardDp";
import { things } from "../plural";
import { FilterDrawer, emptyFilters, countActive, type Filters } from "../components/FilterDrawer";

// Витрина бренда — РЕАЛЬНАЯ: открывается из карточки товара по имени бренда
// (app.openBrand) и показывает товары именно этого бренда (/products?brand=slug).
// Раньше была захардкожена под 12 STOREEZ с выдуманным «1 240 товаров · Москва».
// Баннер грузит партнёр (пока честный плейсхолдер).

const monoOf = (name: string) =>
  (name.replace(/[^A-Za-zА-Яа-я0-9]/g, "").slice(0, 2) || "•").toUpperCase();

export function Brand() {
  const app = useApp();
  const brand = app.activeBrand;
  const all = app.brandProducts;
  /*
   * Подписка на витрину = бренд в «любимых брендах» паспорта.
   *
   * Раньше это был useState + тост: состояние жило в памяти вкладки, умирало
   * при перезагрузке и никуда не попадало — человек подписывался, возвращался,
   * и кнопка снова предлагала подписаться. Списка «любимых» это тоже не
   * касалось, хотя ровно этого от подписки и ждут.
   *
   * Теперь пишем в brands_love: это переживает перезагрузку, показывается в
   * паспорте и реально влияет на выдачу — бренд становится сигналом вкуса.
   */
  const love = useAuth((st) => st.prefs)?.brands_love ?? [];
  const subscribed = !!brand && love.includes(brand.name);
  const [subBusy, setSubBusy] = useState(false);

  const toggleSubscribe = async () => {
    if (!brand || subBusy) return;
    if (!app.requireAuth()) return;
    setSubBusy(true);
    const next = subscribed ? love.filter((n) => n !== brand.name) : love.concat(brand.name);
    const ok = await useAuth.getState().savePassport({ brands_love: next });
    setSubBusy(false);
    app.showToast(ok ? (subscribed ? "Отписались" : "Бренд в любимых") : "Не удалось сохранить");
  };

  // Фильтры витрины (панель справа). Варианты берём из самих товаров бренда:
  // фильтр, под который нет ни одной вещи, — это тупик вместо выбора.
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const zones = useMemo(
    () => Array.from(new Set(all.map((p) => p.garment_zone).filter((z): z is string => !!z))),
    [all],
  );
  const genders = useMemo(
    () => Array.from(new Set(all.map((p) => p.gender).filter((g): g is string => !!g && g !== "unisex"))),
    [all],
  );
  const prices = useMemo(
    () => all.map((p) => p.offers[0]?.price ?? 0).filter((v) => v > 0),
    [all],
  );
  const priceRange: [number, number] = prices.length
    ? [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
    : [0, 0];

  const products = useMemo(() => {
    const min = filters.min ? parseInt(filters.min, 10) : null;
    const max = filters.max ? parseInt(filters.max, 10) : null;
    return all.filter((p) => {
      const price = p.offers[0]?.price ?? 0;
      if (min !== null && price < min) return false;
      if (max !== null && price > max) return false;
      // unisex подходит под любой выбранный пол — вещь и правда носят оба.
      if (filters.gender && p.gender !== filters.gender && p.gender !== "unisex") return false;
      if (filters.zones.length && !filters.zones.includes(p.garment_zone ?? "")) return false;
      return true;
    });
  }, [all, filters]);

  const activeCount = countActive(filters);
  const tryonCount = all.filter((p) => p.tryon_eligible).length;

  return (
    <div className="dp-fade" style={sx("max-width:1200px;margin:0 auto;padding:24px 40px 90px")}>
      <span className="dp-btn" onClick={() => app.go("chat")} style={sx("display:inline-flex;align-items:center;gap:8px;font:500 14px 'Inter',sans-serif;color:rgba(0,0,0,.6);margin-bottom:20px")}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 3.5L5.5 8l4.5 4.5"></path></svg>Назад к выдаче
      </span>

      <div style={sx("position:relative;height:280px;border-radius:18px;overflow:hidden;display:flex;align-items:flex-end;padding:32px;background:#4A463D")}>
        <div style={sx("position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:400 11px 'Inter',monospace;color:rgba(255,255,255,.35);letter-spacing:.08em")}>БАННЕР БРЕНДА · загружается партнёром</div>
        <div style={sx("position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.6),transparent 55%)")}></div>
        <div style={sx("position:relative;display:flex;align-items:flex-end;gap:22px;width:100%")}>
          <div style={sx("width:88px;height:88px;border-radius:18px;background:#fff;display:flex;align-items:center;justify-content:center;font:600 15px 'Spectral',Georgia,serif;box-shadow:0 6px 20px rgba(0,0,0,.15);flex:none")}>
            {brand ? monoOf(brand.name) : "—"}
          </div>
          <div style={sx("flex:1;color:#fff;min-width:0")}>
            <div style={sx("font:500 34px 'Spectral',Georgia,serif;line-height:1")}>{brand?.name ?? "Бренд"}</div>
            <div style={sx("font:400 14px 'Inter',sans-serif;color:rgba(255,255,255,.85);padding-top:6px")}>
              {app.brandLoading ? "Загружаем витрину…" : `${all.length} ${things(all.length)}${tryonCount ? ` · ${tryonCount} можно примерить` : ""}`}
            </div>
          </div>
          <span className="dp-btn" onClick={() => void toggleSubscribe()} style={sx(`font:500 15px 'Inter',sans-serif;background:${subscribed ? "transparent" : "#fff"};color:${subscribed ? "#fff" : "#000"};border:1px solid ${subscribed ? "rgba(255,255,255,.6)" : "#fff"};border-radius:999px;padding:13px 28px;flex:none`)}>{subBusy ? "Сохраняем…" : subscribed ? "Вы подписаны" : "Подписаться"}</span>
        </div>
      </div>

      {/* Кнопка фильтров — справа над каталогом; сами фильтры в панели справа. */}
      <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:14px;margin:26px 0 28px;flex-wrap:wrap")}>
        <span style={sx("font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>
          {app.brandLoading ? "" : `${products.length} ${things(products.length)}${products.length !== all.length ? ` из ${all.length}` : ""}`}
        </span>
        <span className="dp-btn" onClick={() => setFiltersOpen(true)} style={sx(`display:inline-flex;align-items:center;gap:9px;font:500 14px 'Inter',sans-serif;border:1px solid ${activeCount ? "#2B2BCC" : "rgba(0,0,0,.16)"};color:${activeCount ? "#2B2BCC" : "#000"};background:#fff;border-radius:999px;padding:11px 20px`)}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 4h12M4.5 8h7M7 12h2"></path></svg>
          Фильтры{activeCount ? ` · ${activeCount}` : ""}
        </span>
      </div>

      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        onChange={setFilters}
        zones={zones}
        genders={genders}
        priceRange={priceRange}
        resultCount={products.length}
      />

      {app.brandLoading ? (
        <div style={sx("padding:60px 20px;text-align:center;font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>Загружаем витрину…</div>
      ) : products.length === 0 ? (
        <div style={sx("padding:60px 20px;text-align:center;font:400 14px 'Inter',sans-serif;color:rgba(0,0,0,.5)")}>
          {all.length === 0 ? "У этого бренда пока нет товаров в каталоге." : "Под выбранные фильтры ничего не подошло."}
        </div>
      ) : (
        // ProductCardDp — общая карточка: избранное (с состоянием), примерка, переход.
        <div className="dp-r4" style={sx("display:grid;grid-template-columns:repeat(4,1fr);gap:22px")}>
          {products.map((p) => (
            <ProductCardDp key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
