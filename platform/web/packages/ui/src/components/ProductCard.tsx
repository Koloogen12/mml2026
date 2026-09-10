import { useState } from "react";
import clsx from "clsx";

import type { MMLProduct } from "../product";
import { formatPrice } from "../product";

export interface ProductCardProps {
  product: MMLProduct;
  /** public id чат-сессии — уходит в /r/ для атрибуции клика */
  sessionId?: string;
  /** если задан и товар примеряем — показываем кнопку «Примерить» */
  onTryOn?: (product: MMLProduct) => void;
  className?: string;
}

/**
 * Карточка товара. Порядок блоков зафиксирован каноном:
 * фото (♡ в углу) → бренд (mono caps) → название (serif) → цена (mono) → CTA внизу.
 * Покупка всегда через /r/ — прямой deeplink наружу не отдаём.
 */
export function ProductCard({ product, sessionId, onTryOn, className }: ProductCardProps) {
  const [fav, setFav] = useState(false);

  const offer = product.offers.find((o) => o.in_stock) ?? product.offers[0];
  const image = product.images[0];

  const buyHref = offer
    ? `/r/${product.id}?offer=${encodeURIComponent(offer.retailer_slug)}${
        sessionId ? `&sid=${encodeURIComponent(sessionId)}` : ""
      }`
    : undefined;

  return (
    <article className={clsx("mml-card", className)}>
      <div className="mml-card__imgwrap">
        {image ? (
          <img
            className="mml-card__img"
            src={image.url}
            alt={`${product.brand.name} — ${product.name}`}
            loading="lazy"
          />
        ) : (
          <div className="mml-card__img mml-card__img--empty" aria-hidden="true" />
        )}
        <button
          type="button"
          className={clsx("mml-card__fav", fav && "mml-card__fav--on")}
          aria-label={fav ? "Убрать из избранного" : "В избранное"}
          aria-pressed={fav}
          onClick={() => setFav((v) => !v)}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path
              d="M10 17s-6.5-4.35-8.5-8.5C.35 6.1 2 3 5 3c2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 3 0 4.65 3.1 3.5 5.5C16.5 12.65 10 17 10 17z"
              fill={fav ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </button>
      </div>

      <div className="mml-card__body">
        <div className="mml-card__brand">{product.brand.name}</div>
        <h3 className="mml-card__name">{product.name}</h3>
        <div className="mml-card__price">
          {offer ? (
            <>
              <span>{formatPrice(offer.price, offer.currency)}</span>
              {offer.old_price != null && (
                <s className="mml-card__oldprice">
                  {formatPrice(offer.old_price, offer.currency)}
                </s>
              )}
            </>
          ) : (
            <span className="mml-card__noprice">цена уточняется</span>
          )}
        </div>

        <div className="mml-card__cta">
          {buyHref && (
            <a
              className="mml-card__buy"
              href={buyHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Купить
            </a>
          )}
          {product.tryon_eligible && onTryOn && (
            <button
              type="button"
              className="mml-card__tryon"
              onClick={() => onTryOn(product)}
            >
              Примерить
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
