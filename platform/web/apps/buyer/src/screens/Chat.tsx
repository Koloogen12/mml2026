import { useEffect, useRef, useState } from "react";
import type { MMLProduct } from "@mml/ui";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { useChat, type ChatMessage } from "../store";
import { imgOf, priceOf, openTryon } from "../product-utils";
import { ProductCardDp } from "../components/ProductCardDp";

// Скелетон карточки выдачи — 1:1 из макета (стриминг)
function SkelCard({ w }: { w: string }) {
  return (
    <div style={sx("background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;overflow:hidden")}>
      <div className="dp-skel" style={sx("height:280px")}></div>
      <div style={sx("padding:14px;display:flex;flex-direction:column;gap:8px")}>
        <span className="dp-skel" style={sx("width:60px;height:8px;border-radius:4px")}></span>
        <span className="dp-skel" style={sx(`width:${w};height:12px;border-radius:4px`)}></span>
        <span className="dp-skel" style={sx("width:64px;height:12px;border-radius:4px")}></span>
      </div>
    </div>
  );
}

function HeroPick({ p, count }: { p: MMLProduct; count: number }) {
  const app = useApp();
  return (
    <>
      <div className="dp-fade" style={sx("font:500 12px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#2B2BCC")}>
        Выбор стилиста · 1 из {count}
      </div>
      <div className="dp-fade dp-hero-pick" style={sx("background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:16px;overflow:hidden")}>
        <div className="dp-hero-pick-img" onClick={() => app.openProduct(p)} style={sx("cursor:pointer;position:relative;background:#F4F1EA;overflow:hidden")}>
          <div style={sx(`position:absolute;inset:0;background-image:url('${imgOf(p)}');background-size:cover;background-position:center`)}></div>
        </div>
        <div className="dp-hero-pick-body" style={sx("display:flex;flex-direction:column;gap:14px")}>
          <div style={sx("display:flex;justify-content:space-between;align-items:flex-start;gap:20px")}>
            <div style={sx("min-width:0")}>
              <div style={sx("font:500 11px 'Inter',sans-serif;letter-spacing:.14em;color:rgba(0,0,0,.62);padding-bottom:6px")}>{p.brand.name}</div>
              <div className="dp-hero-pick-name" style={sx("font:400 26px 'Spectral',Georgia,serif")}>{p.name}</div>
            </div>
            <div style={sx("font:500 20px 'Inter',monospace;white-space:nowrap")}>{priceOf(p)}</div>
          </div>
          <div className="dp-hero-actions">
            <span className="dp-btn" onClick={() => openTryon(p)} style={sx("background:#2B2BCC;color:#fff;border-radius:9px;padding:15px 28px;font:500 15px 'Inter',sans-serif;display:flex;align-items:center;gap:9px")}>
              <svg width="16" height="16" viewBox="0 0 13 13" fill="none" stroke="#fff" strokeWidth="1.4"><path d="M6.5 1l1.2 2.9L11 5.1 8.7 7.3l.6 3.2-2.8-1.6-2.8 1.6.6-3.2L2 5.1l3.3-1.2z"></path></svg>Примерить на себе
            </span>
            <span className="dp-btn" onClick={() => app.goRedirect(p)} style={sx("border:1px solid rgba(0,0,0,.2);border-radius:9px;padding:15px 28px;font:500 15px 'Inter',sans-serif")}>Купить</span>
          </div>
        </div>
      </div>
    </>
  );
}

function AssistantBlock({ m, isLive }: { m: ChatMessage; isLive: boolean }) {
  const products = m.products ?? [];
  const rest = products.slice(1);
  return (
    <>
      {isLive && !products.length ? (
        <>
          <div style={sx("font:400 16px/1.6 'Inter',sans-serif;max-width:600px")}>
            {m.text}
            <span style={sx("display:inline-block;width:8px;height:16px;background:#2B2BCC;margin-left:2px;vertical-align:text-bottom;animation:dpBlink 1s step-end infinite")}></span>
          </div>
          <div className="dp-r3" style={sx("display:grid;grid-template-columns:repeat(3,1fr);gap:18px")}>
            <SkelCard w="90%" />
            <SkelCard w="80%" />
            <SkelCard w="85%" />
          </div>
        </>
      ) : (
        <>
          {m.text && <div className="dp-fade" style={sx("font:400 16px/1.6 'Inter',sans-serif;max-width:620px")}>{m.text}</div>}
          {products.length > 0 && (
            <>
              <HeroPick p={products[0]} count={products.length} />
              {rest.length > 0 && (
                <>
                  <div className="dp-fade" style={sx("display:flex;justify-content:space-between;align-items:baseline;margin-top:8px")}>
                    <span style={sx("font:500 12px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(0,0,0,.5)")}>Ещё {rest.length} вариантов</span>
                  </div>
                  <div className="dp-fade dp-r3" style={sx("display:grid;grid-template-columns:repeat(3,1fr);gap:20px")}>
                    {rest.map((p) => (
                      <ProductCardDp key={p.id} p={p} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

export function Chat() {
  const app = useApp();
  const { messages, status, send } = useChat();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const last = messages[messages.length - 1];
  const showResults = status === "idle" && last?.role === "assistant" && !!last.products?.length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, status]);

  const submit = () => {
    const q = input.trim();
    if (!q || status === "streaming") return;
    setInput("");
    void send(q);
  };

  const qa = (q: string) => {
    if (status === "streaming") return;
    void send(q);
  };

  return (
    <>
      <div className="dp-fade dp-chat-scroll" style={sx("max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:26px")}>
        {messages.length === 0 && (
          <div style={sx("font:400 16px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.45);max-width:600px")}>
            Опишите, что ищете, — соберу варианты по 400+ магазинам.
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={m.id} style={sx("align-self:flex-end;max-width:520px;background:#000;color:#F4F1EA;border-radius:16px 16px 5px 16px;padding:14px 20px;font:400 16px/1.5 'Inter',sans-serif")}>
              {m.text}
            </div>
          ) : (
            <AssistantBlock key={m.id} m={m} isLive={status === "streaming" && i === messages.length - 1} />
          ),
        )}
        <div ref={endRef}></div>
      </div>

      {/* sticky chat composer + quick actions */}
      <div className="dp-chat-composer" style={sx("position:fixed;left:50%;transform:translateX(-50%);bottom:24px;width:100%;max-width:820px;z-index:30")}>
        {showResults && (
          <div style={sx("display:flex;gap:9px;justify-content:center;padding-bottom:12px;flex-wrap:wrap")}>
            <span className="dp-chip" onClick={() => qa("Покажи ещё варианты")} style={sx("font:400 13.5px 'Inter',sans-serif;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:9px 15px;background:#fff")}>Показать ещё</span>
            <span className="dp-chip" onClick={() => qa("То же, но дешевле")} style={sx("font:400 13.5px 'Inter',sans-serif;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:9px 15px;background:#fff")}>Дешевле</span>
            <span className="dp-chip" onClick={() => qa("Такое же в другом цвете")} style={sx("font:400 13.5px 'Inter',sans-serif;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:9px 15px;background:#fff")}>Другой цвет</span>
            <span className="dp-chip" onClick={() => qa("Такое же, но с рукавами")} style={sx("font:400 13.5px 'Inter',sans-serif;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:9px 15px;background:#fff")}>С рукавами</span>
          </div>
        )}
        <div style={sx("background:#fff;border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:12px 10px 12px 24px;display:flex;align-items:center;gap:16px;box-shadow:0 8px 30px rgba(0,0,0,.12)")}>
          <input
            className="dp-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ответить или уточнить…"
          />
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="rgba(0,0,0,.5)" strokeWidth="1.4" onClick={() => app.showToast("Загрузка фото появится вместе с релизом примерки")} style={sx("cursor:pointer")}><rect x="2" y="3.5" width="16" height="13" rx="2"></rect><circle cx="7" cy="8" r="1.6"></circle><path d="M3 15l4.5-4 3.5 3 3-2.5L18 15"></path></svg>
          <div className="dp-btn" onClick={submit} style={sx("width:36px;height:36px;border-radius:50%;background:#2B2BCC;display:flex;align-items:center;justify-content:center")}>
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12V2M3 6l4-4 4 4"></path></svg>
          </div>
        </div>
      </div>
    </>
  );
}
