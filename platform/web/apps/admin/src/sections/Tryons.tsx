import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useAdmin } from "../store";
import { rub, pct, ago } from "../shared";

/*
 * A5 · Примерки и себестоимость. Порт эталона 1:1.
 * Блок себестоимости — на РЕАЛЬНЫХ данных (GET /tryons?days=7 → cost).
 * Правило честности: cost.has_data=false → честный пустой блок («—»), НЕ мок-38%.
 * proOver (маржа под угрозой) выводится из реальной доли Pro > 45% (либо превью-чип).
 * «Топ по стоимости» — нет разбивки по партнёру в API Ф1 → честный прочерк, TODO(Ф7).
 * Чипы «состояние» — превью визуальных состояний (порог/ошибки/пусто), пиксель-спека.
 */

type TS = "ok" | "over" | "errors" | "empty";
const STATES: { k: TS; l: string }[] = [
  { k: "ok", l: "Норма" },
  { k: "over", l: "Pro выше порога" },
  { k: "errors", l: "Всплеск ошибок" },
  { k: "empty", l: "Очередь пуста" },
];
const GST: Record<string, string> = {
  done: "#1F8A5B",
  ok: "#1F8A5B",
  running: "#2436D8",
  run: "#2436D8",
  queued: "#2436D8",
  error: "#C0392B",
  failed: "#C0392B",
};
const GRID = "1.1fr .8fr .7fr .8fr 1fr 1fr";

export function Tryons() {
  const tryons = useAdmin((s) => s.tryons);
  const cost = useAdmin((s) => s.cost);
  const loadTryons = useAdmin((s) => s.loadTryons);
  const [ts, setTs] = useState<TS>("ok");

  useEffect(() => {
    void loadTryons(7); // окно для карточки «за 7 дней»
  }, [loadTryons]);

  const hasData = !!cost?.has_data;
  const realOver = hasData && (cost?.pro_share ?? 0) > 0.45;
  const over = ts === "over" || realOver;
  const errSpike = ts === "errors";
  const queueEmptyChip = ts === "empty";

  const rows = queueEmptyChip ? [] : tryons;
  const tryEmpty = rows.length === 0;

  // значения блока себестоимости — только из реальных данных
  const proShare = hasData ? pct(cost!.pro_share) : "—";
  const avgCost = hasData ? rub(cost!.avg_cost_kopecks) : "— ₽";
  const weekCost = hasData ? rub(cost!.cost_kopecks_total) : "— ₽";
  const weekCount = (cost?.generations ?? 0) + " генераций";

  const proColor = over ? "#B5751A" : "#1F8A5B";
  const proCardBg = over ? "#FCF3E2" : "#fff";
  const proCardBorder = over ? "rgba(201,122,22,.35)" : "rgba(0,0,0,.1)";

  const modelName = (m: string) =>
    m ? m.charAt(0).toUpperCase() + m.slice(1) : "—";

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
            Примерки и себестоимость
          </h1>
          <span
            style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}
          >
            маржа ≥50% живёт и умирает здесь
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
            const on = ts === t.k;
            return (
              <span
                key={t.k}
                className="ac-btn"
                onClick={() => setTs(t.k)}
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

      <div style={sx("flex:1;overflow-y:auto;padding:22px 24px 40px")}>
        {/* COST BLOCK */}
        <div
          style={sx(
            "font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(0,0,0,.45);margin-bottom:10px",
          )}
        >
          Себестоимость · элемент монетизации, не метрика в логах
        </div>
        <div
          style={sx("display:grid;grid-template-columns:repeat(4,1fr);gap:14px")}
        >
          <div
            style={sx(
              `background:${proCardBg};border:1px solid ${proCardBorder};border-radius:14px;padding:16px 18px`,
            )}
          >
            <div
              style={sx(
                "font:500 11.5px 'Inter',sans-serif;color:rgba(0,0,0,.55)",
              )}
            >
              Доля Pro-генераций
            </div>
            <div
              className="mono"
              style={sx(
                `font:600 30px 'IBM Plex Mono',monospace;color:${proColor};margin-top:6px`,
              )}
            >
              {proShare}
            </div>
            <div
              style={sx(
                `font:400 11px 'Inter',sans-serif;color:${proColor};margin-top:2px`,
              )}
            >
              порог для маржи ≥50% — ниже 45%
            </div>
          </div>
          <div
            style={sx(
              "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:16px 18px",
            )}
          >
            <div
              style={sx(
                "font:500 11.5px 'Inter',sans-serif;color:rgba(0,0,0,.55)",
              )}
            >
              Средняя себестоимость
            </div>
            <div
              className="mono"
              style={sx("font:600 30px 'IBM Plex Mono',monospace;margin-top:6px")}
            >
              {avgCost}
            </div>
            <div
              style={sx(
                "font:400 11px 'Inter',sans-serif;color:rgba(0,0,0,.45);margin-top:2px",
              )}
            >
              за одну примерку
            </div>
          </div>
          <div
            style={sx(
              "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:16px 18px",
            )}
          >
            <div
              style={sx(
                "font:500 11.5px 'Inter',sans-serif;color:rgba(0,0,0,.55)",
              )}
            >
              Стоимость за 7 дней
            </div>
            <div
              className="mono"
              style={sx("font:600 30px 'IBM Plex Mono',monospace;margin-top:6px")}
            >
              {weekCost}
            </div>
            <div
              className="mono"
              style={sx(
                "font:400 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.45);margin-top:2px",
              )}
            >
              {weekCount}
            </div>
          </div>
          <div
            style={sx(
              "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:16px 18px",
            )}
          >
            <div
              style={sx(
                "font:500 11.5px 'Inter',sans-serif;color:rgba(0,0,0,.55)",
              )}
            >
              Топ по стоимости
            </div>
            {/* нет разбивки по партнёру в API Ф1 → честный прочерк */}
            <div
              style={sx("font:600 18px 'Spectral',Georgia,serif;margin-top:8px")}
            >
              —
            </div>
            <div
              className="mono"
              style={sx(
                "font:400 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.45);margin-top:2px",
              )}
            >
              появится с разбивкой по партнёрам
            </div>
          </div>
        </div>
        <div
          style={sx(
            "margin-top:12px;font:500 12px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.55);background:#F3F1EB;border-radius:10px;padding:11px 15px",
          )}
        >
          Маржа ≥50% требует{" "}
          <span style={sx("color:#16150F")}>доли Pro ниже 45%</span> при средней
          цене примерки для покупателя <span style={sx("color:#16150F")}>12 ₽</span>.
          Читайте цифру как решение, а не факт.
        </div>

        {/* OVER-THRESHOLD WARNING */}
        {over && (
          <div
            style={sx(
              "margin-top:12px;display:flex;align-items:center;gap:10px;background:#FCF3E2;border:1px solid rgba(201,122,22,.35);border-radius:10px;padding:12px 15px",
            )}
          >
            <span
              style={sx("color:#B5751A")}
              dangerouslySetInnerHTML={{
                __html:
                  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 1.5L15 14H1z"></path><path d="M8 6.5v3M8 11.5h.01" stroke-linecap="round"></path></svg>',
              }}
            />
            <span
              style={sx("font:500 12.5px 'Inter',sans-serif;color:#8A5A12")}
            >
              Доля Pro {proShare} — выше порога 45%. Маржа под угрозой: понизьте
              долю Pro (даунгрейд лёгких сцен во Flash) или поднимите цену
              примерки.
            </span>
          </div>
        )}

        {/* ERRORS SPIKE ALERT (превью-чип) */}
        {errSpike && (
          <div
            style={sx(
              "margin-top:12px;display:flex;align-items:center;gap:10px;background:#FBEEEC;border:1px solid rgba(192,57,43,.35);border-radius:10px;padding:12px 15px",
            )}
          >
            <span
              style={sx("color:#B5372A")}
              dangerouslySetInnerHTML={{
                __html:
                  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 5v3.5M8 11h.01" stroke-linecap="round"></path></svg>',
              }}
            />
            <span
              style={sx("font:500 12.5px 'Inter',sans-serif;color:#8A3529")}
            >
              Всплеск ошибок: часть генераций падает. Проверьте провайдер / поставьте
              партнёра на паузу.
            </span>
          </div>
        )}

        {/* QUEUE */}
        <div
          style={sx(
            "display:flex;align-items:baseline;justify-content:space-between;margin:26px 0 12px",
          )}
        >
          <span style={sx("font:600 14px 'Inter',sans-serif")}>
            Очередь генераций
          </span>
          <span
            className="mono"
            style={sx(
              "font:500 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.45)",
            )}
          >
            {tryEmpty ? "0 в очереди" : rows.length + " всего"}
          </span>
        </div>
        {tryEmpty ? (
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
              Очередь пуста
            </div>
            <div
              style={sx("font:400 12px 'Inter',sans-serif;margin-top:6px")}
            >
              Новые генерации появятся, когда операторы запустят примерки.
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
                `display:grid;grid-template-columns:${GRID};gap:12px;padding:11px 18px;border-bottom:1px solid rgba(0,0,0,.08);font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.05em;text-transform:uppercase;color:rgba(0,0,0,.45)`,
              )}
            >
              <span>Статус</span>
              <span>Модель</span>
              <span>Время</span>
              <span>Стоимость</span>
              <span>Партнёр</span>
              <span>Пользователь</span>
            </div>
            {rows.map((g) => {
              const col = GST[g.status] ?? "#8A8A82";
              const isPro = g.model.toLowerCase() === "pro";
              return (
                <div
                  key={g.id}
                  className="ac-row"
                  style={sx(
                    `display:grid;grid-template-columns:${GRID};gap:12px;padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.05);align-items:center`,
                  )}
                >
                  <span
                    style={sx(
                      `display:inline-flex;align-items:center;gap:7px;font:500 12px 'Inter',sans-serif;color:${col}`,
                    )}
                  >
                    <span className="ac-dot" style={sx(`background:${col}`)} />
                    {g.status}
                  </span>
                  <span>
                    <span
                      style={sx(
                        `font:600 10.5px 'IBM Plex Mono',monospace;padding:3px 9px;border-radius:6px;background:${isPro ? "rgba(36,54,216,.12)" : "#EEEBE4"};color:${isPro ? "#2436D8" : "rgba(0,0,0,.55)"}`,
                      )}
                    >
                      {modelName(g.model)}
                    </span>
                  </span>
                  <span
                    className="mono"
                    style={sx(
                      "font:400 12px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.6)",
                    )}
                  >
                    {ago(g.created_at)}
                  </span>
                  <span
                    className="mono"
                    style={sx("font:500 12px 'IBM Plex Mono',monospace")}
                  >
                    {g.cost_kopecks == null ? "—" : rub(g.cost_kopecks)}
                  </span>
                  <span style={sx("font:400 12.5px 'Inter',sans-serif")}>—</span>
                  <span
                    style={sx(
                      "font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.7)",
                    )}
                  >
                    {g.user}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ERRORS — реальные ошибки из очереди (error_reason непустой) */}
        {(() => {
          const errRows = rows.filter((g) => g.error_reason);
          if (!errSpike && errRows.length === 0) return null;
          return (
            <div style={sx("margin-top:26px")}>
              <div
                style={sx("font:600 14px 'Inter',sans-serif;margin-bottom:12px")}
              >
                Ошибки генерации
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:8px")}>
                {errRows.length === 0 ? (
                  <div
                    style={sx(
                      "font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.5)",
                    )}
                  >
                    Ошибок с причиной в окне нет.
                  </div>
                ) : (
                  errRows.map((e) => (
                    <div
                      key={e.id}
                      style={sx(
                        "display:flex;align-items:center;gap:14px;background:#fff;border:1px solid rgba(192,57,43,.2);border-radius:11px;padding:12px 16px",
                      )}
                    >
                      <span
                        style={sx("color:#C0392B;flex:none")}
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"></circle><path d="M6 6l4 4M10 6l-4 4" stroke-linecap="round"></path></svg>',
                        }}
                      />
                      <div style={sx("flex:1;min-width:0")}>
                        <div
                          style={sx("font:500 12.5px 'Inter',sans-serif")}
                        >
                          {e.error_reason}
                        </div>
                        <div
                          className="mono"
                          style={sx(
                            "font:400 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.45);margin-top:2px",
                          )}
                        >
                          {modelName(e.model)} · {e.user} · {ago(e.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
