import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useAdmin } from "../store";
import { ago } from "../shared";

/*
 * A8 · Флаги и лимиты. Порт эталона 1:1. Всё на реальных данных GET /flags + /audit.
 * tryon_enabled — реальный kill-switch (PUT /flags/tryon_enabled).
 * Лимиты gen_limit_per_hour / gen_limit_per_user — реальные, PUT на blur.
 * llm_provider — реальный переключатель (proxy / local), PUT /flags/llm_provider.
 * Строки «Партнёр Lamoda — пауза» и «Приём в вейтлист» из эталона в API Ф1 не
 * представлены отдельными флагами → локальные тумблеры-заглушки, TODO(Ф7).
 * Журнал действий — реальный аудит (actor · action · target).
 */

export function Flags() {
  const flags = useAdmin((s) => s.flags);
  const audit = useAdmin((s) => s.audit);
  const loadFlags = useAdmin((s) => s.loadFlags);
  const loadAudit = useAdmin((s) => s.loadAudit);
  const setFlag = useAdmin((s) => s.setFlag);

  const [limHour, setLimHour] = useState("");
  const [limUser, setLimUser] = useState("");

  useEffect(() => {
    void loadFlags();
    void loadAudit();
  }, [loadFlags, loadAudit]);

  useEffect(() => {
    setLimHour(flags.gen_limit_per_hour ?? "");
    setLimUser(flags.gen_limit_per_user ?? "");
  }, [flags.gen_limit_per_hour, flags.gen_limit_per_user]);

  const tryonOn = flags.tryon_enabled === "true";
  const provider = flags.llm_provider ?? "proxy";

  // Только реальные флаги с бэкенда. Фейковые тумблеры (Lamoda-пауза, вейтлист)
  // убраны — они меняли лишь локальный стейт и вводили оператора в заблуждение.
  const toggleRows = [
    {
      k: "tryon_enabled",
      label: "Примерка (глобально)",
      desc: "Мгновенно выключает генерацию примерок во всём продукте.",
      on: tryonOn,
      toggle: () => void setFlag("tryon_enabled", tryonOn ? "false" : "true"),
    },
  ];

  const providers = [
    { k: "proxy", l: "Прокси" },
    { k: "local", l: "Локальный fallback" },
  ];

  const commitLimit = (key: string, val: string, current: string) => {
    const v = val.trim();
    if (v && v !== current) void setFlag(key, v);
  };

  return (
    <div
      className="ac-fade"
      style={sx("display:flex;flex-direction:column;height:100vh")}
    >
      <div
        style={sx(
          "flex:none;display:flex;align-items:center;gap:11px;padding:16px 24px;background:#fff;border-bottom:1px solid rgba(0,0,0,.08)",
        )}
      >
        <h1
          style={sx(
            "margin:0;font:600 18px 'Inter',sans-serif;letter-spacing:-.01em",
          )}
        >
          Флаги и лимиты
        </h1>
        <span
          style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}
        >
          kill-switch · каждое действие пишется в журнал
        </span>
      </div>
      <div style={sx("flex:1;overflow-y:auto;padding:22px 24px 40px")}>
        <div
          style={sx(
            "display:grid;grid-template-columns:1.3fr 1fr;gap:20px;align-items:start",
          )}
        >
          <div style={sx("display:flex;flex-direction:column;gap:14px")}>
            {/* kill switches */}
            <div
              style={sx(
                "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:6px 20px",
              )}
            >
              {toggleRows.map((f, i) => (
                <div
                  key={f.k}
                  style={sx(
                    `display:flex;align-items:center;justify-content:space-between;padding:15px 0;border-bottom:1px solid ${i < toggleRows.length - 1 ? "rgba(0,0,0,.06)" : "transparent"}`,
                  )}
                >
                  <div style={sx("min-width:0;padding-right:14px")}>
                    <div style={sx("font:500 13px 'Inter',sans-serif")}>
                      {f.label}
                    </div>
                    <div
                      style={sx(
                        "font:400 11.5px/1.4 'Inter',sans-serif;color:rgba(0,0,0,.5);margin-top:2px",
                      )}
                    >
                      {f.desc}
                    </div>
                  </div>
                  <span
                    className="ac-btn"
                    onClick={f.toggle}
                    style={sx(
                      `width:44px;height:25px;border-radius:999px;background:${f.on ? "#1F8A5B" : "rgba(0,0,0,.18)"};position:relative;flex:none;transition:background .18s`,
                    )}
                  >
                    <span
                      style={sx(
                        `position:absolute;top:3px;left:${f.on ? "22px" : "3px"};width:19px;height:19px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .18s`,
                      )}
                    />
                  </span>
                </div>
              ))}
            </div>

            {/* limits */}
            <div
              style={sx(
                "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:18px 20px",
              )}
            >
              <div
                style={sx(
                  "font:600 13px 'Inter',sans-serif;margin-bottom:14px",
                )}
              >
                Лимиты генераций
              </div>
              <div style={sx("display:flex;gap:16px")}>
                <div style={sx("flex:1")}>
                  <div
                    style={sx(
                      "font:400 11.5px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin-bottom:6px",
                    )}
                  >
                    В час (глобально)
                  </div>
                  <input
                    className="ac-in mono"
                    value={limHour}
                    onChange={(e) => setLimHour(e.target.value)}
                    onBlur={() =>
                      commitLimit(
                        "gen_limit_per_hour",
                        limHour,
                        flags.gen_limit_per_hour ?? "",
                      )
                    }
                    style={sx("font-family:'IBM Plex Mono',monospace")}
                  />
                </div>
                <div style={sx("flex:1")}>
                  <div
                    style={sx(
                      "font:400 11.5px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin-bottom:6px",
                    )}
                  >
                    На пользователя / день
                  </div>
                  <input
                    className="ac-in mono"
                    value={limUser}
                    onChange={(e) => setLimUser(e.target.value)}
                    onBlur={() =>
                      commitLimit(
                        "gen_limit_per_user",
                        limUser,
                        flags.gen_limit_per_user ?? "",
                      )
                    }
                    style={sx("font-family:'IBM Plex Mono',monospace")}
                  />
                </div>
              </div>
            </div>

            {/* llm provider */}
            <div
              style={sx(
                "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:18px 20px",
              )}
            >
              <div
                style={sx(
                  "font:600 13px 'Inter',sans-serif;margin-bottom:14px",
                )}
              >
                LLM-провайдер
              </div>
              <div
                style={sx(
                  "display:inline-flex;background:#F0F0F0;border-radius:999px;padding:3px",
                )}
              >
                {providers.map((p) => {
                  const on = provider === p.k;
                  return (
                    <span
                      key={p.k}
                      className="ac-btn"
                      onClick={() => void setFlag("llm_provider", p.k)}
                      style={sx(
                        `padding:8px 18px;border-radius:999px;font:500 12.5px 'Inter',sans-serif;background:${on ? "#16150F" : "transparent"};color:${on ? "#fff" : "rgba(0,0,0,.55)"}`,
                      )}
                    >
                      {p.l}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* audit log — реальный журнал */}
          <div
            style={sx(
              "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;overflow:hidden",
            )}
          >
            <div
              style={sx(
                "padding:14px 18px;border-bottom:1px solid rgba(0,0,0,.08);font:600 13px 'Inter',sans-serif",
              )}
            >
              Журнал действий
            </div>
            {audit.length === 0 ? (
              <div
                style={sx(
                  "padding:24px 18px;font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)",
                )}
              >
                Пока пусто — действия появятся здесь.
              </div>
            ) : (
              audit.map((a, i) => (
                <div
                  key={i}
                  style={sx(
                    "padding:13px 18px;border-bottom:1px solid rgba(0,0,0,.05)",
                  )}
                >
                  <div style={sx("font:500 12px 'Inter',sans-serif")}>
                    {describeAudit(a.action, a.target, a.detail)}
                  </div>
                  <div
                    className="mono"
                    style={sx(
                      "font:400 10.5px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.45);margin-top:3px",
                    )}
                  >
                    {a.actor} · {ago(a.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// человекочитаемая строка аудита
function describeAudit(action: string, target: string, detail: unknown): string {
  const d = (detail ?? {}) as Record<string, unknown>;
  switch (action) {
    case "set_flag":
      return `Флаг «${target}» → ${String(d.value ?? "")}`;
    case "mark_lead":
      return `Лид ${target.slice(0, 8)} → ${String(d.status ?? "")}`;
    case "delete_biometric":
      return `Удаление биометрии ${target.slice(0, 8)}`;
    default:
      return `${action} · ${target.slice(0, 8)}`;
  }
}
