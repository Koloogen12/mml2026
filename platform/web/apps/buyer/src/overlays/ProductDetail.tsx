import { useEffect, useState } from "react";
import type { MMLProduct } from "@mml/ui";
import { formatPrice } from "@mml/ui";
import { sx } from "../sx";
import { useApp } from "../appStore";
import { imgOf, priceOf, oldPriceOf, discountOf, openTryon } from "../product-utils";

/*
 * Ни свотчей, ни селектора размеров здесь больше нет — оба врали.
 *
 * Цвет: у товара он ОДИН (в фидах каждая расцветка приходит отдельной позицией),
 * а интерфейс рисовал три кружка и подписывал их «айвори / песочный / графит» —
 * два из трёх выдуманы, клик ничего не менял.
 *
 * Размеры: в базе их нет НИ У ОДНОГО оффера (колонка sizes пустая у всех 412),
 * а меню предлагало вшитые 42–48 — да ещё и женские, всем подряд. Размер human
 * всё равно выбирает на сайте продавца, куда ведёт кнопка покупки.
 *
 * Вернём выбор, когда в фидах появятся реальные размеры и расцветки.
 */

// Цвет из фида приходит как попало: «Чёрный», «черный», «Black», «neutrals».
// Словарь собран по фактическим значениям каталога, а не наугад.
const COLOR_RU: Record<string, string> = {
  black: "чёрный", white: "белый", grey: "серый", gray: "серый",
  blue: "синий", brown: "коричневый", yellow: "жёлтый", pink: "розовый",
  purple: "фиолетовый", orange: "оранжевый", gold: "золотой", green: "зелёный",
  red: "красный", beige: "бежевый",
  // Категорийные значения Farfetch — это не цвет вещи, а полка магазина.
  // Показывать «Цвет: neutrals» человеку бессмысленно, поэтому прячем.
  neutrals: "", multi: "", цветной: "", меланж: "",
};
const prettyColor = (raw?: string) => {
  const v = (raw || "").trim();
  if (!v) return "";
  const low = v.toLowerCase();
  return low in COLOR_RU ? COLOR_RU[low] : low;
};

export function ProductDetail({ p }: { p: MMLProduct }) {
  const app = useApp();
  const isFav = app.favIds.includes(p.id);
  // Галерея фото товара: реальные изображения, стрелки + точки-пейджер.
  const imgs = p.images?.length ? p.images.map((i) => i.url) : [imgOf(p)];
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => setPhotoIdx(0), [p.id]);
  const multi = imgs.length > 1;
  const curImg = imgs[Math.min(photoIdx, imgs.length - 1)] || imgOf(p);
  const step = (d: number) => setPhotoIdx((i) => (i + d + imgs.length) % imgs.length);
  const color = prettyColor(p.color);
  /*
   * Похожее и «с этим носят» считает бэкенд: сходство — по вектору картинки
   * (Marqo-FashionSigLIP), образ — по правилу сочетаемости зон.
   *
   * Здесь были срезы каталога: похожее = первые 4 товара той же зоны, образ =
   * первые 3 любой другой. Зона — это не сходство: белый пиджак и кимоно adidas
   * оба outerwear; а «любая другая зона» подставляла к пиджаку три платья.
   * Эмбеддинги при этом уже были посчитаны у всех товаров и не использовались.
   */
  const [similar, setSimilar] = useState<MMLProduct[]>([]);
  const [totalLook, setTotalLook] = useState<MMLProduct[]>([]);
  useEffect(() => {
    let alive = true;
    setSimilar([]);
    setTotalLook([]);
    void (async () => {
      try {
        const res = await fetch(`/api/v1/products/${p.id}/related`);
        if (!res.ok) return;
        const d = (await res.json()) as { similar?: MMLProduct[]; look?: MMLProduct[] };
        if (!alive) return;
        setSimilar(d.similar ?? []);
        setTotalLook(d.look ?? []);
      } catch {
        // не доехало — секции просто не покажем, выдумывать нечего
      }
    })();
    return () => {
      alive = false;
    };
  }, [p.id]);
  const hasOld = !!p.offers[0]?.old_price;
  // Подпись «С этим носят» — из зон реально подобранных вещей (динамика, не хардкод).
  const LOOK_WORD: Record<string, string> = {
    tops: "верх", bottoms: "низ", outerwear: "верхнюю одежду",
    dress: "платье", footwear: "обувь", accessories: "аксессуары",
  };
  const lookWords = Array.from(
    new Set(totalLook.map((x) => LOOK_WORD[x.garment_zone ?? ""] ?? x.garment_zone).filter(Boolean)),
  ) as string[];
  const lookCaption =
    lookWords.length === 0
      ? ""
      : lookWords.length === 1
        ? `Добавьте ${lookWords[0]} — и образ собран`
        : `Добавьте ${lookWords.slice(0, -1).join(", ")} и ${lookWords[lookWords.length - 1]} — и образ собран`;

  return (
    <div
      className="dp-scrim"
      style={sx("position:fixed;inset:0;z-index:60;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow-y:auto")}
      onClick={() => app.closeProduct()}
    >
      {/* Затемнение и размытие — ОТДЕЛЬНЫМ слоем, а не на этом же элементе.
          Когда backdrop-filter висит на контейнере с контентом, любой ховер
          внутри (крестик, «примерить», карточка) перерисовывает контейнер, и
          браузер заново считает размытие на весь экран — это и есть вспышка,
          дважды: на входе курсора и на выходе. Отдельный неизменный слой этим
          не задет. */}
      <div className="dp-scrim-blur" aria-hidden="true"></div>
      <div
        className="dp-fade dp-detail-shell"
        onClick={(e) => e.stopPropagation()}
        style={sx("position:relative;width:100%;max-width:1100px;background:#fff;border-radius:4px;box-shadow:0 12px 24px rgba(0,0,0,.12),0 4px 4px rgba(0,0,0,.06)")}
      >
        {/* Слева сверху — сохранить в коллекцию (борд), зеркально крестику. */}
        <span
          className="dp-btn"
          title="Сохранить в коллекцию"
          onClick={() => {
            if (!app.requireAuth()) return;
            useApp.setState({ pickerProduct: p });
          }}
          style={sx("position:absolute;top:20px;left:20px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(0,0,0,.12);background:#fff;display:flex;align-items:center;justify-content:center;z-index:2")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="5" height="5" rx="1"></rect><rect x="9" y="2" width="5" height="5" rx="1"></rect><rect x="2" y="9" width="5" height="5" rx="1"></rect><path d="M11.5 9.5v5M9 12h5"></path></svg>
        </span>
        <span className="dp-btn" onClick={() => app.closeProduct()} style={sx("position:absolute;top:20px;right:20px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(0,0,0,.12);background:#fff;display:flex;align-items:center;justify-content:center;z-index:2")}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l9 9M12 3l-9 9"></path></svg>
        </span>

        {/* TOP: image + info */}
        <div className="dp-detail-top">
          {/* image */}
          <div className="dp-detail-img" style={sx("background:#F4F1EA;border-radius:2px;overflow:hidden;display:flex;align-items:center;justify-content:center")}>
            <div style={sx(`position:absolute;inset:0;background-image:url('${curImg}');background-size:cover;background-position:center;transition:background-image .15s`)}></div>
            {multi && (
              <>
                <span className="dp-btn" onClick={() => step(-1)} style={sx("position:absolute;left:14px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.1);cursor:pointer")}>
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.6" strokeLinecap="round"><path d="M9.5 3L5 7.5 9.5 12"></path></svg>
                </span>
                <span className="dp-btn" onClick={() => step(1)} style={sx("position:absolute;right:14px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.1);cursor:pointer")}>
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="#000" strokeWidth="1.6" strokeLinecap="round"><path d="M5.5 3L10 7.5 5.5 12"></path></svg>
                </span>
              </>
            )}
            <span className="dp-btn dp-irid-ring" onClick={() => app.runSearch("Похожее на " + p.name)} style={sx("position:absolute;left:14px;bottom:14px;display:flex;align-items:center;gap:7px;background:#fff;border-radius:999px;padding:9px 14px;font:500 12.5px 'Inter',sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.12)")}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#2B2BCC"></path></svg>Похожее
            </span>
            {multi && (
              <div style={sx("position:absolute;bottom:16px;right:16px;display:flex;gap:6px")}>
                {imgs.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    style={sx(`width:${i === photoIdx ? "18px" : "5px"};height:5px;border-radius:999px;background:${i === photoIdx ? "#000" : "rgba(0,0,0,.28)"};cursor:pointer;transition:width .15s`)}
                  ></span>
                ))}
              </div>
            )}
          </div>

          {/* info */}
          <div style={sx("flex:1;min-width:0;display:flex;flex-direction:column")}>
            <span className="dp-btn" onClick={() => app.openBrand(p.brand)} style={sx("align-self:flex-start;display:inline-flex;align-items:center;gap:7px;font:400 32px/1.2 'Spectral',Georgia,serif;letter-spacing:-.01em;color:rgba(0,0,0,.92)")}>
              {p.brand.name}
              <svg width="15" height="15" viewBox="0 0 12 12" fill="none" stroke="rgba(0,0,0,.5)" strokeWidth="1.4" strokeLinecap="round"><path d="M4 8l4-4M4.5 4H8v3.5"></path></svg>
            </span>
            <span style={sx("font:400 15.8px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.92);margin-top:2px")}>{p.name}</span>

            <div style={sx("display:flex;align-items:center;gap:10px;margin-top:14px")}>
              {hasOld && <span style={sx("font:400 15px 'Inter',sans-serif;color:rgba(0,0,0,.4);text-decoration:line-through")}>{oldPriceOf(p)}</span>}
              <span style={sx("font:700 16px 'Inter',sans-serif;color:rgba(0,0,0,.92)")}>{priceOf(p)}</span>
              {hasOld && <span style={sx("font:500 12px 'Inter',sans-serif;color:#2B2BCC;background:rgba(43,43,204,.08);border-radius:999px;padding:4px 10px")}>{discountOf(p)}</span>}
            </div>

            {color && (
              <div style={sx("font:400 13px 'Inter',sans-serif;color:rgba(0,0,0,.92);margin-top:24px")}>Цвет: {color}</div>
            )}
            <div style={sx("font:400 12.5px/1.5 'Inter',sans-serif;color:rgba(0,0,0,.5);margin-top:14px")}>Размер выбирается на сайте продавца.</div>

            <div style={sx("font:700 10.8px 'Inter',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:rgba(0,0,0,.55);margin:22px 0 12px")}>Доступно в</div>
            <div style={sx("display:flex;flex-direction:column;gap:10px")}>
              {/* мульти-ритейлерный список = массив offers; переход строго через /r/{id} */}
              {p.offers.map((o, i) =>
                i === 0 ? (
                  <div key={o.retailer_slug + i} className="dp-btn" onClick={() => app.goRedirect(p, o)} style={sx("height:52px;display:flex;align-items:center;justify-content:space-between;background:#000;border-radius:1px;padding:0 24px;box-shadow:0 6px 18px rgba(0,0,0,.12)")}>
                    <span style={sx("display:flex;align-items:center;gap:12px;color:#fff")}>
                      <span style={sx("font:500 13px 'Inter',sans-serif")}>{o.retailer}</span>
                      <span style={sx("opacity:.6")}>·</span>
                      <span style={sx("font:500 13px 'Inter',sans-serif")}>{formatPrice(o.price, o.currency)}</span>
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><path d="M5 11L11 5M6 5h5v5"></path></svg>
                  </div>
                ) : (
                  <div key={o.retailer_slug + i} className="dp-btn" onClick={() => app.goRedirect(p, o)} style={sx("height:52px;display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid rgba(0,0,0,.14);border-radius:1px;padding:0 24px")}>
                    <span style={sx("display:flex;align-items:center;gap:12px")}>
                      <span style={sx("font:500 13px 'Inter',sans-serif")}>{o.retailer}</span>
                      <span style={sx("color:rgba(0,0,0,.3)")}>·</span>
                      <span style={sx("font:500 13px 'Inter',sans-serif")}>{formatPrice(o.price, o.currency)}</span>
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round"><path d="M5 11L11 5M6 5h5v5"></path></svg>
                  </div>
                ),
              )}
            </div>

            <p style={sx("font:400 13px/1.55 'Inter',sans-serif;color:rgba(0,0,0,.55);margin:14px 0 0")}>
              {p.description || `${p.name}. Струящаяся ткань, аккуратный крой по фигуре — работает и на каждый день, и на выход.`}
            </p>

            <div style={sx("display:flex;gap:12px;margin-top:22px")}>
              {/* «Примерить на себе» с лого MML — всегда. По клику открывается
                  встроенный виджет с этим товаром (window.makeMeLook.open). */}
              <span className="dp-btn dp-grad" onClick={() => openTryon(p)} style={sx("flex:1;height:52px;color:#16150F;border-radius:1px;font:600 14px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;gap:10px")}>
                <svg width="23" height="17" viewBox="0 0 57 41" fill="#16150F"><path d="M52.732 0.483616C51.67 0.0198624 50.4918 -0.114389 49.3517 0.098443C48.2115 0.311275 47.1626 0.861267 46.3423 1.67638L16.4347 30.7596C16.0595 31.1082 15.5634 31.2997 15.0498 31.2943C14.5361 31.2889 14.0444 31.087 13.6768 30.7305L10.1306 27.1313C9.32809 26.2994 8.29146 25.7275 7.15636 25.4907C6.02126 25.2538 4.84054 25.3629 3.76871 25.8036C2.68776 26.2221 1.75909 26.955 1.10422 27.9065C0.449356 28.8579 0.0987999 29.9836 0.098461 31.1361L-1.57565e-05 40.17L3.90023 40.2111L3.99871 31.1772C4.00285 30.794 4.12128 30.4206 4.33904 30.1042C4.55678 29.7878 4.86407 29.5427 5.22203 29.3998C5.57999 29.2569 5.97253 29.2226 6.35001 29.3014C6.7275 29.3802 7.07298 29.5684 7.34274 29.8423L10.889 33.4415C11.4263 33.9871 12.0666 34.4221 12.7732 34.7217C13.4799 35.0214 14.239 35.1798 15.0073 35.1879C15.7757 35.196 16.5381 35.0536 17.2511 34.769C17.9641 34.4843 18.6137 34.0629 19.1628 33.5288L49.0703 4.44551C49.3461 4.17746 49.6956 3.99663 50.0747 3.92589C50.4538 3.85514 50.8455 3.89765 51.2003 4.04804C51.555 4.19844 51.8569 4.44996 52.0677 4.77081C52.2786 5.09167 52.389 5.46746 52.3849 5.85066L52.0048 40.7185L55.9051 40.7596L56.2851 5.8918C56.31 4.73959 55.984 3.60686 55.35 2.64189C54.7161 1.67692 53.8035 0.924669 52.732 0.483616Z"></path></svg>
                Примерить на себе
              </span>
              <span
                className={"dp-heart" + (isFav ? " dp-fav-on" : "")}
                onClick={(e) => {
                  e.stopPropagation();
                  app.toggleFav(p);
                }}
                style={sx("width:54px;height:52px;border:1px solid rgba(0,0,0,.16);border-radius:1px;display:flex;align-items:center;justify-content:center;background:#fff;font:600 14px 'Inter',sans-serif;color:#16150F")}
              >
                <svg width="19" height="18" viewBox="0 0 15 14" fill={isFav ? "#C4553B" : "none"} stroke={isFav ? "#C4553B" : "#000"} strokeWidth="1.5"><path d="M7.5 12.5S1.5 8.8 1.5 4.9C1.5 2.9 3 1.5 4.8 1.5c1.1 0 2.1.5 2.7 1.4.6-.9 1.6-1.4 2.7-1.4 1.8 0 3.3 1.4 3.3 3.4 0 3.9-6 7.6-6 7.6z"></path></svg>
              </span>
            </div>
          </div>
        </div>

        {/* Shop similar. Пустая секция «Похожее» без карточек читается как сбой. */}
        {similar.length > 0 && (
        <div style={sx("margin-top:52px")}>
          <h3 style={sx("font:400 26px 'Spectral',Georgia,serif;margin:0 0 20px")}>Похожее</h3>
          <div className="dp-r4" style={sx("display:grid;grid-template-columns:repeat(4,1fr);gap:20px")}>
            {similar.map((sp) => (
              <div key={sp.id} className="dp-card" onClick={() => app.openProduct(sp)}>
                <div className="dp-cardimg dp-plate">
                  <div className="dp-ph" style={sx(`position:absolute;inset:0;background-image:url('${imgOf(sp)}')`)}></div>
                  <span className="dp-spark"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.2 3.6L12 5.8 8.2 7 7 10.6 5.8 7 2 5.8l3.8-1.2z" fill="#2B2BCC"></path></svg></span>
                </div>
                <div style={sx("padding:12px 2px 0")}>
                  <div style={sx("font:400 13px 'Spectral',Georgia,serif")}>{sp.brand.name}</div>
                  <div style={sx("display:flex;justify-content:space-between;gap:8px;padding-top:3px")}>
                    <span style={sx("font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{sp.name}</span>
                    <span style={sx("font:500 12.5px 'Inter',sans-serif;color:#737373;white-space:nowrap")}>{priceOf(sp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}


        {/* Style with. Нечего подобрать — секции нет: пустой заголовок с
            подписью «Соберите образ» выглядит поломкой. */}
        {totalLook.length > 0 && (
        <div style={sx("margin-top:44px")}>
          <h3 style={sx("font:400 26px 'Spectral',Georgia,serif;margin:0 0 4px")}>С этим носят</h3>
          <p style={sx("font:400 13px 'Inter',sans-serif;color:#737373;margin:0 0 20px")}>{lookCaption}</p>
          <div className="dp-r4" style={sx("display:grid;grid-template-columns:repeat(4,1fr);gap:20px")}>
            {totalLook.map((sp) => (
              <div key={sp.id} className="dp-card" onClick={() => app.openProduct(sp)}>
                <div className="dp-cardimg dp-plate">
                  <div className="dp-ph" style={sx(`position:absolute;inset:0;background-image:url('${imgOf(sp)}')`)}></div>
                </div>
                <div style={sx("padding:12px 2px 0")}>
                  <div style={sx("font:400 13px 'Spectral',Georgia,serif")}>{sp.brand.name}</div>
                  {/* Названия не было вовсе — плитка показывала бренд и цену,
                      и «с этим носят» превращалось в угадайку. */}
                  <div style={sx("display:flex;justify-content:space-between;gap:8px;padding-top:3px")}>
                    <span style={sx("font:400 12.5px 'Inter',sans-serif;color:rgba(0,0,0,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{sp.name}</span>
                    <span style={sx("font:500 12.5px 'Inter',sans-serif;color:#737373;white-space:nowrap")}>{priceOf(sp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
