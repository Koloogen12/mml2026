import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useAdmin } from "../store";
import { rubFromFloat } from "../shared";

// Реальная пара из ленты разметки (GET /label-queue).
interface LabelProd { id: string; name: string; brand: string; price: number | null; image_url: string; zone: string }
interface LabelPair {
  message_id: number; session_id: string; user_id?: string; user_email?: string;
  query: string; answer: string; product_ids: string[]; products: LabelProd[]; created_at: string;
}

/*
 * A1 · Разметка (gold-set). Порт эталона 1:1.
 * Реальные данные: прогресс GET /labels/stats (labeled/target); экспорт —
 * ссылка на GET /labels/export (JSONL, скачивает оператор); «Сохранить и дальше»
 * → POST /labels (оценки -1|0|1), после чего прогресс перезагружается.
 * Пара «запрос → выдача» — РЕАЛЬНАЯ: лента GET /label-queue (ответы ассистента
 * с товарами + предшествующий запрос человека). Оценка пишется с привязкой к
 * message_id / session_id / user_id — gold-set больше не засоряется демо-парой.
 * Чипы «состояние» — превью (разметка / нечего / всё размечено / спорный).
 */

type RS = "work" | "empty" | "done" | "dispute";
const STATES: { k: RS; l: string }[] = [
  { k: "work", l: "Разметка" },
  { k: "empty", l: "Нечего размечать" },
  { k: "done", l: "Всё размечено" },
  { k: "dispute", l: "Спорный" },
];
const FILTERS = [
  { k: "unlabeled", l: "Неразмеченные" },
  { k: "all", l: "Все" },
];
// критерий → поле Label
const CRIT = [
  { k: "pick", key: "1", l: "релевантность", field: "relevance" },
  { k: "order", key: "2", l: "порядок", field: "order_ok" },
  { k: "occ", key: "3", l: "повод", field: "occasion" },
  { k: "fit", key: "4", l: "палитра/размер", field: "palette_size" },
  { k: "note", key: "5", l: "заметка", field: "note_quality" },
] as const;

const API = "/api/v1/admin";

export function Rate() {
  const labeled = useAdmin((s) => s.labeled);
  const target = useAdmin((s) => s.labelTarget);
  const loadLabelStats = useAdmin((s) => s.loadLabelStats);
  const adminFetch = useAdmin((s) => s.adminFetch);

  const [rst, setRst] = useState<RS>("work");
  const [filter, setFilter] = useState("unlabeled");
  const [queue, setQueue] = useState<LabelPair[]>([]);
  const [idx, setIdx] = useState(0);
  const pair: LabelPair | undefined = queue[idx];

  // Лента реальных пар; «Неразмеченные» → unlabeled=1, «Все» → 0.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await adminFetch(`${API}/label-queue?unlabeled=${filter === "unlabeled" ? 1 : 0}`);
        if (!res.ok) return;
        const data = (await res.json()) as { items: LabelPair[] | null };
        if (!alive) return;
        setQueue(data.items ?? []);
        setIdx(0);
      } catch {
        /* оффлайн — честно покажем пустую ленту */
      }
    })();
    return () => { alive = false; };
  }, [filter, adminFetch]);
  const [rc, setRc] = useState<Record<string, "up" | "down">>({});
  const [why, setWhy] = useState("");

  useEffect(() => {
    void loadLabelStats();
  }, [loadLabelStats]);

  const rateWork = rst === "work" || rst === "dispute";
  const rateEmpty = rst === "empty" || rst === "done";
  const ratePct =
    rst === "done"
      ? "100%"
      : Math.min(100, Math.round((labeled / Math.max(1, target)) * 100)) + "%";
  const rateProgress =
    rst === "done" ? `${target}/${target}` : `${labeled}/${target}`;

  const saveNext = async () => {
    if (!pair) return;
    const body: Record<string, unknown> = {
      rater: "operator",
      message_id: pair.message_id,
      session_id: pair.session_id,
      user_id: pair.user_id || undefined,
    };
    for (const c of CRIT) {
      const v = rc[c.k];
      body[c.field] = v === "up" ? 1 : v === "down" ? -1 : 0;
    }
    if (why.trim()) body.why = why.trim();
    try {
      const res = await adminFetch(`${API}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setRc({});
        setWhy("");
        void loadLabelStats();
        setIdx((i) => i + 1); // следующая пара из ленты
      }
    } catch {
      /* noop — оффлайн */
    }
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
            Разметка
          </h1>
          <span
            style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}
          >
            операционка → актив: gold-set для реранкера
          </span>
        </div>
        <div style={sx("display:flex;align-items:center;gap:14px")}>
          <div style={sx("display:flex;align-items:center;gap:9px")}>
            <div
              style={sx(
                "width:120px;height:6px;border-radius:999px;background:#EEEBE4;overflow:hidden",
              )}
            >
              <div
                style={sx(
                  `height:100%;width:${ratePct};background:#2436D8;border-radius:999px`,
                )}
              />
            </div>
            <span
              className="mono"
              style={sx("font:600 12px 'IBM Plex Mono',monospace")}
            >
              {rateProgress}
            </span>
          </div>
          <a
            href={`${API}/labels/export`}
            className="ac-btn"
            style={sx(
              "font:600 12px 'Inter',sans-serif;padding:8px 14px;border-radius:8px;border:1px solid rgba(0,0,0,.18);background:#fff;display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:#16150F",
            )}
          >
            <span
              dangerouslySetInnerHTML={{
                __html:
                  '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#16150F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1v8M4 6l3 3 3-3M2 12h10"></path></svg>',
              }}
            />
            Экспорт gold-set (JSONL)
          </a>
        </div>
      </div>

      {/* filters + state switch */}
      <div
        style={sx(
          "flex:none;display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:#fff;border-bottom:1px solid rgba(0,0,0,.06)",
        )}
      >
        <div style={sx("display:flex;gap:6px")}>
          {FILTERS.map((f) => {
            const on = filter === f.k;
            return (
              <span
                key={f.k}
                className="ac-btn"
                onClick={() => setFilter(f.k)}
                style={sx(
                  `font:500 11.5px 'Inter',sans-serif;padding:5px 11px;border-radius:7px;background:${on ? "#16150F" : "#F3F1EB"};color:${on ? "#fff" : "rgba(0,0,0,.6)"};border:1px solid ${on ? "#16150F" : "transparent"}`,
                )}
              >
                {f.l}
              </span>
            );
          })}
        </div>
        <div style={sx("display:flex;align-items:center;gap:6px")}>
          <span
            style={sx(
              "font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(0,0,0,.4);margin-right:2px",
            )}
          >
            состояние
          </span>
          {STATES.map((t) => {
            const on = rst === t.k;
            return (
              <span
                key={t.k}
                className="ac-btn"
                onClick={() => setRst(t.k)}
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

      {rateEmpty && (
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
              {rst === "done" ? "Всё размечено" : "Нечего размечать"}
            </div>
            <div
              style={sx(
                "font:400 13.5px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.55);margin-top:8px",
              )}
            >
              {rst === "done"
                ? "Целевые 300 пар размечены. Экспортируйте gold-set в JSONL для обучения реранкера."
                : "Новые пары «запрос → выдача» появятся здесь после диалогов в Столе стилиста."}
            </div>
          </div>
        </div>
      )}

      {rateWork && (
        <div
          style={sx(
            "flex:1;overflow-y:auto;padding:22px 24px 40px;background:#F7F5F0",
          )}
        >
          {rst === "dispute" && (
            <div
              style={sx(
                "margin-bottom:14px;display:flex;align-items:center;gap:10px;background:#FCF3E2;border:1px solid rgba(201,122,22,.35);border-radius:10px;padding:11px 15px",
              )}
            >
              <span
                style={sx("color:#B5751A")}
                dangerouslySetInnerHTML={{
                  __html:
                    '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"></circle><path d="M8 5v3.5M8 11h.01" stroke-linecap="round"></path></svg>',
                }}
              />
              <span style={sx("font:500 12.5px 'Inter',sans-serif;color:#8A5A12")}>
                Спорный пример: два разметчика разошлись в оценке порядка. Нужен
                третий голос.
              </span>
            </div>
          )}

          {/* пара «запрос → выдача» — демо эталона, TODO(Ф7) */}
          <div
            style={sx(
              "display:grid;grid-template-columns:1fr 1.4fr;gap:20px;align-items:start",
            )}
          >
            <div
              style={sx(
                "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:18px 20px",
              )}
            >
              <div
                style={sx(
                  "font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(0,0,0,.45)",
                )}
              >
                Запрос покупателя
              </div>
              <div
                style={sx(
                  "font:400 20px/1.3 'Spectral',Georgia,serif;margin:8px 0 16px",
                )}
              >
                {pair?.query ? `«${pair.query}»` : "— (запрос не сохранился)"}
              </div>
              <div
                style={sx(
                  "font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(0,0,0,.45);margin-bottom:10px",
                )}
              >
                Кто спрашивал
              </div>
              <div style={sx("display:flex;flex-wrap:wrap;gap:6px")}>
                <span style={sx("font:500 11px 'Inter',sans-serif;color:rgba(0,0,0,.7);background:#F3F1EB;border-radius:6px;padding:5px 10px")}>
                  <span style={sx("color:rgba(0,0,0,.42)")}>Человек</span> {pair?.user_email || "гость"}
                </span>
                <span className="mono" style={sx("font:500 11px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.7);background:#F3F1EB;border-radius:6px;padding:5px 10px")}>
                  <span style={sx("color:rgba(0,0,0,.42)")}>msg</span> {pair?.message_id ?? "—"}
                </span>
              </div>
            </div>

            <div
              style={sx(
                "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:18px 20px",
              )}
            >
              <div
                style={sx(
                  "font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(0,0,0,.45);margin-bottom:12px",
                )}
              >
                Что показал ИИ · в этом порядке
              </div>
              <div
                style={sx(
                  "display:grid;grid-template-columns:repeat(5,1fr);gap:10px",
                )}
              >
                {(pair?.products ?? []).map((p, i) => (
                  <div key={p.id} style={sx("position:relative")}>
                    <div
                      className="ac-thumb"
                      style={sx(
                        `height:120px;border-radius:9px;background-image:url('${p.image_url}')`,
                      )}
                    />
                    <span
                      className="mono"
                      style={sx(
                        "position:absolute;top:6px;left:6px;font:600 10px 'IBM Plex Mono',monospace;background:rgba(22,21,15,.85);color:#fff;border-radius:5px;padding:2px 6px",
                      )}
                    >
                      {i + 1}
                    </span>
                    <div
                      className="mono"
                      style={sx(
                        "font:600 10px 'IBM Plex Mono',monospace;margin-top:6px",
                      )}
                    >
                      {rubFromFloat(p.price)}
                    </div>
                    <div
                      style={sx(
                        "font:400 10px 'Inter',sans-serif;color:rgba(0,0,0,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
                      )}
                    >
                      {p.brand}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={sx(
                  "margin-top:14px;font:400 12.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.65);background:#F7F5F0;border-radius:9px;padding:11px 13px",
                )}
              >
                <span style={sx("font-weight:600;color:#16150F")}>
                  Заметка стилиста ИИ:
                </span>{" "}
                {pair?.answer ? `«${pair.answer}»` : "—"}
              </div>
            </div>
          </div>

          {/* RATING RAIL — реальный POST /labels */}
          <div
            style={sx(
              "margin-top:20px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:16px 20px",
            )}
          >
            <div
              style={sx(
                "display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px",
              )}
            >
              <span style={sx("font:600 13px 'Inter',sans-serif")}>Оценка</span>
              <span
                style={sx(
                  "font:400 11px 'Inter',sans-serif;color:rgba(0,0,0,.45)",
                )}
              >
                быстрые клавиши: 1–5 · ↑ 👍 · ↓ 👎 · Enter — дальше
              </span>
            </div>
            <div
              style={sx(
                "display:flex;flex-wrap:wrap;gap:22px;align-items:center",
              )}
            >
              {CRIT.map((r) => {
                const v = rc[r.k];
                return (
                  <div
                    key={r.k}
                    style={sx("display:flex;align-items:center;gap:8px")}
                  >
                    <span
                      className="mono"
                      style={sx(
                        "font:600 10px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.35)",
                      )}
                    >
                      {r.key}
                    </span>
                    <span
                      style={sx(
                        "font:500 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.7)",
                      )}
                    >
                      {r.l}
                    </span>
                    <span
                      className="ac-btn"
                      onClick={() => setRc((s) => ({ ...s, [r.k]: "up" }))}
                      style={sx(
                        `width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:${v === "up" ? "#E9F5EE" : "#fff"};border:1px solid ${v === "up" ? "#1F8A5B" : "rgba(0,0,0,.14)"}`,
                      )}
                      dangerouslySetInnerHTML={{
                        __html: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="${v === "up" ? "#1F8A5B" : "rgba(0,0,0,.5)"}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5l2-4c.9 0 1.5.6 1.5 1.5V5h3c.7 0 1.2.6 1 1.3l-1 4c-.1.6-.6 1-1.2 1H4M4 6.5V12M4 6.5H2.5v5.5H4"></path></svg>`,
                      }}
                    />
                    <span
                      className="ac-btn"
                      onClick={() => setRc((s) => ({ ...s, [r.k]: "down" }))}
                      style={sx(
                        `width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:${v === "down" ? "#FBEEEC" : "#fff"};border:1px solid ${v === "down" ? "#C0392B" : "rgba(0,0,0,.14)"}`,
                      )}
                      dangerouslySetInnerHTML={{
                        __html: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="${v === "down" ? "#C0392B" : "rgba(0,0,0,.5)"}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 7.5l-2 4c-.9 0-1.5-.6-1.5-1.5V9h-3c-.7 0-1.2-.6-1-1.3l1-4C3.6 3.1 4.1 2.7 4.7 2.7H10M10 7.5V2M10 7.5h1.5V2H10"></path></svg>`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              style={sx(
                "display:flex;align-items:center;gap:12px;margin-top:16px",
              )}
            >
              <input
                className="ac-in"
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Комментарий (попадёт в gold-set)…"
                style={sx("flex:1;font-size:12.5px")}
              />
              <span
                className="ac-btn"
                onClick={saveNext}
                style={sx(
                  "font:600 12.5px 'Inter',sans-serif;padding:10px 20px;border-radius:9px;background:#16150F;color:#fff;white-space:nowrap;flex:none",
                )}
              >
                Сохранить и дальше →
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
