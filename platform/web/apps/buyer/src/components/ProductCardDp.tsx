import { useRef, useState } from "react";
import type { MMLProduct } from "@mml/ui";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { imagesOf, priceOf, openTryon } from "../product-utils";

// Карточка товара dp-card — разметка 1:1 из hi-fi макета
// (сетка чата, лента на главной, избранное). Данные — реальные MMLProduct.
/*
 * Кадр держит .dp-plate (3:4 + contain), а не проп height: фиксированная высота
 * при плывущей ширине означала плавающую пропорцию — и cover резал товар
 * по-разному на каждой ширине окна.
 */
export function ProductCardDp({ p }: { p: MMLProduct }) {
  const app = useApp();
  const inWardrobe = app.wardrobe.includes(p.id);
  const chatOpen = app.cardChat === p.id;

  // Листалка фото: стрелки по наведению, свайп на телефоне. Показывается
  // только когда фото правда несколько — сейчас у всех товаров каталога по
  // одному, стрелок не будет, пока фиды партнёров не привезут остальные.
  const images = imagesOf(p);
  const multi = images.length > 1;
  const [shot, setShot] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const step = (d: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShot((i) => (i + d + images.length) % images.length);
  };

  return (
    <div className="dp-card" onClick={() => app.openProduct(p)}>
      <div
        className="dp-cardimg dp-plate"
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          if (!multi || !touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current.x;
          const dy = e.changedTouches[0].clientY - touch.current.y;
          touch.current = null;
          // Горизонтальный жест — листаем; вертикальный отдаём скроллу страницы.
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
          step(dx < 0 ? 1 : -1);
        }}
      >
        <div
          className="dp-ph"
          style={sx(
            // Только background-image: шорткат `background:` сбросил бы
            // background-size из .dp-plate обратно в auto — и вписывание
            // не работало бы. Подложку даёт сама плитка.
            `position:absolute;inset:0;background-image:url('${images[shot] ?? ""}')`,
          )}
        ></div>
        {multi && (
          <>
            <span className="dp-shot-nav dp-shot-prev" onClick={(e) => step(-1, e)} title="Предыдущее фото">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.7" strokeLinecap="round"><path d="M9.5 3L5 7.5 9.5 12"></path></svg>
            </span>
            <span className="dp-shot-nav dp-shot-next" onClick={(e) => step(1, e)} title="Следующее фото">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.7" strokeLinecap="round"><path d="M5.5 3L10 7.5 5.5 12"></path></svg>
            </span>
            <span className="dp-shot-dots">
              {images.map((_, i) => (
                <i key={i} style={sx(`width:5px;height:5px;border-radius:50%;background:${i === shot ? "#fff" : "rgba(255,255,255,.45)"}`)} />
              ))}
            </span>
          </>
        )}
        <span
          className="dp-ico"
          onClick={(e) => {
            e.stopPropagation();
            useApp.setState({ notMyStyle: p, cardChat: null });
          }}
          title="Не мой стиль"
          style={sx("top:12px;left:12px")}
        >
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.6" strokeLinecap="round"><path d="M3 3l9 9M12 3l-9 9"></path></svg>
        </span>
        <span
          className="dp-ico-persist"
          onClick={(e) => {
            e.stopPropagation();
            app.toggleWardrobe(p);
          }}
          title="В Шкаф"
          style={sx(`top:12px;right:12px;background:${inWardrobe ? "#2B2BCC" : "rgba(255,255,255,.92)"}`)}
        >
          <svg width="18" height="16" viewBox="0 0 22 20" fill="none" stroke={inWardrobe ? "#fff" : "#000"} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"><path d="M11 6.2a2.1 2.1 0 1 1 2.1-2.1"></path><path d="M11 6.2l8.1 5.7c.5.3.9.9.9 1.5 0 1-.8 1.8-1.8 1.8H3.8c-1 0-1.8-.8-1.8-1.8 0-.6.4-1.2.9-1.5L11 6.2z"></path></svg>
        </span>
        <span
          className="dp-ico"
          onClick={(e) => {
            e.stopPropagation();
            useApp.setState({ cardChat: chatOpen ? null : p.id, cardChatText: "" });
          }}
          title="Уточнить в чате"
          style={sx("bottom:12px;left:12px")}
        >
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#2B2BCC"></path></svg>
        </span>
        {/* Ховер-иконка «вешалка» — открывает встроенный виджет с этим товаром
            (как на витринах заказчиков). */}
        <span
          className="dp-ico"
          onClick={(e) => {
            e.stopPropagation();
            openTryon(p);
          }}
          title="Примерить на себе"
          style={sx("bottom:12px;right:12px")}
        >
          <svg width="16" height="14" viewBox="0 0 22 20" fill="none" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"><path d="M8 3.5a3 3 0 0 1 6 0c0 1.2-.8 1.8-1.6 2.3l6.3 4.2c.8.5 1.3 1.2 1.3 2.2V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1.6c0-1 .5-1.7 1.3-2.2l6.3-4.2C8.8 5.3 8 4.7 8 3.5z"></path></svg>
        </span>
        {chatOpen && (
          <div className="dp-cardpop" onClick={(e) => e.stopPropagation()}>
            <div style={sx("display:flex;gap:8px;margin-bottom:10px")}>
              <span
                className="dp-chip"
                onClick={() => {
                  useApp.setState({ cardChat: null });
                  app.runSearch("Похожее на " + p.name);
                }}
                style={sx("flex:1;text-align:center;font:400 12.5px 'Inter',sans-serif;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:9px 0;background:#fff")}
              >
                Похожее
              </span>
              <span
                className="dp-chip"
                onClick={() => {
                  useApp.setState({ cardChat: null });
                  app.runSearch("То же, но дешевле");
                }}
                style={sx("flex:1;text-align:center;font:400 12.5px 'Inter',sans-serif;border:1px solid rgba(0,0,0,.16);border-radius:999px;padding:9px 0;background:#fff")}
              >
                Дешевле
              </span>
            </div>
            <div style={sx("display:flex;align-items:center;gap:8px;background:#F4F1EA;border-radius:999px;padding:5px 5px 5px 14px")}>
              <input
                value={app.cardChatText}
                onChange={(e) => useApp.setState({ cardChatText: e.target.value })}
                placeholder="Изменить что-то?"
                style={sx("flex:1;min-width:0;border:none;outline:none;background:transparent;font:400 13px 'Inter',sans-serif")}
              />
              <span
                className="dp-btn"
                onClick={() => {
                  const q = app.cardChatText.trim() || `Изменить в «${p.name}»`;
                  useApp.setState({ cardChat: null, cardChatText: "" });
                  app.runSearch(q);
                }}
                style={sx("width:30px;height:30px;flex:none;border-radius:50%;background:#2B2BCC;display:flex;align-items:center;justify-content:center")}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12V2M3 6l4-4 4 4"></path></svg>
              </span>
            </div>
          </div>
        )}
      </div>
      <div style={sx("padding:14px 16px 16px")}>
        <div style={sx("font:500 10px 'Inter',sans-serif;letter-spacing:.13em;color:rgba(0,0,0,.62)")}>{p.brand.name}</div>
        {/* На узкой сетке имя и цена в одну строку схлопывались в «Be…» —
            на мобиле кладём цену под название (dp-card-meta). */}
        <div className="dp-card-meta" style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding-top:5px")}>
          <span className="dp-card-name" style={sx("font:400 15px 'Inter',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.name}</span>
          <span style={sx("font:500 15px 'Inter',monospace;white-space:nowrap")}>{priceOf(p)}</span>
        </div>
      </div>
    </div>
  );
}
