import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useAdmin } from "../store";
import { ago } from "../shared";

/*
 * A3 · Партнёры и каталог. Порт эталона 1:1.
 * Список партнёров — реальный GET /partners. Блок «Что сломалось» — реальные
 * отклонённые товары GET /partners/{id}/rejects (сгруппированы по причине).
 * Отличия (правило честности): в API Ф1 нет журнала синков с диффом и URL фида →
 *   • «Журнал синхронизаций» = честное пустое состояние (появится с прогонами), TODO(Ф7);
 *   • статус партнёра — из last_sync_status (или «нет синков»).
 * Чипы «состояние» — превью визуальных состояний (синк/упал/фид0/пусто), пиксель-спека.
 */

type PST = "ok" | "sync" | "failed" | "feed0" | "empty";
const STATES: { k: PST; l: string }[] = [
  { k: "ok", l: "Норма" },
  { k: "sync", l: "Синк идёт" },
  { k: "failed", l: "Синк упал" },
  { k: "feed0", l: "Фид 0" },
  { k: "empty", l: "Партнёров нет" },
];

const SYNC_COLOR: Record<string, { c: string; l: string }> = {
  ok: { c: "#1F8A5B", l: "активен" },
  success: { c: "#1F8A5B", l: "активен" },
  running: { c: "#2436D8", l: "синк идёт" },
  failed: { c: "#C0392B", l: "синк упал" },
  error: { c: "#C0392B", l: "синк упал" },
  partial: { c: "#C97A16", l: "частично" },
  paused: { c: "#8A8A82", l: "пауза" },
};
const syncOf = (s?: string) =>
  (s && SYNC_COLOR[s]) || { c: "#8A8A82", l: s || "нет синков" };

const REJECT_REASON: Record<string, string> = {
  no_photo: "Нет фото товара",
  photo_on_mannequin: "Фото на манекене (нужен product-only)",
  no_price: "Нет цены в фиде",
  category_out_of_zones: "Категория вне 5 зон одежды",
  no_sizes: "Нет размерной сетки",
};

export function Partners() {
  const partners = useAdmin((s) => s.partners);
  const rejects = useAdmin((s) => s.rejects);
  const loadPartners = useAdmin((s) => s.loadPartners);
  const createPartner = useAdmin((s) => s.createPartner);
  const syncPartner = useAdmin((s) => s.syncPartner);
  const pausePartner = useAdmin((s) => s.pausePartner);
  const loadRejects = useAdmin((s) => s.loadRejects);

  const [pst, setPst] = useState<PST>("ok");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  // Ручной онбординг партнёра (A3) — реальный POST /admin/partners.
  const [newEmail, setNewEmail] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  const addPartner = async () => {
    if (!newEmail.includes("@") || creating) return;
    setCreating(true);
    setCreateErr("");
    const ok = await createPartner(newEmail.trim(), newBrand.trim());
    setCreating(false);
    if (ok) {
      setNewEmail("");
      setNewBrand("");
      setPst("ok"); // выйти из демо-состояния «Партнёров нет»
    } else {
      setCreateErr("Не удалось завести партнёра");
    }
  };

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    if (!partnerId && partners.length) setPartnerId(partners[0].id);
  }, [partners, partnerId]);

  useEffect(() => {
    if (partnerId) void loadRejects(partnerId);
  }, [partnerId, loadRejects]);

  const partEmpty = pst === "empty" || partners.length === 0;
  const detP = partners.find((p) => p.id === partnerId) ?? partners[0];
  const detSt = syncOf(detP?.last_sync_status);

  // группировка реальных отклонений по причине
  const grouped = Object.entries(
    rejects.reduce<Record<string, { count: number; example: string }>>(
      (acc, r) => {
        const g = (acc[r.reason] ??= { count: 0, example: "" });
        g.count += 1;
        if (!g.example)
          g.example = r.external_id
            ? `напр. ${r.external_id}${r.title ? ` · «${r.title}»` : ""}`
            : r.detail || "";
        return acc;
      },
      {},
    ),
  );

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
            Партнёры и каталог
          </h1>
          <span
            style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}
          >
            ручной онбординг · здоровье импорта
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
            const on = pst === t.k;
            return (
              <span
                key={t.k}
                className="ac-btn"
                onClick={() => setPst(t.k)}
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

      {partEmpty ? (
        <div
          style={sx(
            "flex:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px",
          )}
        >
          <div style={sx("max-width:420px")}>
            <div
              style={sx(
                "font:400 22px 'Spectral',Georgia,serif;color:rgba(0,0,0,.55)",
              )}
            >
              Партнёров пока нет
            </div>
            <div
              style={sx(
                "font:400 13.5px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.55);margin-top:8px",
              )}
            >
              Заведите первого вручную: почта + название бренда. Партнёр сможет
              войти по коду на свою почту и подключить фид.
            </div>
            <div style={sx("display:flex;flex-direction:column;gap:8px;margin-top:16px;text-align:left")}>
              <input
                className="ac-in"
                placeholder="Почта партнёра"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={sx("font:400 13px 'Inter',sans-serif")}
              />
              <input
                className="ac-in"
                placeholder="Название бренда (необязательно)"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                style={sx("font:400 13px 'Inter',sans-serif")}
              />
              <span
                className="ac-btn"
                onClick={() => void addPartner()}
                style={sx(
                  `font:600 12.5px 'Inter',sans-serif;padding:10px 18px;border-radius:9px;background:#16150F;color:#fff;text-align:center;opacity:${newEmail.includes("@") && !creating ? 1 : 0.5}`,
                )}
              >
                {creating ? "Завожу…" : "Завести партнёра"}
              </span>
              {createErr && (
                <span style={sx("font:400 12px 'Inter',sans-serif;color:#C0392B")}>{createErr}</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={sx("flex:1;display:flex;min-height:0;overflow-x:auto")}>
          {/* LEFT · partner list */}
          <div
            style={sx(
              "width:312px;flex:none;border-right:1px solid rgba(0,0,0,.08);background:#fff;overflow-y:auto;padding:12px 12px",
            )}
          >
            {partners.map((p) => {
              const sel = p.id === partnerId;
              const st = syncOf(p.last_sync_status);
              return (
                <div
                  key={p.id}
                  className="ac-row"
                  onClick={() => setPartnerId(p.id)}
                  style={sx(
                    `border:1px solid ${sel ? "#2436D8" : "rgba(0,0,0,.1)"};background:${sel ? "#F4F3FE" : "#fff"};border-radius:11px;padding:12px 13px;margin-bottom:8px`,
                  )}
                >
                  <div
                    style={sx(
                      "display:flex;align-items:center;justify-content:space-between;gap:8px",
                    )}
                  >
                    <span style={sx("font:600 13.5px 'Inter',sans-serif")}>
                      {p.brand_name || p.email}
                    </span>
                    <span
                      style={sx(
                        `display:inline-flex;align-items:center;gap:5px;font:500 11px 'Inter',sans-serif;color:${st.c}`,
                      )}
                    >
                      <span className="ac-dot" style={sx(`background:${st.c}`)} />
                      {st.l}
                    </span>
                  </div>
                  <div
                    className="mono"
                    style={sx(
                      "font:400 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.5);margin-top:5px",
                    )}
                  >
                    {p.email} · {p.sources} источн.
                  </div>
                  <div
                    className="mono"
                    style={sx(
                      "font:400 10.5px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.4);margin-top:3px",
                    )}
                  >
                    синк {p.last_sync_at ? ago(p.last_sync_at) : "—"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT · detail */}
          <div
            style={sx(
              "flex:1;min-width:440px;overflow-y:auto;padding:22px 24px 40px;background:#F7F5F0",
            )}
          >
            {/* connection + actions */}
            <div
              style={sx(
                "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:18px 20px",
              )}
            >
              <div
                style={sx(
                  "display:flex;align-items:center;justify-content:space-between",
                )}
              >
                <div>
                  <div style={sx("font:600 17px 'Inter',sans-serif")}>
                    {detP?.brand_name || detP?.email}
                  </div>
                  <div
                    className="mono"
                    style={sx(
                      "font:400 11.5px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.5);margin-top:3px",
                    )}
                  >
                    {detP?.email} · {detP?.sources} источник(ов)
                  </div>
                </div>
                <span
                  style={sx(
                    `display:inline-flex;align-items:center;gap:6px;font:500 12px 'Inter',sans-serif;color:${detSt.c}`,
                  )}
                >
                  <span className="ac-dot" style={sx(`background:${detSt.c}`)} />
                  {detSt.l}
                </span>
              </div>
              <div style={sx("display:flex;gap:8px;flex-wrap:wrap;margin-top:14px")}>
                <span
                  className="ac-btn"
                  onClick={() => detP && void syncPartner(detP.id)}
                  style={sx(
                    "font:600 12px 'Inter',sans-serif;padding:8px 14px;border-radius:8px;background:#2436D8;color:#fff;display:inline-flex;align-items:center;gap:6px;cursor:pointer",
                  )}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html:
                        '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M2 6a4 4 0 1 1 1.2 2.8M2 6V3.5M2 6h2.5"></path></svg>',
                    }}
                  />
                  Запустить синк
                </span>
                <span
                  className="ac-btn"
                  onClick={() => detP && void pausePartner(detP.id, true)}
                  style={sx(
                    "font:600 12px 'Inter',sans-serif;padding:8px 14px;border-radius:8px;border:1px solid rgba(196,85,59,.35);color:#C4553B;background:#fff;cursor:pointer",
                  )}
                >
                  Поставить на паузу
                </span>
              </div>
            </div>

            {/* sync running / failed / feed0 — превью-чипы */}
            {pst === "sync" && (
              <div
                style={sx(
                  "margin-top:14px;background:#fff;border:1px solid rgba(36,54,216,.25);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px",
                )}
              >
                <span className="ac-spin" />
                <span
                  style={sx("font:500 12.5px 'Inter',sans-serif;color:#2436D8")}
                >
                  Синхронизация идёт…
                </span>
              </div>
            )}
            {pst === "failed" && (
              <div
                style={sx(
                  "margin-top:14px;background:#FBEEEC;border:1px solid rgba(192,57,43,.3);border-radius:12px;padding:14px 18px",
                )}
              >
                <div
                  style={sx(
                    "display:flex;align-items:center;gap:8px;font:600 12.5px 'Inter',sans-serif;color:#B5372A",
                  )}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html:
                        '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 5v3.5M8 11h.01" stroke-linecap="round"></path></svg>',
                    }}
                  />
                  Синхронизация упала
                </div>
                <div
                  className="mono"
                  style={sx(
                    "font:400 11.5px/1.6 'IBM Plex Mono',monospace;color:#8A3529;margin:8px 0 0;background:rgba(192,57,43,.08);border-radius:8px;padding:10px 12px",
                  )}
                >
                  Ошибка парсинга фида. Импорт остановлен, каталог не изменён.
                </div>
              </div>
            )}
            {pst === "feed0" && (
              <div
                style={sx(
                  "margin-top:14px;background:#FCF3E2;border:1px solid rgba(201,122,22,.35);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:10px",
                )}
              >
                <span
                  style={sx("color:#B5751A")}
                  dangerouslySetInnerHTML={{
                    __html:
                      '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 1.5L15 14H1z"></path><path d="M8 6.5v3M8 11.5h.01" stroke-linecap="round"></path></svg>',
                  }}
                />
                <span
                  style={sx("font:500 12.5px 'Inter',sans-serif;color:#8A5A12")}
                >
                  Фид отдаёт 0 товаров. Синтаксис валиден, но выборка пуста —
                  проверьте фильтр наличия у партнёра.
                </span>
              </div>
            )}

            {/* sync journal — нет эндпоинта в Ф1 → честное пустое */}
            <div
              style={sx(
                "margin-top:18px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;overflow:hidden",
              )}
            >
              <div
                style={sx(
                  "padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.08);font:600 13px 'Inter',sans-serif",
                )}
              >
                Журнал синхронизаций
              </div>
              <div
                style={sx(
                  "padding:22px 18px;font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)",
                )}
              >
                Журнал с диффом (+добавлено / ~обновлено / −удалено / ✗отклонено)
                появится после первых прогонов синхронизации.
              </div>
            </div>

            {/* ЧТО СЛОМАЛОСЬ — реальные отклонения */}
            <div style={sx("margin-top:18px")}>
              <div
                style={sx(
                  "display:flex;align-items:baseline;gap:10px;margin-bottom:12px",
                )}
              >
                <span style={sx("font:600 14px 'Inter',sans-serif")}>
                  Что сломалось
                </span>
                <span
                  style={sx(
                    "font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.5)",
                  )}
                >
                  отклонённые товары → это же требования к кабинету партнёра
                </span>
              </div>
              {grouped.length === 0 ? (
                <div
                  style={sx(
                    "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:11px;padding:20px 16px;font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.5)",
                  )}
                >
                  Отклонённых товаров у партнёра нет.
                </div>
              ) : (
                <div style={sx("display:flex;flex-direction:column;gap:8px")}>
                  {grouped.map(([reason, g]) => (
                    <div
                      key={reason}
                      style={sx(
                        "display:flex;align-items:center;gap:14px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:11px;padding:12px 16px",
                      )}
                    >
                      <span
                        style={sx(
                          "width:34px;height:34px;border-radius:7px;background:#F3F1EB;flex:none;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,.4)",
                        )}
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="14" height="14" rx="2"></rect><path d="M3 13l4-3 3 2 4-3 3 2"></path></svg>',
                        }}
                      />
                      <div style={sx("flex:1;min-width:0")}>
                        <div style={sx("font:500 12.5px 'Inter',sans-serif")}>
                          {REJECT_REASON[reason] ?? reason}
                        </div>
                        <div
                          className="mono"
                          style={sx(
                            "font:400 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.45);margin-top:2px",
                          )}
                        >
                          {g.example}
                        </div>
                      </div>
                      <span
                        className="mono"
                        style={sx(
                          "font:600 12px 'IBM Plex Mono',monospace;color:#B5372A;background:#FBEEEC;border-radius:20px;padding:4px 11px;flex:none",
                        )}
                      >
                        {g.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
