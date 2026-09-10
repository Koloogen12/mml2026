import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useAdmin } from "../store";
import { ZONE_LABEL } from "../shared";

/*
 * A4 · Товары. Порт эталона 1:1. Таблица — реальные товары GET /products.
 * Отличия (правило честности): в API Ф1 нет фото-URL, наличия и дублей →
 *   • миниатюра = нейтральный серый ac-thumb (не выдумываем фото товара), TODO(Ф7);
 *   • столбец «Наличие» → зона одежды (реальное поле garment_zone);
 *   • «Обогащение» — реальный флаг enriched (обогащено / не обогащён);
 *   • «Примерка» — реальный tryon_eligible + причина tryon_ineligible_reason.
 * Чипы «состояние» и массовые действия — пиксель-спека эталона (превью).
 */

type PS = "list" | "enriching" | "nofilter" | "empty";
const STATES: { k: PS; l: string }[] = [
  { k: "list", l: "Список" },
  { k: "enriching", l: "Обогащение идёт" },
  { k: "nofilter", l: "Фильтр пуст" },
  { k: "empty", l: "Товаров нет" },
];
const GRID = "26px 44px 1.5fr 1fr .7fr 1.3fr 1fr";

const price = (v: number | null) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v) +
      " ₽";

export function Products() {
  const products = useAdmin((s) => s.products);
  const loadProducts = useAdmin((s) => s.loadProducts);
  const hideProducts = useAdmin((s) => s.hideProducts);
  const enrichProducts = useAdmin((s) => s.enrichProducts);
  const [prst, setPrst] = useState<PS>("list");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const selCount = Object.values(sel).filter(Boolean).length;
  const rows = prst === "nofilter" || prst === "empty" ? [] : products;

  return (
    <div
      className="ac-fade"
      style={sx("display:flex;flex-direction:column;height:100vh")}
    >
      <div
        style={sx(
          "flex:none;display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:#fff;border-bottom:1px solid rgba(0,0,0,.08)",
        )}
      >
        <div style={sx("display:flex;align-items:center;gap:11px")}>
          <h1
            style={sx(
              "margin:0;font:600 18px 'Inter',sans-serif;letter-spacing:-.01em",
            )}
          >
            Товары
          </h1>
          <span
            style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}
          >
            модерация и пригодность к примерке
          </span>
        </div>
        <div style={sx("display:flex;align-items:center;gap:6px")}>
          <span
            style={sx(
              "font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(0,0,0,.4);margin-right:4px",
            )}
          >
            состояние
          </span>
          {STATES.map((t) => {
            const on = prst === t.k;
            return (
              <span
                key={t.k}
                className="ac-btn"
                onClick={() => setPrst(t.k)}
                style={sx(
                  `font:500 11px 'Inter',sans-serif;padding:5px 10px;border-radius:7px;background:${on ? "#2436D8" : "#fff"};color:${on ? "#fff" : "rgba(0,0,0,.6)"};border:1px solid ${on ? "#2436D8" : "rgba(0,0,0,.14)"}`,
                )}
              >
                {t.l}
              </span>
            );
          })}
        </div>
      </div>

      {/* bulk bar */}
      <div
        style={sx(
          `flex:none;display:flex;align-items:center;gap:10px;padding:11px 24px;background:${selCount ? "#F4F3FE" : "#fff"};border-bottom:1px solid rgba(0,0,0,.08)`,
        )}
      >
        <span
          style={sx(
            `font:500 12.5px 'Inter',sans-serif;color:${selCount ? "#16150F" : "rgba(0,0,0,.4)"}`,
          )}
        >
          {selCount
            ? "Выбрано " + selCount
            : "Выберите товары для массовых действий"}
        </span>
        <div
          style={sx(
            `display:flex;gap:7px;margin-left:auto;opacity:${selCount ? 1 : 0.45}`,
          )}
        >
          <span
            className="ac-btn"
            onClick={() => {
              const ids = Object.keys(sel).filter((k) => sel[k]);
              if (!ids.length) return;
              void enrichProducts(ids).then((n) => {
                setToast(
                  n > 0
                    ? `Пересборка атрибутов запущена: ${n} тов.`
                    : "Обогащение недоступно (нет ключа LLM)",
                );
                setSel({});
                window.setTimeout(() => setToast(""), 4000);
              });
            }}
            style={sx(
              `font:500 12px 'Inter',sans-serif;padding:7px 13px;border-radius:8px;border:1px solid rgba(0,0,0,.16);background:#fff;cursor:${selCount ? "pointer" : "default"}`,
            )}
          >
            Пересобрать атрибуты
          </span>
          <span
            className="ac-btn"
            onClick={() => {
              const ids = Object.keys(sel).filter((k) => sel[k]);
              if (ids.length) void hideProducts(ids);
            }}
            style={sx(
              `font:500 12px 'Inter',sans-serif;padding:7px 13px;border-radius:8px;border:1px solid rgba(0,0,0,.16);background:#fff;cursor:${selCount ? "pointer" : "default"}`,
            )}
          >
            Скрыть
          </span>
        </div>
      </div>
      {toast && (
        <div
          style={sx(
            "flex:none;padding:9px 24px;background:#F4F3FE;border-bottom:1px solid rgba(36,54,216,.2);font:500 12px 'Inter',sans-serif;color:#2436D8",
          )}
        >
          {toast}
        </div>
      )}

      <div style={sx("flex:1;overflow-y:auto;padding:20px 24px 40px")}>
        {prst === "enriching" && (
          <div
            style={sx(
              "margin-bottom:14px;background:#fff;border:1px solid rgba(36,54,216,.25);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px",
            )}
          >
            <span className="ac-spin" />
            <span
              style={sx("font:500 12.5px 'Inter',sans-serif;color:#2436D8")}
            >
              Обогащение атрибутов ИИ идёт
            </span>
          </div>
        )}
        {rows.length === 0 ? (
          <div
            style={sx(
              "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:56px 20px;text-align:center;color:rgba(0,0,0,.45)",
            )}
          >
            <div
              style={sx(
                "font:500 13px 'Inter',sans-serif;color:rgba(0,0,0,.6)",
              )}
            >
              {prst === "nofilter" ? "Ничего не найдено" : "Товаров нет"}
            </div>
            <div
              style={sx("font:400 12px 'Inter',sans-serif;margin-top:6px")}
            >
              По этому фильтру товаров нет. Сбросьте фильтр или измените запрос.
            </div>
          </div>
        ) : (
          <div
            style={sx(
              "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;overflow:hidden",
            )}
          >
            <div
              style={sx(
                `display:grid;grid-template-columns:${GRID};gap:12px;padding:11px 18px;border-bottom:1px solid rgba(0,0,0,.08);font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.05em;text-transform:uppercase;color:rgba(0,0,0,.45);align-items:center`,
              )}
            >
              <span />
              <span />
              <span>Товар · партнёр</span>
              <span>Цена</span>
              <span>Зона</span>
              <span>Примерка</span>
              <span>Обогащение</span>
            </div>
            {rows.map((p) => {
              const ch = !!sel[p.id];
              const fitOk = p.tryon_eligible;
              return (
                <div
                  key={p.id}
                  style={sx(
                    `display:grid;grid-template-columns:${GRID};gap:12px;padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.05);align-items:center;background:${ch ? "#F4F3FE" : "transparent"}`,
                  )}
                >
                  <span
                    className="ac-btn"
                    onClick={() => setSel((s) => ({ ...s, [p.id]: !s[p.id] }))}
                    style={sx(
                      `width:17px;height:17px;border-radius:5px;border:1.5px solid ${ch ? "#2436D8" : "rgba(0,0,0,.25)"};background:${ch ? "#2436D8" : "#fff"};display:flex;align-items:center;justify-content:center`,
                    )}
                    dangerouslySetInnerHTML={{
                      __html: ch
                        ? '<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5L5 9l4.5-5"></path></svg>'
                        : "",
                    }}
                  />
                  {/* нет фото-URL в API → нейтральный серый thumb (не выдумываем фото) */}
                  <div
                    className="ac-thumb"
                    style={sx("width:44px;height:44px;border-radius:7px")}
                  />
                  <div style={sx("min-width:0")}>
                    <div
                      style={sx(
                        "font:500 12.5px 'Inter',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
                      )}
                    >
                      {p.name}
                    </div>
                    <div
                      style={sx(
                        "font:400 10.5px 'Inter',sans-serif;color:rgba(0,0,0,.5)",
                      )}
                    >
                      {p.brand}
                    </div>
                  </div>
                  <span
                    className="mono"
                    style={sx("font:500 12px 'IBM Plex Mono',monospace")}
                  >
                    {price(p.price)}
                  </span>
                  <span
                    style={sx(
                      "font:400 11.5px 'Inter',sans-serif;color:rgba(0,0,0,.6)",
                    )}
                  >
                    {p.garment_zone
                      ? (ZONE_LABEL[p.garment_zone] ?? p.garment_zone)
                      : "—"}
                  </span>
                  <span
                    style={sx(
                      `display:inline-flex;align-items:center;gap:6px;font:500 11.5px 'Inter',sans-serif;color:${fitOk ? "#1F8A5B" : "#C0392B"}`,
                    )}
                  >
                    <span
                      className="ac-dot"
                      style={sx(`background:${fitOk ? "#1F8A5B" : "#C0392B"}`)}
                    />
                    {fitOk
                      ? "пригодно"
                      : p.tryon_ineligible_reason || "не пригодно"}
                  </span>
                  <span
                    style={sx(
                      `font:400 11.5px 'Inter',sans-serif;color:${p.enriched ? "rgba(0,0,0,.55)" : "#2436D8"}`,
                    )}
                  >
                    {p.enriched ? "обогащено" : "не обогащён"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
