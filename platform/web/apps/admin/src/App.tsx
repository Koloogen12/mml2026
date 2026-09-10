import { useEffect } from "react";
import { sx } from "./sx";
import { useAdmin } from "./store";
import { NAV } from "./nav";
import { Desk } from "./sections/Desk";
import { Rate } from "./sections/Rate";
import { Users } from "./sections/Users";
import { Partners } from "./sections/Partners";
import { Products } from "./sections/Products";
import { Tryons } from "./sections/Tryons";
import { Consents } from "./sections/Consents";
import { Funnel } from "./sections/Funnel";
import { Flags } from "./sections/Flags";
import { Blog } from "./sections/Blog";
import { HomeContent } from "./sections/HomeContent";

/*
 * Порт hi-fi хендоффа "Admin Console.dc.html" (контракт 1:1).
 * Разметка / классы / inline-стили / keyframes / тайминги — дословно;
 * dc-runtime → React-стейт (zustand + локальный useState), моки → /api/v1/admin/*.
 * Отличия (санкционированы стандартом проекта и правилом честности):
 *   • 'Martina Plantijn' → 'Spectral' (у Martina нет кириллицы).
 *   • Данные разделов — реальные из API; где has_data=false / пусто —
 *     честное пустое состояние эталона, без выдуманных цифр.
 */
export default function App() {
  const view = useAdmin((s) => s.view);
  const setView = useAdmin((s) => s.setView);
  const queueCounts = useAdmin((s) => s.queueCounts);
  const queueLen = useAdmin((s) => s.queue.length);
  const labeled = useAdmin((s) => s.labeled);
  const labelTarget = useAdmin((s) => s.labelTarget);
  const loadQueue = useAdmin((s) => s.loadQueue);
  const loadLabelStats = useAdmin((s) => s.loadLabelStats);

  // бейджи меню — реальные счётчики (очередь + прогресс разметки)
  useEffect(() => {
    void loadQueue();
    void loadLabelStats();
  }, [loadQueue, loadLabelStats]);

  const totalQueue =
    Object.values(queueCounts).reduce((a, b) => a + b, 0) || queueLen;

  return (
    <div style={sx("display:flex;min-height:100vh")}>
      {/* ================= SIDEBAR ================= */}
      <aside
        style={sx(
          "width:220px;flex:none;background:#fff;border-right:1px solid rgba(0,0,0,.08);display:flex;flex-direction:column;position:sticky;top:0;height:100vh",
        )}
      >
        <div
          style={sx(
            "padding:20px 18px 16px;border-bottom:1px solid rgba(0,0,0,.06)",
          )}
        >
          <div style={sx("display:flex;align-items:center;gap:10px")}>
            <span
              style={sx(
                "width:34px;height:34px;border-radius:9px;background:#16150F;color:#fff;display:flex;align-items:center;justify-content:center;flex:none",
              )}
              dangerouslySetInnerHTML={{
                __html:
                  '<svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15L9 4l3 6 2-3 3 8"></path></svg>',
              }}
            />
            <div style={sx("min-width:0")}>
              <div
                style={sx("font:600 14px 'Inter',sans-serif;letter-spacing:-.01em")}
              >
                MakeMeLook
              </div>
              <div
                style={sx(
                  "font:500 10.5px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.45);letter-spacing:.02em",
                )}
              >
                ADMIN · v0.1
              </div>
            </div>
          </div>
        </div>
        <nav
          style={sx(
            "flex:1;padding:10px 10px;display:flex;flex-direction:column;gap:1px;overflow-y:auto",
          )}
        >
          {NAV.map((n) => {
            const on = view === n.key;
            const count =
              n.key === "desk"
                ? totalQueue || false
                : n.key === "rate"
                  ? `${labeled}/${labelTarget}`
                  : false;
            return (
              <div
                key={n.key}
                className="ac-nav"
                onClick={() => setView(n.key)}
                style={sx(
                  `display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;background:${on ? "#16150F" : "transparent"};color:${on ? "#fff" : "rgba(0,0,0,.8)"}`,
                )}
              >
                <span
                  style={sx(
                    `width:16px;display:flex;justify-content:center;flex:none;color:${on ? "#fff" : n.star ? "#E0A21E" : "rgba(0,0,0,.5)"}`,
                  )}
                  dangerouslySetInnerHTML={{ __html: n.ico }}
                />
                <span
                  style={sx(
                    `font:${on ? 600 : 500} 13px 'Inter',sans-serif;flex:1`,
                  )}
                >
                  {n.label}
                </span>
                {count !== false && (
                  <span
                    className="mono"
                    style={sx(
                      `font:600 10.5px 'IBM Plex Mono',monospace;color:${on ? "#fff" : "#2436D8"};background:${on ? "rgba(255,255,255,.18)" : "rgba(36,54,216,.1)"};border-radius:20px;padding:2px 7px`,
                    )}
                  >
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
        <div
          style={sx(
            "padding:12px 16px;border-top:1px solid rgba(0,0,0,.06);font:500 11px 'Inter',sans-serif;color:rgba(0,0,0,.5);display:flex;align-items:center;gap:8px",
          )}
        >
          <span
            className="ac-dot"
            style={sx("background:#1F8A5B;width:7px;height:7px")}
          />
          Все системы в норме
        </div>
      </aside>

      {/* ================= WORKSPACE ================= */}
      <main
        style={sx(
          "flex:1;min-width:0;display:flex;flex-direction:column;height:100vh",
        )}
      >
        {view === "desk" && <Desk />}
        {view === "tryons" && <Tryons />}
        {view === "partners" && <Partners />}
        {view === "rate" && <Rate />}
        {view === "users" && <Users />}
        {view === "consents" && <Consents />}
        {view === "products" && <Products />}
        {view === "funnel" && <Funnel />}
        {view === "flags" && <Flags />}
        {view === "blog" && <Blog />}
        {view === "sitehome" && <HomeContent />}
      </main>
    </div>
  );
}
