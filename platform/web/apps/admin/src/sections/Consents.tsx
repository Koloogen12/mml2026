import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useAdmin } from "../store";
import { shortDate } from "../shared";

/*
 * A6 · Согласия и биометрия (152-ФЗ). Порт эталона 1:1.
 * Таблица согласий — реальный GET /consents (email, kind, version, ip, дата).
 * Правило честности: счётчики удалений считаются из реальных записей
 * (kind='biometric_deleted' = исполнено); «запросов» и «среднее время» нет в
 * API Ф1 → честный прочерк, а не выдуманное число.
 * Удаление биометрии — DELETE /users/{id}/biometric — вынесено в раздел
 * «Пользователи» (карточка человека), как единая точка действия.
 * Чипы «состояние» — превью баннеров (удаление выполнено / не удалось).
 */

type CS = "ok" | "deleted" | "failed";
const STATES: { k: CS; l: string }[] = [
  { k: "ok", l: "Журнал" },
  { k: "deleted", l: "Удаление выполнено" },
  { k: "failed", l: "Удаление не удалось" },
];
const GRID = "1.1fr 1.1fr .7fr .8fr .9fr .8fr";

const KIND_LABEL: Record<string, string> = {
  biometric_required: "Биометрическое",
  biometric_deleted: "Биометрия удалена",
  photo_storage: "Хранение фото",
  privacy_policy: "Политика конфиденц.",
};

export function Consents() {
  const consents = useAdmin((s) => s.consents);
  const loadConsents = useAdmin((s) => s.loadConsents);
  const [cst, setCst] = useState<CS>("ok");

  useEffect(() => {
    void loadConsents();
  }, [loadConsents]);

  const executed = consents.filter((c) => c.kind === "biometric_deleted").length;

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
            Согласия и биометрия
          </h1>
          <span
            style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}
          >
            152-ФЗ · юридическая обязанность, не фича
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
            const on = cst === t.k;
            return (
              <span
                key={t.k}
                className="ac-btn"
                onClick={() => setCst(t.k)}
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
        {/* deletion counters — реальные там, где есть данные */}
        <div
          style={sx(
            "display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px",
          )}
        >
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
              Запросов на удаление
            </div>
            <div
              className="mono"
              style={sx(
                "font:600 28px 'IBM Plex Mono',monospace;margin-top:6px;color:rgba(0,0,0,.22)",
              )}
            >
              —
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
              Исполнено
            </div>
            <div
              className="mono"
              style={sx(
                "font:600 28px 'IBM Plex Mono',monospace;margin-top:6px;color:#1F8A5B",
              )}
            >
              {executed}
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
              Среднее время исполнения
            </div>
            <div
              className="mono"
              style={sx(
                "font:600 28px 'IBM Plex Mono',monospace;margin-top:6px;color:rgba(0,0,0,.22)",
              )}
            >
              —
            </div>
          </div>
        </div>

        {cst === "deleted" && (
          <div
            style={sx(
              "margin-bottom:16px;display:flex;align-items:center;gap:10px;background:#E9F5EE;border:1px solid rgba(31,138,91,.3);border-radius:10px;padding:12px 15px",
            )}
          >
            <span
              style={sx("color:#166B47")}
              dangerouslySetInnerHTML={{
                __html:
                  '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5L6.5 12 13 4"></path></svg>',
              }}
            />
            <span style={sx("font:500 12.5px 'Inter',sans-serif;color:#166B47")}>
              Удаление биометрии выполнено · запись добавлена в журнал, копии из
              бэкапов вычищены.
            </span>
          </div>
        )}
        {cst === "failed" && (
          <div
            style={sx(
              "margin-bottom:16px;background:#FBEEEC;border:1px solid rgba(192,57,43,.3);border-radius:10px;padding:12px 15px",
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
              Удаление не завершено
            </div>
            <div
              style={sx(
                "font:400 12px/1.55 'Inter',sans-serif;color:#8A3529;margin-top:6px",
              )}
            >
              Данные удалены из основной базы, но остались в снапшоте примерок S3.
              Требуется ручная очистка — задача заведена.
            </div>
          </div>
        )}

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
            <span>Пользователь</span>
            <span>Тип согласия</span>
            <span>Версия</span>
            <span>Дата</span>
            <span>IP</span>
            <span />
          </div>
          {consents.length === 0 ? (
            <div
              style={sx(
                "padding:40px 18px;text-align:center;font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.45)",
              )}
            >
              Согласий пока нет.
            </div>
          ) : (
            consents.map((c, i) => (
              <div
                key={i}
                className="ac-row"
                style={sx(
                  `display:grid;grid-template-columns:${GRID};gap:12px;padding:12px 18px;border-bottom:1px solid rgba(0,0,0,.05);align-items:center`,
                )}
              >
                <span style={sx("font:500 12.5px 'Inter',sans-serif")}>
                  {c.email}
                </span>
                <span
                  style={sx(
                    "font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.7)",
                  )}
                >
                  {KIND_LABEL[c.kind] ?? c.kind}
                </span>
                <span
                  className="mono"
                  style={sx(
                    "font:500 11.5px 'IBM Plex Mono',monospace;color:#2436D8",
                  )}
                >
                  {c.version || "—"}
                </span>
                <span
                  className="mono"
                  style={sx(
                    "font:400 11.5px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.55)",
                  )}
                >
                  {shortDate(c.created_at)}
                </span>
                <span
                  className="mono"
                  style={sx(
                    "font:400 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.45)",
                  )}
                >
                  {c.ip || "—"}
                </span>
                <span style={sx("text-align:right")}>
                  <a
                    className="ac-btn"
                    href="https://makemelook.ai/legal/privacy.html"
                    target="_blank"
                    rel="noopener"
                    style={sx("font:500 11px 'Inter',sans-serif;color:#2436D8;text-decoration:none")}
                  >
                    текст {c.version || ""}
                  </a>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
