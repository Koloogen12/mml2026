import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useAdmin } from "../store";
import {
  buildPassportChips,
  STATUS_COLOR,
  STATUS_LABEL,
  initial,
  shortDate,
} from "../shared";

/*
 * A2 · Пользователи. Порт эталона 1:1. Таблица людей — тот же GET /queue.
 * Отличия (правило честности):
 *   • «Куп.» = 1 при статусе purchased, иначе 0 (в очереди нет счётчика покупок);
 *   • паспорт стиля и история примерок/переходов — демо эталона (нет API Ф1), TODO(Ф7);
 *   • «Удалить биометрию» — реальный DELETE /users/{id}/biometric (с подтверждением).
 * Чипы «состояние» — превью (список / загрузка / без паспорта / биометрия удалена).
 */

type US = "ready" | "loading" | "nopass" | "bio";
const STATES: { k: US; l: string }[] = [
  { k: "ready", l: "Список" },
  { k: "loading", l: "Загрузка" },
  { k: "nopass", l: "Без паспорта" },
  { k: "bio", l: "Биометрия удалена" },
];
const GRID = "1.4fr .9fr .8fr .5fr .5fr .5fr";

export function Users() {
  const queue = useAdmin((s) => s.queue);
  const queueLoaded = useAdmin((s) => s.queueLoaded);
  const loadQueue = useAdmin((s) => s.loadQueue);
  const deleteBiometric = useAdmin((s) => s.deleteBiometric);
  const setView = useAdmin((s) => s.setView);
  const deskPassport = useAdmin((s) => s.deskPassport);
  const passportLoaded = useAdmin((s) => s.deskPassportLoaded);
  const loadDeskPassport = useAdmin((s) => s.loadDeskPassport);
  const exportUser = useAdmin((s) => s.exportUser);

  const [ust, setUst] = useState<US>("ready");
  const [userId, setUserId] = useState<string | null>(null);
  const [bioDeleted, setBioDeleted] = useState(false);

  useEffect(() => {
    if (!queueLoaded) void loadQueue();
  }, [queueLoaded, loadQueue]);

  useEffect(() => {
    if (!userId && queue.length) setUserId(queue[0].id);
  }, [queue, userId]);

  // Реальный паспорт выбранного человека (тот же GET /users/{id}/passport, что в Desk).
  useEffect(() => {
    if (userId) void loadDeskPassport(userId);
  }, [userId, loadDeskPassport]);

  const usersLoading = ust === "loading";
  const uDet = queue.find((u) => u.id === userId) ?? queue[0];
  const passportChips = buildPassportChips(deskPassport);
  const hasPassport = passportChips.length > 0;
  const bioIsDeleted = bioDeleted || ust === "bio";

  const onDeleteBio = async () => {
    if (!uDet) return;
    if (
      !window.confirm(
        `Удалить биометрию пользователя ${uDet.contact}? Действие необратимо (152-ФЗ), запишется в журнал.`,
      )
    )
      return;
    const ok = await deleteBiometric(uDet.id);
    if (ok) setBioDeleted(true);
  };

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
            Пользователи
          </h1>
          <span
            style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}
          >
            видеть человека целиком и уметь помочь
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
            const on = ust === t.k;
            return (
              <span
                key={t.k}
                className="ac-btn"
                onClick={() => {
                  setUst(t.k);
                  setBioDeleted(false);
                }}
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

      <div style={sx("flex:1;display:flex;min-height:0;overflow-x:auto")}>
        {/* table */}
        <div
          style={sx(
            "flex:1;min-width:440px;overflow-y:auto;padding:20px 22px 40px",
          )}
        >
          {usersLoading ? (
            <div style={sx("display:flex;flex-direction:column;gap:8px")}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="ac-skel" style={sx("height:46px")} />
              ))}
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
                <span>Контакт</span>
                <span>Источник</span>
                <span>Статус</span>
                <span>Диал.</span>
                <span>Прим.</span>
                <span>Куп.</span>
              </div>
              {queue.map((u) => {
                const sel = u.id === userId;
                const buys =
                  u.status === "purchased" || u.status === "bought" ? 1 : 0;
                return (
                  <div
                    key={u.id}
                    className="ac-row"
                    onClick={() => setUserId(u.id)}
                    style={sx(
                      `display:grid;grid-template-columns:${GRID};gap:12px;padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.05);align-items:center;background:${sel ? "#F4F3FE" : "transparent"}`,
                    )}
                  >
                    <div style={sx("min-width:0")}>
                      <div
                        style={sx(
                          "font:500 12.5px 'Inter',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
                        )}
                      >
                        {u.display_name || u.contact}
                      </div>
                      <div
                        className="mono"
                        style={sx(
                          "font:400 10.5px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.45)",
                        )}
                      >
                        {u.contact}
                      </div>
                    </div>
                    <span
                      style={sx(
                        "font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.65)",
                      )}
                    >
                      {u.source || "—"}
                    </span>
                    <span
                      style={sx(
                        `font:500 11px 'Inter',sans-serif;color:${STATUS_COLOR[u.status] ?? "#8A8A82"}`,
                      )}
                    >
                      {STATUS_LABEL[u.status] ?? u.status}
                    </span>
                    <span
                      className="mono"
                      style={sx("font:500 12px 'IBM Plex Mono',monospace")}
                    >
                      {u.dialogs}
                    </span>
                    <span
                      className="mono"
                      style={sx("font:500 12px 'IBM Plex Mono',monospace")}
                    >
                      {u.tryons}
                    </span>
                    <span
                      className="mono"
                      style={sx(
                        `font:600 12px 'IBM Plex Mono',monospace;color:${buys ? "#1F8A5B" : "rgba(0,0,0,.3)"}`,
                      )}
                    >
                      {buys}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* detail */}
        {!usersLoading && uDet && (
          <div
            style={sx(
              "width:352px;flex:none;border-left:1px solid rgba(0,0,0,.08);background:#fff;overflow-y:auto;padding:20px 20px 40px",
            )}
          >
            <div style={sx("display:flex;align-items:center;gap:12px")}>
              <span
                style={sx(
                  "width:44px;height:44px;border-radius:50%;background:#16150F;color:#fff;display:flex;align-items:center;justify-content:center;font:500 17px 'Spectral',Georgia,serif;flex:none",
                )}
              >
                {initial(uDet.display_name || uDet.contact)}
              </span>
              <div>
                <div style={sx("font:600 15px 'Inter',sans-serif")}>
                  {uDet.display_name || uDet.contact}
                </div>
                <div
                  className="mono"
                  style={sx(
                    "font:400 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.5)",
                  )}
                >
                  {uDet.contact} · c {shortDate(uDet.last_action_at)}
                </div>
              </div>
            </div>
            <div style={sx("display:flex;gap:7px;margin-top:14px")}>
              <span
                className="ac-btn"
                onClick={() => setView("desk")}
                style={sx(
                  "flex:1;text-align:center;font:600 11.5px 'Inter',sans-serif;padding:8px 0;border-radius:8px;background:rgba(36,54,216,.1);color:#2436D8;border:1px solid rgba(36,54,216,.22)",
                )}
              >
                Открыть в столе стилиста
              </span>
            </div>

            {/* passport — реальный GET /users/{id}/passport */}
            {passportLoaded && !hasPassport ? (
              <div
                style={sx(
                  "margin-top:18px;background:#F7F5F0;border-radius:11px;padding:16px;text-align:center;font:400 12.5px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.55)",
                )}
              >
                Паспорт стиля не заполнен — человек ещё не прошёл онбординг.
              </div>
            ) : (
              <>
                <div
                  style={sx(
                    "margin-top:18px;font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(0,0,0,.45);margin-bottom:10px",
                  )}
                >
                  Паспорт стиля
                </div>
                <div style={sx("display:flex;flex-wrap:wrap;gap:6px")}>
                  {passportChips.map((c, i) => (
                    <span
                      key={i}
                      style={sx(
                        "font:500 11px 'Inter',sans-serif;color:rgba(0,0,0,.7);background:#F3F1EB;border-radius:6px;padding:5px 10px",
                      )}
                    >
                      <span style={sx("color:rgba(0,0,0,.42)")}>{c.k}</span>{" "}
                      {c.v}
                    </span>
                  ))}
                </div>
                <div
                  style={sx(
                    "margin-top:18px;font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(0,0,0,.45);margin-bottom:10px",
                  )}
                >
                  История примерок
                </div>
                <div
                  style={sx(
                    "background:#F7F5F0;border-radius:9px;padding:14px 12px;font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.5)",
                  )}
                >
                  {uDet.tryons > 0
                    ? `${uDet.tryons} примерок · превью появятся с кэшем генераций`
                    : "Примерок ещё нет."}
                </div>
              </>
            )}

            {/* consents / biometry — реальное удаление */}
            <div
              style={sx(
                "margin-top:20px;background:#F7F5F0;border-radius:12px;padding:14px 16px",
              )}
            >
              <div
                style={sx(
                  "font:600 12.5px 'Inter',sans-serif;margin-bottom:10px",
                )}
              >
                Данные и согласия · 152-ФЗ
              </div>
              <div
                className="mono"
                style={sx(
                  "font:400 11.5px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.6);display:flex;flex-direction:column;gap:5px",
                )}
              >
                <span>Согласия — в разделе «Согласия и биометрия».</span>
              </div>
              {bioIsDeleted ? (
                <div
                  style={sx(
                    "margin-top:12px;font:500 11.5px 'Inter',sans-serif;color:#166B47;background:#E9F5EE;border-radius:8px;padding:9px 12px",
                  )}
                >
                  Биометрия удалена · запись в журнале
                </div>
              ) : (
                <div style={sx("display:flex;gap:7px;margin-top:12px")}>
                  <span
                    className="ac-btn"
                    onClick={() => userId && void exportUser(userId)}
                    style={sx(
                      "font:600 11.5px 'Inter',sans-serif;padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.16);background:#fff;cursor:pointer",
                    )}
                  >
                    Выгрузить данные
                  </span>
                  <span
                    className="ac-btn"
                    onClick={onDeleteBio}
                    style={sx(
                      "font:600 11.5px 'Inter',sans-serif;padding:8px 12px;border-radius:8px;background:#FBEEEC;color:#B5372A;border:1px solid rgba(192,57,43,.3)",
                    )}
                  >
                    Удалить биометрию
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
