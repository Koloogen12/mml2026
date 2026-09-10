import { useEffect } from "react";
import { sx } from "../sx";
import { useAdmin } from "../store";

/*
 * A7 · Воронка. Порт эталона 1:1 — честная структура измерения.
 * Правило честности: has_data=false → скелет с прочерками «—» и честным
 * сообщением (ровно как в эталоне, без демо-цифр/прогнозов). has_data=true →
 * реальные числа этапов (сплошная рамка + чернильный счётчик вместо прочерка).
 * FUNNEL-этапы приходят из GET /funnel (6 этапов вейтлист → покупка).
 */

// подстраховка порядка/подписей, если бэк отдал пусто
const FALLBACK = [
  { key: "waitlist", label: "Вейтлист" },
  { key: "dialog", label: "Диалог" },
  { key: "selection", label: "Подборка" },
  { key: "tryon", label: "Примерка" },
  { key: "clicked", label: "Переход в магазин" },
  { key: "purchased", label: "Покупка" },
];

export function Funnel() {
  const funnel = useAdmin((s) => s.funnel);
  const hasData = useAdmin((s) => s.funnelHasData);
  const loadFunnel = useAdmin((s) => s.loadFunnel);

  useEffect(() => {
    void loadFunnel();
  }, [loadFunnel]);

  const stages = funnel.length ? funnel : FALLBACK.map((f) => ({ ...f, count: 0 }));

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
          Воронка
        </h1>
        <span
          style={sx("font:400 12px 'Inter',sans-serif;color:rgba(0,0,0,.45)")}
        >
          честная структура измерения — без демо-цифр и прогнозов
        </span>
      </div>
      <div style={sx("flex:1;overflow-y:auto;padding:28px 24px 40px")}>
        <div
          style={sx("display:grid;grid-template-columns:repeat(6,1fr);gap:12px")}
        >
          {stages.map((st, i) => (
            <div
              key={st.key}
              style={sx(
                `background:#fff;border:1px ${hasData ? "solid rgba(0,0,0,.1)" : "dashed rgba(0,0,0,.2)"};border-radius:12px;padding:18px 14px;text-align:center`,
              )}
            >
              <div
                className="mono"
                style={sx(
                  "font:600 10px 'IBM Plex Mono',monospace;color:rgba(0,0,0,.35)",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                style={sx(
                  "font:500 12.5px 'Inter',sans-serif;margin-top:8px",
                )}
              >
                {st.label}
              </div>
              <div
                className="mono"
                style={sx(
                  `font:600 26px 'IBM Plex Mono',monospace;color:${hasData ? "#16150F" : "rgba(0,0,0,.22)"};margin-top:12px`,
                )}
              >
                {hasData ? st.count : "—"}
              </div>
            </div>
          ))}
        </div>
        <div
          style={sx(
            "margin-top:16px;background:#F3F1EB;border-radius:10px;padding:14px 18px;font:400 12.5px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.6)",
          )}
        >
          {hasData ? (
            <>
              Числа обновляются по мере{" "}
              <span style={sx("color:#16150F;font-weight:500")}>
                переходов в магазины и подтверждённых покупок
              </span>
              . Атрибуция — на нашей стороне: по подписанному click-id, без
              доверия к аналитике партнёра.
            </>
          ) : (
            <>
              Этапы и конверсии между ними появятся здесь,{" "}
              <span style={sx("color:#16150F;font-weight:500")}>
                когда пойдут первые переходы в магазины
              </span>
              . Мы намеренно не показываем демо-цифры, примеры графиков и прогнозы
              — пустая воронка честнее выдуманной.
            </>
          )}
        </div>

        <div style={sx("margin-top:24px;max-width:720px")}>
          <div
            style={sx("font:600 14px 'Inter',sans-serif;margin-bottom:12px")}
          >
            Как это считается
          </div>
          <div style={sx("display:flex;flex-direction:column;gap:10px")}>
            <div
              style={sx(
                "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:11px;padding:14px 16px",
              )}
            >
              <div
                style={sx(
                  "font:500 12.5px 'Inter',sans-serif;margin-bottom:3px",
                )}
              >
                Переход в магазин
              </div>
              <div
                style={sx(
                  "font:400 12px/1.55 'Inter',sans-serif;color:rgba(0,0,0,.6)",
                )}
              >
                Фиксируется по подписанному идентификатору клика (click-id),
                который мы добавляем в исходящую ссылку партнёра. Атрибуция — на
                нашей стороне, без доверия к аналитике партнёра.
              </div>
            </div>
            <div
              style={sx(
                "background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:11px;padding:14px 16px",
              )}
            >
              <div
                style={sx(
                  "font:500 12.5px 'Inter',sans-serif;margin-bottom:3px",
                )}
              >
                Покупка
              </div>
              <div
                style={sx(
                  "font:400 12px/1.55 'Inter',sans-serif;color:rgba(0,0,0,.6)",
                )}
              >
                Подтверждается вручную оператором в Столе стилиста (кнопка «Купил»
                с суммой) либо постбэком партнёра по click-id. Сверка выплат —
                фаза 2.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
