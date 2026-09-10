'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Heart, ChevronDown } from 'lucide-react';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '../ui/breadcrumb';
import type { StorefrontProductDetail } from '../../_types/product';
import { formatPrice } from '../../_lib/utils';

interface ProductInfoProps {
  product: StorefrontProductDetail;
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const categoryLabel = product.category ?? 'Одежда';
  const categoryPath = product.category ? `/shop/category/${product.category}` : '/shop';
  const priceStr = formatPrice(product.price, product.currency);

  return (
    <div className="space-y-6">
      {/* Breadcrumb desktop */}
      <div className="hidden lg:block">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href="/shop">Главная</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href={categoryPath}>{categoryLabel}</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Brand & title */}
      <div>
        <Link href={categoryPath} className="text-xs font-medium text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors">
          {product.brand ?? ''}
        </Link>
        <h1 className="text-xl md:text-2xl font-light text-foreground mt-2">{product.name}</h1>
        <div className="flex items-baseline gap-3 mt-2">
          {product.discount_price != null ? (
            <>
              <p className="text-lg font-light text-foreground">{formatPrice(product.discount_price, product.currency)}</p>
              <p className="text-sm font-light text-muted-foreground line-through">{priceStr}</p>
            </>
          ) : (
            <p className="text-lg font-light text-foreground">{priceStr}</p>
          )}
        </div>
      </div>

      {/* Color */}
      {product.color && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-foreground mb-2">Цвет</h3>
          <p className="text-sm font-light text-foreground">{product.color}</p>
        </div>
      )}

      {/* Size */}
      {(product.sizes?.length ?? 0) > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-foreground">Размер</h3>
            <Link href="/shop/about/size-guide" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">
              Размерная сетка
            </Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-4 py-2.5 text-sm font-light border transition-all ${selectedSize === size ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Button className="flex-1 h-12 bg-foreground text-background hover:bg-foreground/90 font-light rounded-none">
          Добавить в корзину
        </Button>
        <Button variant="outline" className="h-12 px-5 font-light rounded-none flex items-center gap-2">
          Избранное <Heart className="w-4 h-4" strokeWidth={1.5} />
        </Button>
      </div>

      {/* Virtual try-on */}
      <Button
        className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-light rounded-none flex items-center justify-center gap-2"
        onClick={() => { (window as any).makeMeLook?.open({ productId: product.id }); }}
      >
        <img src="/shop/assets/tryon-icon.svg" alt="" className="w-5 h-5" />
        Примерить
      </Button>

      {/* Accordion sections */}
      <div className="border-t border-border pt-6 space-y-0">
        {product.description && (
          <details className="border-b border-border group">
            <summary className="flex items-center justify-between py-4 cursor-pointer text-sm font-light text-foreground list-none">
              Описание
              <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform duration-200" />
            </summary>
            <p className="text-sm font-light text-muted-foreground pb-4 leading-relaxed">{product.description}</p>
          </details>
        )}
        {product.material && (
          <details className="border-b border-border group">
            <summary className="flex items-center justify-between py-4 cursor-pointer text-sm font-light text-foreground list-none">
              Материал
              <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform duration-200" />
            </summary>
            <p className="text-sm font-light text-muted-foreground pb-4 leading-relaxed">{product.material}</p>
          </details>
        )}
        <details className="border-b border-border group">
          <summary className="flex items-center justify-between py-4 cursor-pointer text-sm font-light text-foreground list-none">
            Доставка и возврат
            <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform duration-200" />
          </summary>
          <p className="text-sm font-light text-muted-foreground pb-4 leading-relaxed">
            Бесплатная доставка при заказе от 5 000 ₽. Доставка по России 2–5 рабочих дней. Возврат в течение 14 дней с момента получения.
          </p>
        </details>
      </div>
    </div>
  );
};

export default ProductInfo;

