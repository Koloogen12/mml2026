import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useAdmin } from "../store";
import {
  STATUS_COLOR,
  STATUS_LABEL,
  ZONE_LABEL,
  rubFromFloat,
  initial,
  ago,
} from "../shared";

/*
 * A0 · Стол стилиста — герой админки. Порт эталона 1:1.
 * Реальные данные: очередь (GET /queue), диалог выбранного (GET /users/{id}/dialog),
 * пометки «перешёл в магазин» / «купил» (POST /users/{id}/mark).
 * «Состояние» (чипы в шапке) — прототип-переключатель визуальных состояний
 * (загрузка ИИ / подбор пуст / примерка / не отвечает / очередь пуста) — часть
 * пиксель-спеки эталона; в Ф1 у них нет API-сигнала, TODO(Ф7).
 * Паспорт стиля, подбор ИИ, тред-заглушка — демо эталона (нет источника), TODO(Ф7).
 */

type Desk =
  | "ready"
  | "loading"
  | "nomatch"
  | "tryon"
  | "tryonfail"
  | "noreply"
  | "empty";

// фильтры эталона → реальные статусы лида
const FILTERS = [
  { k: "all", l: "Все", statuses: null as string[] | null },
  { k: "dialog", l: "В диалоге", statuses: ["in_dialog", "dialog", "new"] },
  { k: "sent", l: "Отправлено", statuses: ["sent_selection", "sent"] },
  { k: "bought", l: "Купили", statuses: ["purchased", "bought"] },
];

const DESK_STATES: { k: Desk; l: string }[] = [
  { k: "ready", l: "Рабочее" },
  { k: "loading", l: "ИИ подбирает" },
  { k: "nomatch", l: "Подбор пуст" },
  { k: "tryon", l: "Примерка" },
  { k: "tryonfail", l: "Примерка ✗" },
  { k: "noreply", l: "Не отвечает" },
  { k: "empty", l: "Очередь пуста" },
];

export function Desk() {
  const queue = useAdmin((s) => s.queue);
  const dialog = useAdmin((s) => s.dialog);
  const loadDialog = useAdmin((s) => s.loadDialog);
  const passport = useAdmin((s) => s.deskPassport);
  const passportLoaded = useAdmin((s) => s.deskPassportLoaded);
  const loadDeskPassport = useAdmin((s) => s.loadDeskPassport);
  const markLead = useAdmin((s) => s.markLead);

  const [desk, setDesk] = useState<Desk>("ready");
  const [filter, setFilter] = useState("all");
  const [personId, setPersonId] = useState<string | null>(null);
  const [boughtOpen, setBoughtOpen] = useState(false);
  const [soldSum, setSoldSum] = useState("");
  const [tryon, setTryon] = useState<"idle" | "gen" | "fail">("idle");

  const activeFilter = FILTERS.find((f) => f.k === filter)!;
  const filtered = queue.filter((p) =>
    activeFilter.statuses ? activeFilter.statuses.includes(p.status) : true,
  );
  const queueEmpty = desk === "empty" || filtered.length === 0;

  // автовыбор первого в очереди
  useEffect(() => {
    if (!queueEmpty && !filtered.some((p) => p.id === personId)) {
      setPersonId(filtered[0]?.id ?? null);
    }
  }, [filtered, personId, queueEmpty]);

  useEffect(() => {
    if (personId) {
      void loadDialog(personId);
      void loadDeskPassport(personId);
    }
  }, [personId, loadDialog, loadDeskPassport]);

  // паспорт стиля выбранного человека → чипы (реальные значения, пустые поля скрыты)
  const passportChips: { k: string; v: string }[] = [];
  if (passport) {
    const fw = passport.for_whom;
    if (fw === "female" || fw === "women")
      passportChips.push({ k: "Кому", v: "женское" });
    else if (fw === "male" || fw === "men")
      passportChips.push({ k: "Кому", v: "мужское" });
    else if (fw) passportChips.push({ k: "Кому", v: fw });
    if (passport.persona?.length)
      passportChips.push({ k: "Персона", v: passport.persona.join(", ") });
    if (passport.self_described?.length)
      passportChips.push({ k: "О себе", v: passport.self_described.join(", ") });
    if (passport.aspirational?.length)
      passportChips.push({ k: "Ориентир", v: passport.aspirational.join(", ") });
    if (passport.mood) passportChips.push({ k: "Настроение", v: passport.mood });
    if (passport.brands_love?.length)
      passportChips.push({ k: "Любит", v: passport.brands_love.join(", ") });
    if (passport.brands_avoid?.length)
      passportChips.push({ k: "Не носит", v: passport.brands_avoid.join(", ") });
    for (const [zone, val] of Object.entries(passport.size_by_category ?? {})) {
      if (val)
        passportChips.push({ k: `Размер · ${ZONE_LABEL[zone] ?? zone}`, v: val });
    }
    for (const [zone, val] of Object.entries(
      passport.budget_by_category ?? {},
    )) {
      if (val != null)
        passportChips.push({
          k: `Бюджет · ${ZONE_LABEL[zone] ?? zone}`,
          v: rubFromFloat(val),
        });
    }
  }
  const passportEmpty = passportLoaded && passportChips.length === 0;

  const person = queue.find((p) => p.id === personId) ?? filtered[0];
  const noSelection = queueEmpty || !person;
  const hasDialog = !noSelection;

  const personName = person?.display_name || person?.contact || "—";
  const personPhone = person?.contact || "—";
  const personSrc = person?.source || "—";

  // реальный тред если есть, иначе демо-заглушка эталона (TODO(Ф7))
  // Пустой диалог показываем пустым. Раньше подставлялись DEMO_MESSAGES —
  // оператор читал выдуманную переписку как реальную переписку этого человека.
  const messages = dialog.map((m) => ({
    text: m.content,
    who: m.role === "assistant" || m.role === "operator" ? "me" : "them",
  }));

  const noReply = desk === "noreply";
  const tryonGen = desk === "tryon" || tryon === "gen";
  const tryonFail = desk === "tryonfail" || tryon === "fail";
  const panelIdle = !(
    desk === "tryon" ||
    desk === "tryonfail" ||
    tryon === "gen" ||
    tryon === "fail"
  );


  const confirmBought = async () => {
    if (person) {
      const digits = soldSum.replace(/\D/g, "");
      const kop = digits ? parseInt(digits, 10) * 100 : undefined;
      await markLead(person.id, "purchased", kop);
    }
    setBoughtOpen(false);
  };
  const markStore = () => {
    if (person) void markLead(person.id, "clicked");
  };

  return (
    <div
      className="ac-fade"
      style={sx("display:flex;flex-direction:column;height:100vh")}
    >
      {/* header */}
      <div
        style={sx(
          "flex:none;display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:#fff;border-bottom:1px solid rgba(0,0,0,.08)",
        )}
      >
        <div style={sx("display:flex;align-items:center;gap:11px")}>
          <span
            style={sx("color:#E0A21E")}
            dangerouslySetInnerHTML={{
              __html:
                '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1l2.5 5.5L18 7l-4.2 4 1 6L10 14l-4.8 3 1-6L2 7l5.5-.5z"></path></svg>',
            }}
          />
          <h1
            style={sx(
              "margin:0;font:600 18px 'Inter',sans-serif;letter-spacing:-.01em",
            )}
          >
            Стол стилиста
          </h1>
          <span
            style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}
          >
            концьерж-консоль · ручной прогон допущения
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
          {DESK_STATES.map((d) => {
            const on = desk === d.k;
            return (
              <span
                key={d.k}
                className="ac-btn"
                onClick={() => {
                  setDesk(d.k);
                  setTryon("idle");
                  setBoughtOpen(false);
                }}
                style={sx(
                  `font:500 11px 'Inter',sans-serif;padding:5px 10px;border-radius:7px;background:${on ? "#2436D8" : "#fff"};color:${on ? "#fff" : "rgba(0,0,0,.6)"};border:1px solid ${on ? "#2436D8" : "rgba(0,0,0,.14)"}`,
                )}
              >
                {d.l}
              </span>
            );
          })}
        </div>
      </div>

      {/* three columns */}
      <div style={sx("flex:1;display:flex;min-height:0;overflow-x:auto")}>
        {/* LEFT · queue */}
        <div
          style={sx(
            "width:296px;flex:none;border-right:1px solid rgba(0,0,0,.08);background:#fff;display:flex;flex-direction:column;min-height:0",
          )}
        >
          <div style={sx("flex:none;padding:14px 16px 10px")}>
            <div
              style={sx(
                "display:flex;align-items:baseline;justify-content:space-between",
              )}
            >
              <span style={sx("font:600 13px 'Inter',sans-serif")}>Очередь</span>
              <span
                className="mono"
                style={sx(
                  "font:500 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.45)",
                )}
              >
                {(queueEmpty ? 0 : filtered.length) + " в работе"}
              </span>
            </div>
            <div
              style={sx(
                "display:flex;gap:5px;flex-wrap:wrap;margin-top:10px",
              )}
            >
              {FILTERS.map((f) => {
                const on = filter === f.k;
                return (
                  <span
                    key={f.k}
                    className="ac-btn"
                    onClick={() => setFilter(f.k)}
                    style={sx(
                      `font:500 11px 'Inter',sans-serif;padding:4px 9px;border-radius:6px;background:${on ? "#16150F" : "#F3F1EB"};color:${on ? "#fff" : "rgba(0,0,0,.6)"};border:1px solid ${on ? "#16150F" : "transparent"}`,
                    )}
                  >
                    {f.l}
                  </span>
                );
              })}
            </div>
          </div>
          <div style={sx("flex:1;overflow-y:auto;padding:0 10px 12px")}>
            {queueEmpty && (
              <div
                style={sx(
                  "text-align:center;padding:56px 20px;color:rgba(0,0,0,.4)",
                )}
              >
                <div
                  style={sx(
                    "font:500 13px 'Inter',sans-serif;color:rgba(0,0,0,.6)",
                  )}
                >
                  В очереди пусто
                </div>
                <div
                  style={sx(
                    "font:400 12px/1.5 'Inter',sans-serif;margin-top:6px",
                  )}
                >
                  Новые заявки из вейтлиста появятся здесь автоматически.
                </div>
              </div>
            )}
            {!queueEmpty &&
              filtered.map((p) => {
                const sel = p.id === personId;
                const col = STATUS_COLOR[p.status] ?? "#8A8A82";
                return (
                  <div
                    key={p.id}
                    className="ac-row"
                    onClick={() => setPersonId(p.id)}
                    style={sx(
                      `border:1px solid ${sel ? "#2436D8" : "rgba(0,0,0,.1)"};background:${sel ? "#F4F3FE" : "#fff"};border-radius:10px;padding:11px 12px;margin-top:8px`,
                    )}
                  >
                    <div
                      style={sx(
                        "display:flex;align-items:center;justify-content:space-between;gap:8px",
                      )}
                    >
                      <span
                        style={sx(
                          "font:600 13px 'Inter',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
                        )}
                      >
                        {p.display_name || p.contact}
                      </span>
                      <span
                        className="mono"
                        style={sx(
                          "font:400 10.5px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.4);flex:none",
                        )}
                      >
                        {ago(p.last_action_at)}
                      </span>
                    </div>
                    <div
                      className="mono"
                      style={sx(
                        "font:400 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.5);margin-top:2px",
                      )}
                    >
                      {p.contact} · {p.source || "—"}
                    </div>
                    <div
                      style={sx(
                        "display:flex;align-items:center;gap:6px;margin-top:8px",
                      )}
                    >
                      <span className="ac-dot" style={sx(`background:${col}`)} />
                      <span
                        style={sx(
                          `font:500 11px 'Inter',sans-serif;color:${col}`,
                        )}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* CENTER · dialog */}
        <div
          style={sx(
            "flex:1;min-width:400px;display:flex;flex-direction:column;background:#F7F5F0",
          )}
        >
          {noSelection && (
            <div
              style={sx(
                "flex:1;display:flex;align-items:center;justify-content:center;text-align:center;color:rgba(0,0,0,.4);padding:40px",
              )}
            >
              <div>
                <div
                  style={sx(
                    "font:400 22px 'Spectral',Georgia,serif;color:rgba(0,0,0,.55)",
                  )}
                >
                  Выберите человека из очереди
                </div>
                <div
                  style={sx("font:400 13px 'Inter',sans-serif;margin-top:8px")}
                >
                  Диалог и паспорт стиля откроются здесь.
                </div>
              </div>
            </div>
          )}

          {hasDialog && (
            <>
              {/* passport header */}
              <div
                style={sx(
                  "flex:none;background:#fff;border-bottom:1px solid rgba(0,0,0,.08);padding:14px 22px",
                )}
              >
                <div
                  style={sx(
                    "display:flex;align-items:center;justify-content:space-between",
                  )}
                >
                  <div
                    style={sx("display:flex;align-items:center;gap:12px")}
                  >
                    <span
                      style={sx(
                        "width:38px;height:38px;border-radius:50%;background:#16150F;color:#fff;display:flex;align-items:center;justify-content:center;font:500 15px 'Spectral',Georgia,serif;flex:none",
                      )}
                    >
                      {initial(personName)}
                    </span>
                    <div>
                      <div style={sx("font:600 15px 'Inter',sans-serif")}>
                        {personName}
                      </div>
                      <div
                        className="mono"
                        style={sx(
                          "font:400 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.5)",
                        )}
                      >
                        {personPhone} · {personSrc}
                      </div>
                    </div>
                  </div>
                  <div style={sx("display:flex;gap:7px")}>
                    <span
                      className="ac-btn"
                      onClick={markStore}
                      style={sx(
                        "font:500 12px 'Inter',sans-serif;padding:7px 13px;border-radius:8px;border:1px solid rgba(0,0,0,.18);background:#fff;color:#16150F",
                      )}
                    >
                      Отметить «перешёл в магазин»
                    </span>
                    <span
                      className="ac-btn"
                      onClick={() => setBoughtOpen((v) => !v)}
                      style={sx(
                        "font:500 12px 'Inter',sans-serif;padding:7px 13px;border-radius:8px;background:#1F8A5B;color:#fff;display:inline-flex;align-items:center;gap:6px",
                      )}
                    >
                      <span
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7.5L5.5 11 12 3"></path></svg>',
                        }}
                      />
                      Купил
                    </span>
                  </div>
                </div>
                {/* passport chips — реальный паспорт стиля (GET /users/{id}/passport) */}
                <div
                  style={sx(
                    "display:flex;flex-wrap:wrap;gap:6px;margin-top:12px",
                  )}
                >
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
                  {passportEmpty && (
                    <span
                      style={sx(
                        "font:400 11px 'Inter',sans-serif;color:rgba(0,0,0,.42)",
                      )}
                    >
                      Паспорт стиля не заполнен
                    </span>
                  )}
                </div>
              </div>

              {/* purchase banner */}
              {boughtOpen && (
                <div
                  style={sx(
                    "flex:none;background:#E9F5EE;border-bottom:1px solid rgba(31,138,91,.25);padding:12px 22px;display:flex;align-items:center;gap:12px",
                  )}
                >
                  <span
                    style={sx(
                      "font:600 12.5px 'Inter',sans-serif;color:#166B47",
                    )}
                  >
                    Зафиксировать покупку — это и есть замеряемая метрика теста
                  </span>
                  <div
                    style={sx(
                      "display:flex;align-items:center;gap:6px;margin-left:auto",
                    )}
                  >
                    <span
                      className="mono"
                      style={sx(
                        "font:500 13px 'IBM Plex Mono',monospace;color:#166B47",
                      )}
                    >
                      ₽
                    </span>
                    <input
                      className="ac-in"
                      value={soldSum}
                      onChange={(e) => setSoldSum(e.target.value)}
                      placeholder="12 990"
                      style={sx("width:110px;border-color:rgba(31,138,91,.4)")}
                    />
                    <span
                      className="ac-btn"
                      onClick={confirmBought}
                      style={sx(
                        "font:600 12px 'Inter',sans-serif;padding:8px 14px;border-radius:8px;background:#1F8A5B;color:#fff",
                      )}
                    >
                      Подтвердить
                    </span>
                  </div>
                </div>
              )}

              {/* no-reply banner */}
              {noReply && (
                <div
                  style={sx(
                    "flex:none;background:#FCF3E2;border-bottom:1px solid rgba(201,122,22,.3);padding:11px 22px;display:flex;align-items:center;gap:10px",
                  )}
                >
                  <span
                    style={sx("color:#B5751A")}
                    dangerouslySetInnerHTML={{
                      __html:
                        '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 5v3.5M8 11h.01" stroke-linecap="round"></path></svg>',
                    }}
                  />
                  <span
                    style={sx(
                      "font:500 12.5px 'Inter',sans-serif;color:#8A5A12",
                    )}
                  >
                    Человек не отвечает 2 дня. Авто-дрип сам пришлёт ему свежую
                    подборку — вручную дотягиваться не нужно.
                  </span>
                </div>
              )}

              {/* thread */}
              <div
                style={sx(
                  "flex:1;overflow-y:auto;padding:22px 22px 8px;display:flex;flex-direction:column;gap:14px",
                )}
              >
                {messages.length === 0 && (
                  <div style={sx("margin:auto;text-align:center;font:400 13.5px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}>
                    Диалога пока нет — этот человек ещё не писал ассистенту.
                  </div>
                )}
                {messages.map((m, i) => {
                  const me = m.who === "me";
                  return (
                    <div
                      key={i}
                      style={sx(
                        `align-self:${me ? "flex-end" : "flex-start"};max-width:70%;background:${me ? "#16150F" : "#fff"};color:${me ? "#F4F1EA" : "#16150F"};border-radius:${me ? "14px 14px 4px 14px" : "14px 14px 14px 4px"};padding:11px 15px;font:400 13.5px/1.5 'Inter',sans-serif`,
                      )}
                    >
                      {m.text}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* RIGHT · work panel */}
        <div
          style={sx(
            "width:328px;flex:none;border-left:1px solid rgba(0,0,0,.08);background:#fff;display:flex;flex-direction:column;min-height:0",
          )}
        >
          <div
            style={sx(
              "flex:none;padding:14px 16px 10px;border-bottom:1px solid rgba(0,0,0,.06)",
            )}
          >
            <span style={sx("font:600 13px 'Inter',sans-serif")}>
              Рабочая панель
            </span>
          </div>
          <div style={sx("flex:1;overflow-y:auto;padding:14px 16px")}>
            {/* try-on generating */}
            {tryonGen && (
              <div
                style={sx(
                  "margin-top:14px;border:1px solid rgba(36,54,216,.25);border-radius:12px;padding:14px;text-align:center",
                )}
              >
                <div
                  style={sx(
                    "height:150px;border-radius:8px;background:#EEF0FB;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden",
                  )}
                >
                  <span className="ac-spin" />
                  <div
                    style={sx(
                      "position:absolute;left:0;right:0;top:44%;height:2px;background:rgba(36,54,216,.6);box-shadow:0 0 12px rgba(36,54,216,.5)",
                    )}
                  />
                </div>
                <div
                  style={sx(
                    "font:500 12px 'Inter',sans-serif;color:#2436D8;margin-top:10px",
                  )}
                >
                  Генерируем примерку · Pro · ~8 сек
                </div>
              </div>
            )}

            {/* try-on failed */}
            {tryonFail && (
              <div
                style={sx(
                  "margin-top:14px;border:1px solid rgba(192,57,43,.3);border-radius:12px;padding:14px;background:#FBEEEC",
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
                  Примерка не удалась
                </div>
                <div
                  style={sx(
                    "font:400 12px/1.55 'Inter',sans-serif;color:#8A3529;margin:6px 0 10px",
                  )}
                >
                  Причина: фото пользователя низкого разрешения (640×480). Нужна
                  фотография в полный рост от 1024px.
                </div>
                <span
                  className="ac-btn"
                  onClick={() => setTryon("gen")}
                  style={sx(
                    "font:600 12px 'Inter',sans-serif;padding:8px 13px;border-radius:8px;background:#B5372A;color:#fff;display:inline-block",
                  )}
                >
                  Повторить
                </span>
              </div>
            )}

            {/* product card (default) — демо-товар панели, TODO(Ф7) */}
            {/* Панель «подборка» убрана: она показывала ВЫДУМАННЫЙ товар
                (12 STOREEZ, «Платье-комбинация из льна», 12 990 ₽) рядом с
                реальным диалогом живого человека — оператор читал это как
                предложение системы. Стол — это ops: мониторинг, лиды,
                разметка; курации здесь нет. */}
            {panelIdle && (
              <div style={sx("margin-top:14px;padding:26px 18px;border:1px dashed rgba(0,0,0,.16);border-radius:12px;text-align:center;font:400 12.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.45)")}>
                Подборку собирает ассистент в чате — здесь она не дублируется.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
