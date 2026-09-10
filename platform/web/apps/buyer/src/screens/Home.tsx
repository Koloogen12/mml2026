import { useEffect, useMemo, useRef, useState } from "react";
import { sx } from "../sx";
import { useApp } from "../appStore";
import type { HomeTrend } from "../appStore";
import { things } from "../plural";
import { ProfileGaps } from "../components/ProfileGaps";
import { useAuth } from "../authStore";
import { imgOf, priceOf } from "../product-utils";
import { ProductCardDp } from "../components/ProductCardDp";
import { FeatureShowcase } from "../components/FeatureShowcase";

// Подзаголовки приветствия — по времени суток + общий пул. Выбираем один раз за
// заход (useMemo), чтобы не мигал на каждый рендер.
const GREET_LINES: Record<"night" | "morning" | "day" | "evening", string[]> = {
  morning: [
    "Что примеряем сегодня?",
    "Соберём образ к утреннему кофе",
    "Витрины 400+ магазинов уже открыты",
    "Начнём с главного: что надеть?",
  ],
  day: [
    "Одна фраза — и лента ваша",
    "Ваш стилист на связи",
    "Стиль — это про вас, а не про тренды",
    "Опишите повод — соберём образ",
  ],
  evening: [
    "Спокойный вечер для нового образа",
    "Присмотримся к чему-то на выход?",
    "Немного вдохновения перед сном",
    "Соберём образ на завтра заранее",
  ],
  night: [
    "Не спится? Самое время для шопинга",
    "Тихий час для больших идей в гардеробе",
    "Ночная витрина открыта",
  ],
};
function pickGreetLine(): string {
  const h = new Date().getHours();
  const bucket = h < 5 ? "night" : h < 12 ? "morning" : h < 18 ? "day" : "evening";
  const pool = GREET_LINES[bucket];
  return pool[Math.floor(Math.random() * pool.length)];
}







// печатающийся плейсхолдер — логика typeLoop() макета 1:1
function useTypewriter(idle: boolean, phrases: string[]) {
  const [typed, setTyped] = useState("");
  const ref = useRef({ typed: "", deleting: false, idx: 0 });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      if (idle) {
        timer = setTimeout(loop, 500);
        return;
      }
      const st = ref.current;
      // Фразы приезжают с сервера (правятся в админке), а анимация стартует
      // сразу — до ответа массив пуст, и phrases[0].length роняло ВСЮ главную
      // в белый экран. Гонка: успел контент — работало, не успел — падало.
      if (!phrases.length) {
        timer = setTimeout(loop, 300);
        return;
      }
      // Контент мог смениться (переключение пола) и стать короче — индекс
      // из прошлого набора вышел бы за границы.
      const full = phrases[st.idx % phrases.length];
      let delay: number;
      if (!st.deleting) {
        if (st.typed.length < full.length) {
          st.typed = full.slice(0, st.typed.length + 1);
          delay = 42 + Math.random() * 45;
        } else {
          delay = 1900;
          st.deleting = true;
        }
      } else {
        if (st.typed.length > 0) {
          st.typed = full.slice(0, st.typed.length - 1);
          delay = 26;
        } else {
          delay = 260;
          st.deleting = false;
          st.idx = (st.idx + 1) % phrases.length;
        }
      }
      setTyped(st.typed);
      timer = setTimeout(loop, delay);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [idle, phrases]);
  return typed;
}

// Магазины — реальные бренды из каталога (выводятся в компоненте).
// Выдуманных промо «до −40%» нет: скидок в каталоге сейчас 0.
const monoOf = (name: string) =>
  (name.replace(/[^A-Za-zА-Яа-я0-9]/g, "").slice(0, 2) || "•").toUpperCase();

// «Популярные запросы» — свои под каждый пол + реальные бренды каталога.
// TODO(CMS): переедет в админку (контент главной редактирует Данил).
const TREND_BG = ["#D8D3CB", "#DAD5C8", "#E0DACE"];
// Плитки трендов: первая — по реальному бренду каталога, дальше — из админки.
function buildTrending(brands: string[], trends: HomeTrend[]) {
  const out: Array<{ tag: string; title: string; bg: string; q: string; image: string }> = [];
  brands.slice(0, 1).forEach((b) =>
    out.push({ tag: "ПО БРЕНДУ", title: `Покажи всё из ${b}`, bg: TREND_BG[0], q: `Покажи всё из ${b}`, image: "" }),
  );
  trends.forEach((t) => out.push({ ...t, bg: TREND_BG[out.length % 3] }));
  return out;
}

const arrowW = (w = 15) => (
  <svg width={w} height={w} viewBox="0 0 15 15" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7.5h10M8 3.5l4 4-4 4"></path></svg>
);
const arrowB = (w = 14) => (
  <svg width={w} height={w} viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7.5h10M8 3.5l4 4-4 4"></path></svg>
);

export function Home() {
  const app = useApp();
  const greetName = useAuth((s) => s.onboardingName);
  const greetLine = useMemo(() => pickGreetLine(), []);
  const catalog = app.catalog;
  const core = catalog.slice(0, 6);
  const [refineTab, setRefineTab] = useState(0);
  // Фразы — под выбранный пол (ассортимент разный).
  // Весь редактируемый контент главной — с сервера (правится в админке).
  const content = app.homeContent;
  const SUGGESTIONS = content?.queries[app.gender] ?? [];
  // Магазины — реальные бренды из каталога (не выдуманные витрины).
  const merchants = Array.from(new Set(catalog.map((p) => p.brand.slug))).map((slug) => {
    const name = catalog.find((p) => p.brand.slug === slug)!.brand.name;
    return { slug, name, mono: monoOf(name), count: catalog.filter((p) => p.brand.slug === slug).length };
  });
  // Табы уточнения — только зоны, которые реально есть в текущем каталоге.
  const refineZones = (content?.refine_tabs ?? []).filter((z) => catalog.some((p) => p.garment_zone === z.zone));
  const TRENDING = buildTrending(merchants.map((m) => m.name), content?.trending[app.gender] ?? []);
  const heroTrend = catalog[0]; // герой-тренд — реальный товар, не плейсхолдер
  const activeZone = refineZones[refineTab]?.zone;
  const merchRef = useRef<HTMLDivElement>(null);

  const placeholders = content?.placeholders[app.gender] ?? [];
  const typed = useTypewriter(app.homeInput.length > 0 || app.listening, placeholders);

  const submit = () => {
    const st = useApp.getState();
    const q = st.homeInput.trim() || placeholders[0];
    app.runSearch(q);
  };

  const continueRow = core.filter((p) => !app.dismissed.includes(p.id)).slice(0, 4);
  // Карусель уточнения: товары выбранной зоны (таб реально фильтрует).
  const refineItems = activeZone ? catalog.filter((p) => p.garment_zone === activeZone) : catalog;
  const refineCore = refineItems.slice(0, 6);
  const marquee = refineCore.concat(refineCore); // бесшовный цикл -50%

  return (
    <div className="dp-fade">
      {/* ===== HERO ===== */}
      <div style={sx("position:relative;overflow:hidden")}>
        <div className="dp-irid" style={sx("position:absolute;top:90px;left:50%;transform:translateX(-50%);width:1080px;height:600px;opacity:.5;filter:blur(60px);-webkit-mask:radial-gradient(ellipse 46% 46% at 50% 48%,#000 20%,transparent 68%);mask:radial-gradient(ellipse 46% 46% at 50% 48%,#000 20%,transparent 68%);pointer-events:none;z-index:0")}></div>
        <div style={sx("position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:60px 40px 40px")}>
          {!app.loggedIn && (
            <h1 className="dp-f62" style={sx("font:400 62px/1.1 'Spectral',Georgia,serif;text-align:center;letter-spacing:-.02em;margin:0 0 28px;text-wrap:balance")}>
              Покупайте в 400+ магазинах<br />моды через <span className="dp-irid-text" style={sx("font-style:italic")}>один чат</span>.
            </h1>
          )}
          {app.loggedIn && (() => {
            // Приветствие по времени суток + имя (если знаем) + случайная фраза.
            const h = new Date().getHours();
            const g = h < 5 ? ["Доброй", "ночи"] : h < 12 ? ["Доброе", "утро"] : h < 18 ? ["Добрый", "день"] : ["Добрый", "вечер"];
            const nm = greetName.trim();
            return (
              <>
                <h1 style={sx("font:400 56px/1.1 'Spectral',Georgia,serif;text-align:center;letter-spacing:-.02em;margin:0 0 8px")}>
                  {/* Градиентом выделяем ИМЯ человека, а не время суток:
                      акцент на нём, а не на том, что сейчас вечер. */}
                  {g[0]} {g[1]}{nm ? <>, <span className="dp-grad-text">{nm}</span></> : ""}.
                </h1>
                <p style={sx("text-align:center;font:400 15px 'Inter',sans-serif;color:rgba(0,0,0,.5);margin:0 0 26px")}>{greetLine}</p>
              </>
            );
          })()}

          {!app.loggedIn && (
            <div style={sx("display:flex;justify-content:center;margin-bottom:24px")}>
              <div style={sx("display:flex;background:rgba(0,0,0,.05);border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:4px")}>
                <span onClick={() => app.setGender("women")} className="dp-btn" style={sx(`font:400 14px 'Inter',sans-serif;letter-spacing:.02em;padding:8px 22px;border-radius:999px;background:${app.gender === "women" ? "#000" : "transparent"};color:${app.gender === "women" ? "#fff" : "rgba(0,0,0,.55)"};transition:all .2s`)}>Женское</span>
                <span onClick={() => app.setGender("men")} className="dp-btn" style={sx(`font:400 14px 'Inter',sans-serif;letter-spacing:.02em;padding:8px 22px;border-radius:999px;background:${app.gender === "men" ? "#000" : "transparent"};color:${app.gender === "men" ? "#fff" : "rgba(0,0,0,.55)"};transition:all .2s`)}>Мужское</span>
              </div>
            </div>
          )}

          <div style={sx("max-width:720px;margin:0 auto;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:18px;box-shadow:0 10px 44px rgba(43,43,204,.1),0 2px 14px rgba(0,0,0,.06);padding:24px 24px 16px")}>
            <input
              className="dp-hero-input"
              value={app.homeInput}
              onChange={(e) => useApp.setState({ homeInput: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={typed + "▏"}
              style={sx("width:100%;border:none;outline:none;background:transparent;min-height:44px;font:400 21px 'Spectral',Georgia,serif;color:#000")}
            />
            <div style={sx("display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid rgba(0,0,0,.07)")}>
              <div style={sx("display:flex;gap:14px;align-items:center;padding-top:8px")}>
                <span className="dp-btn dp-hov-dim" onClick={() => app.showToast("Загрузка фото появится вместе с релизом примерки")} title="Загрузить фото" style={sx("width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,.55)")}>
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3.5" width="16" height="13" rx="2"></rect><circle cx="7" cy="8" r="1.6"></circle><path d="M3 15l4.5-4 3.5 3 3-2.5L18 15"></path></svg>
                </span>
                <span className="dp-btn" onClick={() => app.toggleVoice()} title="Голосовой ввод" style={sx(`width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:${app.listening ? "#fff" : "rgba(0,0,0,.55)"};background:${app.listening ? "#2B2BCC" : "transparent"}`)}>
                  <svg width="20" height="20" viewBox="0 0 18 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="6" y="2" width="6" height="10" rx="3"></rect><path d="M3 9.5a6 6 0 0 0 12 0M9 15.5v2.5"></path></svg>
                </span>
                {app.listening && (
                  <span style={sx("display:flex;align-items:center;gap:8px;font:400 14px 'Inter',sans-serif;color:#2B2BCC")}>
                    <span style={sx("width:8px;height:8px;border-radius:50%;background:#2B2BCC;animation:dpPulse 1s infinite")}></span>Слушаю…
                  </span>
                )}
              </div>
              <div className="dp-btn" onClick={submit} style={sx(`margin-top:8px;width:40px;height:40px;border-radius:50%;background:${app.homeInput.trim() ? "#2B2BCC" : "rgba(43,43,204,.45)"};display:flex;align-items:center;justify-content:center`)}>
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12V2M3 6l4-4 4 4"></path></svg>
              </div>
            </div>
          </div>

          <div style={sx("display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:720px;margin:22px auto 0")}>
            {SUGGESTIONS.map((s) => (
              <span key={s.label} className="dp-chip" onClick={() => app.runSearch(s.q)} style={sx("font:400 14px 'Inter',sans-serif;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:11px 18px;background:#fff")}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Добор паспорта: карточка показывается, только пока этих данных нет. */}
      {app.loggedIn && (
        <div style={sx("max-width:1200px;margin:0 auto;padding:12px 40px 4px")}>
          <ProfileGaps />
        </div>
      )}

      {/* ===== AUTHED: merchants + continue ===== */}
      {app.loggedIn && (
        <div style={sx("max-width:1200px;margin:0 auto;padding:8px 40px 20px")}>
          <div style={sx("font:500 18px 'Inter',sans-serif")}>Рекомендованные продавцы</div>
          <div style={sx("font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.5);margin:2px 0 16px")}>Откройте витрину — там весь их каталог</div>
          <div style={sx("position:relative")}>
            <div ref={merchRef} className="dp-merch-scroll ml-hidescroll" style={sx("display:flex;gap:14px;overflow-x:auto;padding:6px 44px 10px 2px;scroll-behavior:smooth")}>
              {merchants.map((m) => (
                <div
                  key={m.slug}
                  className="dp-merch"
                  onClick={() => app.openBrand({ slug: m.slug, name: m.name })}
                  style={sx("cursor:pointer;flex:none;width:230px;display:flex;align-items:center;gap:14px;border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:14px 16px;background:#fff;transition:border-color .15s,box-shadow .15s")}
                >
                  <span style={sx("width:48px;height:48px;border-radius:10px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font:600 15px 'Spectral',Georgia,serif;flex:none")}>{m.mono}</span>
                  <div style={sx("min-width:0")}>
                    <div style={sx("font:600 12px 'Inter',sans-serif;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{m.name}</div>
                    <div style={sx("font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.5);padding-top:3px")}>{m.count} {things(m.count)}</div>
                  </div>
                </div>
              ))}
            </div>
            <span className="dp-btn" onClick={() => merchRef.current?.scrollBy({ left: 260, behavior: "smooth" })} style={sx("position:absolute;right:0;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:#fff;border:1px solid rgba(0,0,0,.14);box-shadow:0 4px 14px rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#000" strokeWidth="1.6" strokeLinecap="round"><path d="M6 3l5 5-5 5"></path></svg>
            </span>
          </div>
          <div style={sx("display:flex;align-items:baseline;justify-content:space-between;margin:32px 0 4px")}>
            <div style={sx("font:500 18px 'Inter',sans-serif")}>Ещё для вас</div>
            <span className="dp-btn" onClick={() => app.go("chat")} style={sx("font:500 12px 'Inter',sans-serif;letter-spacing:.1em;color:rgba(0,0,0,.55)")}>ВСЕ →</span>
          </div>
          <div style={sx("font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.5);margin-bottom:16px")}>Продолжите с того места, где остановились</div>
          <div className="dp-r4" style={sx("display:grid;grid-template-columns:repeat(4,1fr);gap:20px")}>
            {continueRow.map((p) => (
              <ProductCardDp key={p.id} p={p} />
            ))}
          </div>

          {/* Уточнение выдачи — только для вошедших (гостю не показываем) */}
            {/* ===== REFINE ANY SEARCH ===== */}
            <div style={sx("border-top:1px solid rgba(0,0,0,.08);padding:56px 0 60px")}>
              <div style={sx("text-align:center;font:500 12px 'Inter',sans-serif;letter-spacing:.18em;color:rgba(0,0,0,.5);text-transform:uppercase")}>Уточните любой запрос</div>
              <h2 className="dp-f44" style={sx("text-align:center;font:400 44px 'Spectral',Georgia,serif;margin:10px 0 28px")}>{refineZones[refineTab]?.label ?? "Каталог"} · {refineItems.length} {things(refineItems.length)}</h2>
              <div style={sx("display:flex;gap:12px;justify-content:center;margin-bottom:36px")}>
                {refineZones.map((z, i) => (
                  <span key={z.zone} onClick={() => setRefineTab(i)} className="dp-btn" style={sx(`font:500 15px 'Inter',sans-serif;border:1px solid ${refineTab === i ? "#000" : "rgba(0,0,0,.16)"};background:${refineTab === i ? "#000" : "#fff"};color:${refineTab === i ? "#fff" : "#000"};border-radius:999px;padding:11px 22px`)}>
                    {z.label}
                  </span>
                ))}
              </div>
              <div className="dp-marquee" style={sx("overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent);mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)")}>
                <div className="dp-track" style={sx("display:flex;width:max-content;padding:6px 0")}>
                  {marquee.map((p, i) => (
                    <div key={p.id + "_" + i} className="dp-prod" onClick={() => app.openProduct(p)} style={sx("flex:none;width:210px;margin-right:20px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;overflow:hidden")}>
                      <div className="dp-plate"><div className="dp-ph" style={sx(`position:absolute;inset:0;background-image:url('${imgOf(p)}')`)}></div>
                        <span
                          className="dp-heart"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!app.favIds.includes(p.id)) app.toggleFav(p);
                            else app.showToast("Уже в избранном");
                          }}
                          style={sx("position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center")}
                        >
                          <svg width="14" height="13" viewBox="0 0 15 14" fill="none" stroke="#000" strokeWidth="1.5"><path d="M7.5 12.5S1.5 8.8 1.5 4.9C1.5 2.9 3 1.5 4.8 1.5c1.1 0 2.1.5 2.7 1.4.6-.9 1.6-1.4 2.7-1.4 1.8 0 3.3 1.4 3.3 3.4 0 3.9-6 7.6-6 7.6z"></path></svg>
                        </span>
                      </div>
                      <div style={sx("padding:14px 14px 18px")}>
                        <div style={sx("font:500 15px 'Inter',sans-serif")}>{p.brand.name}</div>
                        <div style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding-top:4px")}>
                          <span style={sx("font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.name}</span>
                          <span style={sx("font:500 13px 'Inter',monospace;white-space:nowrap")}>{priceOf(p)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </div>
      )}

      {/* ===== MARKETING (logged-out only) ===== */}
      {!app.loggedIn && (
        <>
          {/* ===== MEET MAKEMELOOK ===== */}
          <FeatureShowcase />

          {/* ===== STYLE PASSPORT + PHOTO SHOP ===== */}
          <div style={sx("border-top:1px solid rgba(0,0,0,.08);padding:64px 40px 70px;max-width:1200px;margin:0 auto")}>
            <div className="dp-c2" style={sx("display:grid;grid-template-columns:1fr 1fr;gap:44px")}>
              <div>
                <div style={sx("height:400px;background:#ECE9E0;border-radius:14px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;position:relative")}>
                  <div style={sx("width:210px;height:340px;background:#000;border-radius:26px 26px 0 0;padding:6px 6px 0;box-shadow:0 20px 50px rgba(0,0,0,.2)")}>
                    <div style={sx("background:#F4F1EA;border-radius:22px 22px 0 0;height:100%;padding:16px 14px;overflow:hidden")}>
                      <div style={sx("display:flex;align-items:center;gap:8px;margin-bottom:10px")}>
                        <span style={sx("width:26px;height:26px;border-radius:50%;background:#DAD5C8")}></span>
                        <div>
                          <div style={sx("font:500 12px 'Inter',sans-serif")}>Катя</div>
                          <div style={sx("font:500 7px 'Inter',sans-serif;letter-spacing:.1em;color:rgba(0,0,0,.5)")}>ЖЕНСТВЕННЫЙ МИНИМАЛИЗМ</div>
                        </div>
                      </div>
                      <div style={sx("font:500 9px 'Inter',sans-serif;letter-spacing:.12em;color:rgba(0,0,0,.55);margin:8px 0 8px")}>РАЗБОР СТИЛЯ</div>
                      <div style={sx("display:flex;flex-direction:column;gap:11px")}>
                        {[
                          ["Смелость", "38%"],
                          ["Зрелость", "64%"],
                          ["Романтичность", "72%"],
                          ["Силуэт", "30%"],
                        ].map(([label, left]) => (
                          <div key={label}>
                            <div style={sx("font:400 9px 'Inter',sans-serif;margin-bottom:4px")}>{label}</div>
                            <div style={sx("height:4px;background:#ECE9E0;border-radius:9px;position:relative")}>
                              <span style={sx(`position:absolute;left:${left};top:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:#2B2BCC`)}></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <h3 style={sx("font:400 32px 'Spectral',Georgia,serif;margin:26px 0 14px")}>Ваш Паспорт стиля.</h3>
                <p style={sx("font:400 16px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.6);margin:0 0 18px")}>Паспорт запоминает бренды, которые вы сохраняете, силуэты, к которым тянетесь, и поводы, к которым одеваетесь. Со временем каждая выдача ощущается собранной лично под вас. Потому что так и есть.</p>
                <span className="dp-btn" onClick={() => app.go("passport")} style={sx("display:inline-flex;align-items:center;gap:8px;font:500 15px 'Inter',sans-serif;border-bottom:1.5px solid #000;padding-bottom:3px")}>
                  Собрать профиль {arrowB(14)}
                </span>
              </div>
              <div>
                <div style={sx("height:400px;background:#ECE9E0;border-radius:14px;padding:26px;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative")}>
                  <div style={sx("width:280px")}>
                    <div style={sx("position:relative;height:220px;background:#4A463D;border-radius:10px;display:flex;align-items:center;justify-content:center")}>
                      <span style={sx("font:400 10px 'Inter',monospace;color:rgba(255,255,255,.4)")}>ЗАГРУЖЕННОЕ ФОТО</span>
                      <span style={sx("position:absolute;top:10px;left:10px;font:500 9px 'Inter',sans-serif;letter-spacing:.1em;color:#fff;background:rgba(0,0,0,.75);border-radius:6px;padding:5px 9px;display:flex;align-items:center;gap:5px")}>
                        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6"><rect x="2" y="3.5" width="16" height="13" rx="2"></rect><circle cx="7" cy="8" r="1.6"></circle><path d="M3 15l4.5-4 3.5 3 3-2.5L18 15"></path></svg>ЗАГРУЖЕНО
                      </span>
                    </div>
                    <div style={sx("background:#fff;border-radius:0 0 10px 10px;padding:16px 16px 18px;margin-top:-2px")}>
                      <div style={sx("font:400 16px 'Spectral',Georgia,serif;margin-bottom:12px")}>Нашла 3 похожих в наличии.</div>
                      <div style={sx("display:flex;gap:8px")}>
                        <div style={sx("flex:1;height:80px;background:#DAD5C8;border-radius:6px")}></div>
                        <div style={sx("flex:1;height:80px;background:#E4E0D6;border-radius:6px")}></div>
                        <div style={sx("flex:1;height:80px;background:#D8D3CB;border-radius:6px")}></div>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 style={sx("font:400 32px 'Spectral',Georgia,serif;margin:26px 0 14px")}>Шопинг с любого фото.</h3>
                <p style={sx("font:400 16px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.6);margin:0 0 18px")}>Скиньте скриншот из галереи, кадр из кампании или образ подруги. MakeMeLook распознаёт вещи и находит их в наличии — по всем брендам и магазинам, с которыми мы работаем.</p>
                <span className="dp-btn" onClick={() => app.go("chat")} style={sx("display:inline-flex;align-items:center;gap:8px;font:500 15px 'Inter',sans-serif;border-bottom:1.5px solid #000;padding-bottom:3px")}>
                  Начать чат {arrowB(14)}
                </span>
              </div>
            </div>
          </div>

          {/* ===== TRY-ON DIFFERENTIATOR ===== */}
          <div style={sx("background:#000;color:#F4F1EA;padding:70px 40px")}>
            <div className="dp-c2" style={sx("max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:center")}>
              <div>
                <div style={sx("font:500 12px 'Inter',sans-serif;letter-spacing:.18em;color:#7d90ff;text-transform:uppercase;display:flex;align-items:center;gap:8px")}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#7d90ff"></path></svg>Только у нас
                </div>
                <h2 className="dp-f46" style={sx("font:400 46px/1.15 'Spectral',Georgia,serif;margin:16px 0 20px")}>Примерьте любую вещь на себе — до покупки.</h2>
                <p style={sx("font:400 17px/1.6 'Inter',sans-serif;color:rgba(246,244,239,.7);margin:0 0 30px;max-width:440px")}>Загрузите одно фото — и увидите, как на вас сядет платье, жакет или пальто. Никаких примерочных. Данные для примерки под защитой 152-ФЗ, удаляются в один тап.</p>
                <span className="dp-btn" onClick={() => window.makeMeLook?.open()} style={sx("display:inline-flex;align-items:center;gap:10px;background:#2B2BCC;color:#fff;border-radius:999px;padding:15px 30px;font:500 16px 'Inter',sans-serif")}>
                  Попробовать примерку {arrowW(15)}
                </span>
              </div>
              <div style={sx("position:relative;display:flex;gap:18px;justify-content:center;align-items:center")}>
                <div style={sx("width:206px;height:300px;border-radius:14px;overflow:hidden;position:relative")}>
                  <div style={sx("position:absolute;inset:0;background:url('/irid-seated.webp') 54% 8%/cover;filter:grayscale(1) contrast(.96) brightness(1.05)")}></div>
                  <span style={sx("position:absolute;bottom:12px;left:12px;font:500 10px 'Inter',sans-serif;letter-spacing:.12em;color:#fff;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);border-radius:6px;padding:5px 11px")}>ДО</span>
                </div>
                <div className="dp-irid-ring" style={sx("width:236px;height:334px;border-radius:16px;overflow:hidden;position:relative;animation:dpFloat 5.5s ease-in-out infinite;box-shadow:0 20px 60px rgba(90,120,255,.35)")}>
                  <div style={sx("position:absolute;inset:0;background:url('/irid-seated.webp') 54% 8%/cover")}></div>
                  <span style={sx("position:absolute;bottom:12px;left:12px;display:flex;align-items:center;gap:6px;font:500 10px 'Inter',sans-serif;letter-spacing:.12em;color:#000;background:rgba(255,255,255,.9);backdrop-filter:blur(4px);border-radius:6px;padding:5px 11px")}>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#2B2BCC"></path></svg>ПОСЛЕ
                  </span>
                </div>
                <div style={sx("position:absolute;top:22px;right:-6px;background:#fff;color:#000;border-radius:14px 14px 14px 4px;padding:10px 14px;font:400 13px 'Inter',sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:170px")}>«Идеально для вечера у воды»</div>
              </div>
            </div>
          </div>

          {/* ===== TRENDING SEARCHES ===== */}
          <div style={sx("padding:64px 40px 70px;max-width:1200px;margin:0 auto")}>
            <h2 className="dp-f44" style={sx("font:400 44px 'Spectral',Georgia,serif;margin:0 0 8px")}>Популярные запросы.</h2>
            <p style={sx("font:400 16px 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:0 0 26px")}>Что другие спрашивают у MakeMeLook прямо сейчас.</p>
            <span className="dp-btn" onClick={() => app.go("chat")} style={sx("display:inline-flex;align-items:center;gap:10px;background:#000;color:#fff;border-radius:999px;padding:14px 26px;font:500 15px 'Inter',sans-serif;margin-bottom:38px")}>
              Начать чат {arrowW(15)}
            </span>
            <div className="dp-c-trend" style={sx("display:grid;grid-template-columns:1.1fr .9fr;gap:44px")}>
              <div className="dp-prod" onClick={() => heroTrend && app.openProduct(heroTrend)} style={sx("cursor:pointer")}>
                <div style={sx(`height:440px;background:#4A5842;border-radius:12px;overflow:hidden;background-image:url('${heroTrend ? imgOf(heroTrend) : ""}');background-size:cover;background-position:center`)}></div>
                <div style={sx("font:500 11px 'Inter',sans-serif;letter-spacing:.14em;color:#2B2BCC;margin:20px 0 8px;display:flex;align-items:center;gap:7px")}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#2B2BCC"></path></svg>ПО БРЕНДУ
                </div>
                <h3 style={sx("font:400 32px/1.2 'Spectral',Georgia,serif;margin:0")}>{heroTrend ? `${heroTrend.brand.name} · ${heroTrend.name}` : "Каталог собирается…"}</h3>
              </div>
              <div style={sx("display:flex;flex-direction:column")}>
                {TRENDING.map((t) => (
                  <div key={t.title} className="dp-prod" onClick={() => app.runSearch(t.q)} style={sx("cursor:pointer;display:flex;gap:18px;align-items:center;padding:22px 0;border-bottom:1px solid rgba(0,0,0,.1)")}>
                    <div style={sx(`width:88px;height:104px;background:${t.bg};border-radius:8px;flex:none`)}></div>
                    <div style={sx("flex:1")}>
                      <div style={sx("font:500 11px 'Inter',sans-serif;letter-spacing:.14em;color:rgba(0,0,0,.5)")}>{t.tag}</div>
                      <div style={sx("font:400 20px/1.3 'Spectral',Georgia,serif;margin:6px 0 10px")}>{t.title}</div>
                      <div style={sx("font:500 11px 'Inter',sans-serif;letter-spacing:.12em;color:rgba(0,0,0,.55);display:flex;align-items:center;gap:6px")}>
                        НАЧАТЬ ЧАТ <svg width="11" height="11" viewBox="0 0 15 15" fill="none" stroke="rgba(0,0,0,.55)" strokeWidth="1.6" strokeLinecap="round"><path d="M2 7.5h10M8 3.5l4 4-4 4"></path></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== PARTNERS ===== */}
          <div style={sx("border-top:1px solid rgba(0,0,0,.08);padding:64px 40px 70px")}>
            {/* «Уже подключённые к MakeMeLook» было неправдой: здесь перечислен
                весь каталог, а подключённый партнёр и бренд в каталоге — разные
                вещи. Пишем то, что есть на самом деле. */}
            <h2 className="dp-f40" style={sx("text-align:center;font:400 40px 'Spectral',Georgia,serif;margin:0 0 40px")}>Бренды в каталоге.</h2>
            <div className="dp-r6" style={sx("max-width:1100px;margin:0 auto;display:flex;justify-content:center;flex-wrap:wrap;gap:28px 40px;text-align:center")}>
              {merchants.map((m) => (
                <span key={m.slug} className="dp-btn" onClick={() => app.openBrand({ slug: m.slug, name: m.name })} style={sx("font:400 18px 'Spectral',Georgia,serif;color:rgba(0,0,0,.65);letter-spacing:.02em;cursor:pointer")}>{m.name}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== FOOTER ===== */}
      <div style={sx("background:#000;color:#F4F1EA;padding:70px 40px 44px")}>
        <div style={sx("max-width:1120px;margin:0 auto")}>
          {!app.loggedIn && (
            <div className="dp-c2" style={sx("display:grid;grid-template-columns:1fr 1fr;gap:44px;border-bottom:1px solid rgba(246,244,239,.14);padding-bottom:50px")}>
              <div>
                <h3 style={sx("font:400 34px 'Spectral',Georgia,serif;margin:0 0 22px")}>Создайте аккаунт.</h3>
                <span className="dp-btn" onClick={() => app.go("chat")} style={sx("display:inline-flex;align-items:center;gap:10px;background:#F4F1EA;color:#000;border-radius:999px;padding:14px 26px;font:500 15px 'Inter',sans-serif")}>
                  Собрать профиль {arrowB(15)}
                </span>
              </div>
            </div>
          )}
          <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;padding-top:40px;flex-wrap:wrap;gap:20px")}>
            <div>
              <div style={sx("font:400 26px 'Spectral',Georgia,serif;margin-bottom:8px")}>Ваш личный ИИ-стилист.</div>
              <div style={sx("font:400 14px 'Inter',sans-serif;color:rgba(246,244,239,.55)")}>Чат для шопинга. 400+ магазинов в одном месте.</div>
            </div>
            <div style={sx("display:flex;gap:26px;font:400 14px 'Inter',sans-serif;color:rgba(246,244,239,.6)")}>
              <a href="https://b2b.makemelook.ai" target="_blank" rel="noopener" style={sx("cursor:pointer;color:inherit;text-decoration:none")}>Партнёрам</a><span>Вакансии</span><a href="https://makemelook.ai/legal/privacy.html" target="_blank" rel="noopener" style={sx("cursor:pointer;color:inherit;text-decoration:none")}>Конфиденциальность</a><a href="https://makemelook.ai/legal/terms.html" target="_blank" rel="noopener" style={sx("cursor:pointer;color:inherit;text-decoration:none")}>Условия</a><span>О нас</span>
            </div>
          </div>
          <div style={sx("font:400 12px 'Inter',sans-serif;color:rgba(246,244,239,.4);padding-top:30px")}>© 2026 ООО МОНОРУС · MakeMeLook</div>
        </div>
      </div>
    </div>
  );
}
