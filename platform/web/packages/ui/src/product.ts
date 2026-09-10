// Товар в том виде, в каком его отдаёт API платформы
// (событие products в чате, /api/v1/products, /api/v1/search).

export interface MMLOffer {
  retailer: string;
  retailer_slug: string;
  price: number;
  old_price?: number;
  currency: string;
  in_stock: boolean;
}

export interface MMLImage {
  url: string;
  position: number;
  kind: string;
}

export interface MMLProduct {
  id: string;
  brand: { slug: string; name: string };
  name: string;
  description?: string;
  gender?: string;
  garment_zone?: string;
  category?: string;
  color?: string;
  material?: string;
  tryon_eligible: boolean;
  images: MMLImage[];
  offers: MMLOffer[];
  score?: number;
}

export function formatPrice(price: number, currency = "RUB"): string {
  const formatted = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(price);
  return currency === "RUB" ? `${formatted} ₽` : `${formatted} ${currency}`;
}
