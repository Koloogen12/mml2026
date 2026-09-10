import { useEffect, useState } from "react";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { useAuth } from "../authStore";

/*
 * Гостевая демо-петля «что умеет продукт» — блок «Одержимы модой».
 *
 * Пять табов, у каждого своя проигрываемая анимация (порт витринных анимаций из
 * референса + наш пятый таб «Примерка», которого у них нет). Картинки — реальный
 * каталог по полу (табы) и снятые под онбординг кадры (примерка), а не заглушки.
 * Раньше слева стояли четыре статичных цветных прямоугольника — пустой контент.
 *
 * Анимации на CSS (см. dp.css, префикс .fx-). Табы, которым нужно проиграться и
 * начаться заново (чат, уточнение), перезапускаются remount'ом по nonce.
 */

type Kind = "explore" | "chat" | "tryon" | "save" | "refine";

const TABS: Array<{ kind: Kind; label: string; title: string; body: string }> = [
  { kind: "explore", label: "Подбор", title: "Лента, собранная под вас",
    body: "Ассистент листает тысячи вещей из сотен магазинов и оставляет только то, что подходит именно вам." },
  { kind: "chat", label: "Чат", title: "Опишите повод словами",
    body: "Как другу-стилисту: «костюм на свадьбу до 40 000». Соберём варианты из разных магазинов в одном чате." },
  { kind: "tryon", label: "Примерка", title: "Увидьте вещь на себе",
    body: "Загрузите фото — и примерьте образ до покупки, прямо в чате, не листая бесконечные карточки." },
  { kind: "save", label: "Сохранение", title: "Коллекции под каждый повод",
    body: "Складывайте находки в подборки: отпуск, работа, выход в свет — и возвращайтесь к ним когда нужно." },
  { kind: "refine", label: "Уточнение", title: "Один клик — и точнее",
    body: "Не то? «Покажи похожее» — и выдача подстроится под вкус, не заставляя объяснять заново." },
];

// Коллекции для таба «Сохранение» — иллюстрация, не данные пользователя (это
// демо для гостя, как в референсе). Обложки — реальные фото каталога.
const COLLECTIONS = [
  { name: "Выход в свет", n: 9 },
  { name: "Отпуск у моря", n: 12 },
  { name: "Рабочий гардероб", n: 7 },
  { name: "Вечер в городе", n: 6 },
  { name: "Базовый гардероб", n: 14 },
  { name: "Спорт и улица", n: 5 },
];

/*
 * Кураторский набор кадров вместо случайного каталога.
 *
 * Раньше картинки тянулись из /products и выглядели рандомно (чёрное платье
 * рядом с красным худи — «собрано из того, что было»). Теперь — снятый под
 * задачу единый набор: editorial, off-white студия, приглушённая палитра.
 * Лежит в public/showcase/, отдаётся как статика.
 */
const G = "/app/showcase";
// Пул для «Подбора» (лента) и «Сохранения» (обложки) — разнообразие уместно.
const POOL: Record<string, string[]> = {
  women: [`${G}/w1.jpg`, `${G}/w2.jpg`, `${G}/w3.jpg`, `${G}/w4.jpg`, `${G}/w5.jpg`, `${G}/w6.jpg`, `${G}/w7.jpg`, `${G}/w8.jpg`],
  men: [`${G}/m1.jpg`, `${G}/m2.jpg`, `${G}/m3.jpg`, `${G}/m4.jpg`, `${G}/m5.jpg`, `${G}/m6.jpg`, `${G}/m7.jpg`, `${G}/m8.jpg`],
};

// Чат: карточки ОДНОЙ категории под запрос (платья / костюмы), разный фасон и
// цвет. Раньше сюда шёл случайный пул — выдача не соответствовала запросу.
const CHAT_CARDS: Record<string, string[]> = {
  women: [`${G}/chat-w1.jpg`, `${G}/chat-w2.jpg`, `${G}/chat-w3.jpg`, `${G}/chat-w4.jpg`],
  men: [`${G}/chat-m1.jpg`, `${G}/chat-m2.jpg`, `${G}/chat-m3.jpg`, `${G}/chat-m4.jpg`],
};

// Уточнение: «покажи похожее» = ОДИН артикул в вариациях цвета (тот же человек,
// силуэт и поза), а не случайные вещи. Центр + разлёт.
const REFINE: Record<string, { center: string; fan: string[] }> = {
  women: { center: `${G}/refine-w0.jpg`, fan: [`${G}/refine-w1.jpg`, `${G}/refine-w2.jpg`, `${G}/refine-w3.jpg`, `${G}/refine-w4.jpg`] },
  men: { center: `${G}/refine-m0.jpg`, fan: [`${G}/refine-m1.jpg`, `${G}/refine-m2.jpg`, `${G}/refine-m3.jpg`, `${G}/refine-m4.jpg`] },
};

// Примерка — «до → после»: тот же человек в двух образах (a=повседневный,
// b=собранный). Кроссфейд между ними и есть демонстрация примерки.
const TRYON: Record<string, { a: string; b: string; chip: string }> = {
  men: { a: `${G}/tryon-m-a.jpg`, b: `${G}/tryon-m-b.jpg`, chip: "Примерено на вас" },
  women: { a: `${G}/tryon-w-a.jpg`, b: `${G}/tryon-w-b.jpg`, chip: "Примерено на вас" },
};

const Cursor = () => (
  <svg className="fx-cursor" viewBox="0 0 24 24" fill="#000" stroke="#fff" strokeWidth="1.5">
    <path d="M5 3l14 7-6 2-2 6-6-15z" />
  </svg>
);

export function FeatureShowcase() {
  const app = useApp();
  const gender = app.gender;
  const [tab, setTab] = useState(0);
  const [nonce, setNonce] = useState(0);
  const pool = POOL[gender];

  // Перезапуск проигрываемых табов (чат, уточнение) — раз в ~6.5 с.
  const kind = TABS[tab].kind;
  useEffect(() => {
    if (kind !== "chat" && kind !== "refine") return;
    const t = setInterval(() => setNonce((n) => n + 1), 6500);
    return () => clearInterval(t);
  }, [kind, tab]);

  const pick = (from: number, count: number) => {
    if (pool.length === 0) return [] as string[];
    return Array.from({ length: count }, (_, i) => pool[(from + i) % pool.length]);
  };

  return (
    <div style={sx("border-top:1px solid rgba(0,0,0,.08);padding:64px 40px 70px;max-width:1200px;margin:0 auto")}>
      <div style={sx("text-align:center;font:500 12px 'Inter',sans-serif;letter-spacing:.18em;color:rgba(0,0,0,.5);text-transform:uppercase")}>Знакомьтесь · MakeMeLook</div>
      <h2 className="dp-f46" style={sx("text-align:center;font:400 46px 'Spectral',Georgia,serif;margin:10px 0 30px")}>Одержимы модой — ради вас.</h2>

      <div style={sx("display:flex;gap:34px;justify-content:center;flex-wrap:wrap;border-bottom:1px solid rgba(0,0,0,.1);max-width:760px;margin:0 auto 40px")}>
        {TABS.map((t, i) => (
          <span key={t.kind} onClick={() => setTab(i)} style={sx(`cursor:pointer;font:400 20px 'Spectral',Georgia,serif;color:${tab === i ? "#000" : "rgba(0,0,0,.4)"};padding-bottom:14px;border-bottom:2px solid ${tab === i ? "#000" : "transparent"};transition:color .2s`)}>
            {t.label}
          </span>
        ))}
      </div>

      <div className="dp-c-meet" style={sx("display:grid;grid-template-columns:1.15fr .85fr;gap:50px;align-items:center")}>
        {/* Стадия. key по табу+полу+nonce — чтобы CSS-анимация начиналась заново. */}
        <div className="fx-stage" key={`${kind}-${gender}-${nonce}`}>
          {kind === "explore" && (
            <div className="fx-explore">
              {[["fx-col-a", 0], ["fx-col-b", 5], ["fx-col-c", 10]].map(([cls, off]) => (
                <div className={`fx-col ${cls}`} key={cls as string}>
                  <div className="fx-track">
                    {[...pick(off as number, 5), ...pick(off as number, 5)].map((u, i) => (
                      <img key={i} src={u} alt="" loading="lazy" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {kind === "chat" && (
            <div className="fx-chat">
              <div className="fx-bubble" style={sx("animation-delay:.2s")}>
                {gender === "men"
                  ? "Льняной костюм на свадьбу в Подмосковье, до 40 000 ₽"
                  : "Платье на летнюю свадьбу в Подмосковье, до 30 000 ₽"}
              </div>
              <div className="fx-lead" style={sx("animation-delay:1.1s")}>
                <span style={sx("width:6px;height:6px;border-radius:50%;background:#2B2BCC")}></span>
                {gender === "men"
                  ? "Подобрал костюмы до 40 000 ₽ — Massimo Dutti, Uniqlo, Zara и Mango"
                  : "Подобрала платья до 30 000 ₽ — Zarina, Lime, Sela и Befree"}
              </div>
              <div className="fx-cards">
                {CHAT_CARDS[gender].map((u, i) => (
                  <img key={i} src={u} alt="" style={sx(`animation:fxRise .5s ease ${1.8 + i * 0.25}s forwards;opacity:0`)} />
                ))}
              </div>
            </div>
          )}

          {kind === "tryon" && (
            <div className="fx-tryon">
              {/* «До» снизу, «после» сверху с плавным появлением по кругу —
                  тот же человек, другой образ. Это и есть примерка. */}
              <img className="fx-tryon-a" src={TRYON[gender].a} alt="" />
              <img className="fx-tryon-b" src={TRYON[gender].b} alt="" />
              <div className="fx-scan"></div>
              <span className="fx-tryon-btn">Примерить</span>
            </div>
          )}

          {kind === "save" && (
            <div className="fx-save">
              <div className="fx-save-track">
                {[...COLLECTIONS, ...COLLECTIONS].map((c, i) => (
                  <div className="fx-coll" key={i}>
                    <img className="fx-coll-img" src={pick(i, 1)[0]} alt="" loading="lazy" />
                    <div className="fx-coll-tag">✦ КОЛЛЕКЦИЯ</div>
                    <div className="fx-coll-name">{c.name}</div>
                    <div className="fx-coll-n">{c.n} сохранено</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {kind === "refine" && (
            <div className="fx-refine">
              {REFINE[gender].fan.map((u, i) => (
                // Разлёт стартует после «клика» курсора (~2.4 с). Позиции — в CSS.
                // Это тот же артикул, что в центре, в других цветах.
                <img key={i} className={`fx-fan fx-fan-${i}`} src={u} alt="" loading="lazy"
                  style={sx(`animation-delay:${2.4 + i * 0.12}s`)}
                />
              ))}
              <img className="fx-center" src={REFINE[gender].center} alt="" />
              <div className="fx-morelike">✦ Похожее</div>
              <Cursor />
            </div>
          )}
        </div>

        {/* Копия активного таба + CTA. */}
        <div>
          <h3 style={sx("font:400 34px/1.2 'Spectral',Georgia,serif;margin:0 0 18px")}>{TABS[tab].title}</h3>
          <p style={sx("font:400 16px/1.6 'Inter',sans-serif;color:rgba(0,0,0,.6);margin:0 0 28px")}>{TABS[tab].body}</p>
          <span className="dp-btn" onClick={() => useAuth.getState().startOnboarding()}
            style={sx("display:inline-flex;align-items:center;gap:10px;background:#000;color:#fff;border-radius:999px;padding:14px 26px;font:500 15px 'Inter',sans-serif")}>
            Собрать профиль
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </div>
      </div>
    </div>
  );
}
