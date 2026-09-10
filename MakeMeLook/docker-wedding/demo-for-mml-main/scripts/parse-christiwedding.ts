/**
 * Christiwedding.ru product parser
 * Site runs on Tilda — uses https://store.tildaapi.com/api/getproductslist/
 * Output: christiwedding-products.csv
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STOREPART_UID = '361420507128';
const RECID = '157878057';
const BASE_REFERER = 'https://christiwedding.ru/catalog';
const OUT_CSV = path.join(__dirname, '..', 'christiwedding-products.csv');

interface TildaGalleryItem {
  img: string;
  descr?: string;
}

interface TildaCharacteristic {
  title: string;
  value: string;
}

interface TildaEdition {
  uid: number | string;
  price: string;
  priceold?: string;
  sku?: string;
  quantity?: string;
  img?: string;
  characteristics?: TildaCharacteristic[];
  [key: string]: unknown;
}

interface TildaProduct {
  uid: number;
  title: string;
  sku: string;
  text: string;           // HTML description
  price: string;          // "657000.0000"
  priceold: string;       // "840000,00"
  gallery: string;        // JSON string -> array
  url: string;
  brand: string;
  quantity: string;       // stock
  characteristics: TildaCharacteristic[];
  editions?: TildaEdition[];
}

interface Product {
  uid: number;
  name: string;
  brand: string;
  sku: string;
  price: number;
  price_old: number;
  currency: string;
  color: string;
  silhouette: string;
  fabric: string;
  length: string;
  neckline: string;
  sleeve: string;
  category: string;
  gender: string;
  description: string;
  all_characteristics: string;   // flat "key:value; key:value"
  sizes: string;
  in_stock: boolean;
  product_url: string;
  photo_url: string;             // main image
  photo_urls: string;            // all images joined
  photo_count: number;
}

function escapeCSV(val: string): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function parseGallery(raw: string): string[] {
  if (!raw) return [];
  try {
    const arr: TildaGalleryItem[] = JSON.parse(raw);
    return arr.map(g => g.img).filter(Boolean);
  } catch {
    return [];
  }
}

function findChar(chars: TildaCharacteristic[], keys: string[]): string {
  if (!chars) return '';
  for (const c of chars) {
    const t = (c.title || '').toLowerCase();
    for (const k of keys) {
      if (t.includes(k)) return c.value || '';
    }
  }
  return '';
}

/** Collect sizes from editions */
function collectSizes(editions: TildaEdition[] | undefined): string {
  if (!editions || !editions.length) return '';
  const sizes = new Set<string>();
  for (const e of editions) {
    if (e.characteristics) {
      for (const c of e.characteristics) {
        const t = (c.title || '').toLowerCase();
        if (t.includes('размер') || t.includes('size')) {
          if (c.value) sizes.add(c.value);
        }
      }
    }
  }
  return Array.from(sizes).join(', ');
}

/** Collect all-edition characteristic values (e.g. "Цвет": multiple values) */
function collectEditionValues(editions: TildaEdition[] | undefined, keys: string[]): string {
  if (!editions || !editions.length) return '';
  const vals = new Set<string>();
  for (const e of editions) {
    if (e.characteristics) {
      for (const c of e.characteristics) {
        const t = (c.title || '').toLowerCase();
        if (keys.some(k => t.includes(k))) {
          if (c.value) vals.add(c.value);
        }
      }
    }
  }
  return Array.from(vals).join(', ');
}

async function main() {
  console.log('🔍 Christi Wedding parser — fetching via Tilda Store API...\n');

  const c = Date.now();
  const url =
    `https://store.tildaapi.com/api/getproductslist/` +
    `?storepartuid=${STOREPART_UID}` +
    `&recid=${RECID}` +
    `&c=${c}` +
    `&flag_root=withroot` +
    `&size=500`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': BASE_REFERER,
      'Origin': 'https://christiwedding.ru',
    },
  });

  if (!res.ok) {
    console.error('❌ API error:', res.status, res.statusText);
    process.exit(1);
  }

  const data = (await res.json()) as {
    total: number;
    products: TildaProduct[];
    filters: unknown;
  };

  console.log(`📦 API returned: ${data.products.length} products (total=${data.total})\n`);

  const products: Product[] = data.products.map((p) => {
    const images = parseGallery(p.gallery);
    const mainImg = images[0] || '';

    const chars = p.characteristics || [];
    const silhouette = findChar(chars, ['силуэт']);
    const fabric = findChar(chars, ['ткань', 'материал', 'состав']);
    const lengthC = findChar(chars, ['длина']);
    const neckline = findChar(chars, ['вырез', 'горлов', 'декольте']);
    const sleeve = findChar(chars, ['рукав']);
    const color =
      findChar(chars, ['цвет']) ||
      collectEditionValues(p.editions, ['цвет', 'color']);

    const allCharsStr = chars
      .map(c => `${c.title}: ${c.value}`)
      .join('; ');

    const sizes =
      findChar(chars, ['размер', 'size']) ||
      collectSizes(p.editions);

    // stock detection — Tilda uses "" or "y" for hasQuantity
    const qty = (p.quantity || '').toString().trim();
    const inStock = qty === '' || qty === 'y' || parseInt(qty, 10) > 0;

    return {
      uid: p.uid,
      name: p.title,
      brand: p.brand || 'Christi Couture',
      sku: p.sku || '',
      price: parsePrice(p.price),
      price_old: parsePrice(p.priceold),
      currency: 'RUB',
      color,
      silhouette,
      fabric,
      length: lengthC,
      neckline,
      sleeve,
      category: 'wedding_dress',
      gender: 'female',
      description: stripHtml(p.text),
      all_characteristics: allCharsStr,
      sizes,
      in_stock: inStock,
      product_url: p.url || '',
      photo_url: mainImg,
      photo_urls: images.join(' | '),
      photo_count: images.length,
    };
  });

  // CSV
  const headers: (keyof Product)[] = [
    'uid', 'name', 'brand', 'sku', 'price', 'price_old', 'currency',
    'color', 'silhouette', 'fabric', 'length', 'neckline', 'sleeve',
    'category', 'gender', 'sizes', 'description', 'all_characteristics',
    'product_url', 'photo_url', 'photo_urls', 'photo_count', 'in_stock',
  ];

  const rows = products.map(p =>
    headers.map(h => escapeCSV(String((p as Record<string, unknown>)[h] ?? ''))).join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(OUT_CSV, csv, 'utf-8');
  console.log(`✅ Parsed ${products.length} products`);
  console.log(`📄 Saved to ${OUT_CSV}\n`);

  // Stats
  const brands: Record<string, number> = {};
  const silhouettes: Record<string, number> = {};
  products.forEach(p => {
    brands[p.brand || 'unknown'] = (brands[p.brand || 'unknown'] || 0) + 1;
    const s = p.silhouette || '—';
    silhouettes[s] = (silhouettes[s] || 0) + 1;
  });

  console.log('Brands:', brands);
  console.log('Silhouettes:', silhouettes);
  console.log(`With photos:   ${products.filter(p => p.photo_url).length}/${products.length}`);
  console.log(`With description: ${products.filter(p => p.description).length}/${products.length}`);
  console.log(`With sizes:    ${products.filter(p => p.sizes).length}/${products.length}`);
  console.log(`With color:    ${products.filter(p => p.color).length}/${products.length}`);
  console.log(`In stock:      ${products.filter(p => p.in_stock).length}/${products.length}`);
  console.log(`Avg photos:    ${(products.reduce((s, p) => s + p.photo_count, 0) / products.length).toFixed(1)}`);

  const prices = products.map(p => p.price).filter(Boolean);
  if (prices.length) {
    console.log(`Price range:   ${Math.min(...prices).toLocaleString('ru')} — ${Math.max(...prices).toLocaleString('ru')} ₽`);
  }

  console.log('\nSample (first 5):');
  products.slice(0, 5).forEach(p => {
    console.log(
      `  ${p.name} | ${p.brand} | ${p.price.toLocaleString('ru')}₽ | ` +
      `silhouette: ${p.silhouette || '—'} | photos: ${p.photo_count} | sizes: ${p.sizes || '—'}`,
    );
  });
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
