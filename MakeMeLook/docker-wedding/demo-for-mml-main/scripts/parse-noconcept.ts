/**
 * NOCONCEPT.RU product parser
 * Uses /ajax/shop API to get catalog + individual product pages for details
 * Output: noconcept-products.csv
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'https://noconcept.ru';
const DELAY_MS = 300;
const OUT_CSV = path.join(__dirname, '..', 'noconcept-products.csv');

interface CatalogItem {
  id: number;
  name: string;
  price: string;
  price_special: string;
  video: string | null;
  image: { webp: string; jpeg: string } | null;
  imageHover: { webp: string; jpeg: string } | null;
  soldout: boolean;
  limited: string;
  link: string;
}

interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  currency: string;
  color: string;
  category: string;
  subcategory: string;
  gender: string;
  sku: string;
  composition: string;
  description: string;
  sizes: string;
  product_url: string;
  photo_url: string;
  in_stock: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function escapeCSV(val: string): string {
  if (!val) return '';
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

/** Fetch all products from /ajax/shop API, paginated */
async function fetchCatalog(): Promise<CatalogItem[]> {
  const items: CatalogItem[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(`${BASE}/ajax/shop`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Content-Type': 'application/json; charset=utf-8',
        'Referer': `${BASE}/shop/men`,
      },
      body: JSON.stringify({
        page,
        gender: '1',
        firstLoad: page === 1,
        filters: {},
      }),
    });

    const data = await res.json();

    // API returns {items: [...]} or [] when done
    let pageItems: CatalogItem[] = [];
    if (Array.isArray(data)) {
      if (data.length === 0) break;
      pageItems = data;
    } else if (data.items) {
      if (data.items.length === 0) break;
      pageItems = data.items;
    } else {
      break;
    }

    items.push(...pageItems);
    console.log(`  Catalog page ${page}: ${pageItems.length} items (total: ${items.length})`);
    page++;
    await sleep(200);
  }

  return items;
}

/** Extract itemprop content from HTML */
function itemprop(html: string, prop: string): string {
  const metaRe = new RegExp(`itemprop="${prop}"[^>]*content="([^"]*)"`, 'i');
  const m = html.match(metaRe);
  if (m) return m[1].trim();

  const spanRe = new RegExp(`itemprop="${prop}"[^>]*>([^<]+)<`, 'i');
  const s = html.match(spanRe);
  if (s) return s[1].trim();

  return '';
}

/** Parse title for color and gender */
function parseTitle(title: string): { gender: string; color: string } {
  const result = { gender: '', color: '' };

  if (title.includes('мужской')) result.gender = 'male';
  else if (title.includes('женский')) result.gender = 'female';

  const colorM = title.match(/цвет:\s*([^)]+)/i);
  if (colorM) result.color = colorM[1].trim();

  return result;
}

/** Detect category from product name and HTML content */
function detectCategory(name: string, html: string): { category: string; subcategory: string } {
  const result = { category: 'tops', subcategory: '' };
  const lc = name.toLowerCase();

  // Check product name first (more reliable)
  if (/куртк|пальто|пуховик|тренч|бомбер|парк[аи]/i.test(lc)) {
    result.category = 'outerwear';
  } else if (/брюк|джинс|шорт|штан|чинос/i.test(lc)) {
    result.category = 'bottoms';
  } else if (/пиджак|жакет|блейзер/i.test(lc)) {
    result.category = 'tops';
    result.subcategory = 'blazers';
  } else if (/свитер|худи|свитшот|кардиган|джемпер|водолазк/i.test(lc)) {
    result.category = 'tops';
    result.subcategory = 'knitwear';
  } else if (/футболк|поло|лонгслив/i.test(lc)) {
    result.category = 'tops';
    result.subcategory = 't-shirts';
  } else if (/рубашк|сорочк/i.test(lc)) {
    result.category = 'tops';
    result.subcategory = 'shirts';
  } else if (/жилет/i.test(lc)) {
    result.category = 'outerwear';
    result.subcategory = 'vests';
  } else if (/сумк|шарф|шапк|перчатк|ремен|кепк|панам|рюкзак|кошелек/i.test(lc)) {
    result.category = 'accessories';
  } else if (/кроссовк|ботинк|кед|лоферы|обувь|сандал/i.test(lc)) {
    result.category = 'shoes';
  } else if (/костюм/i.test(lc)) {
    result.category = 'tops';
    result.subcategory = 'suits';
  }

  // If still default, check breadcrumb links in HTML
  if (result.category === 'tops' && !result.subcategory) {
    if (/\/outerwear/i.test(html)) result.category = 'outerwear';
    else if (/\/pants|\/bottoms/i.test(html)) result.category = 'bottoms';
    else if (/\/accessories/i.test(html)) result.category = 'accessories';
    else if (/\/shoes/i.test(html)) result.category = 'shoes';
  }

  return result;
}

/** Fetch product detail page for extra info */
async function fetchProductDetails(id: number): Promise<{
  color: string;
  gender: string;
  sku: string;
  composition: string;
  sizes: string;
  description: string;
  category: string;
  subcategory: string;
  name: string;
} | null> {
  try {
    const url = `${BASE}/shop/${id}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Title
    const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const titleText = titleM ? titleM[1] : '';
    const titleData = parseTitle(titleText);

    // Name from h1 (skip the title tag itemprop="name")
    const h1M = html.match(/<h1[^>]*itemprop="name"[^>]*>([^<]+)<\/h1>/i) ||
                html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const name = h1M ? h1M[1].trim() : '';

    // SKU
    const sku = itemprop(html, 'sku');

    // Category
    const catData = detectCategory(name, html);

    // Composition
    const compM = html.match(/(?:Состав|состав)[^<]*?(\d+%[^<]+)/i);
    const composition = compM ? compM[1].trim() : '';

    // Description
    const descM = html.match(/itemprop="description"[^>]*>([\s\S]*?)<\/div>/i);
    const description = descM ? descM[1].replace(/<[^>]+>/g, '').trim().substring(0, 300) : '';

    // Sizes — look for select options or size buttons
    const sizeMatches = html.match(/class="size[^"]*"[^>]*>([^<]+)/gi);
    let sizes = '';
    if (sizeMatches) {
      sizes = sizeMatches
        .map(s => {
          const m = s.match(/>([^<]+)/);
          return m ? m[1].trim() : '';
        })
        .filter(Boolean)
        .join(', ');
    }

    return {
      color: titleData.color,
      gender: titleData.gender,
      sku,
      composition,
      sizes,
      description,
      category: catData.category,
      subcategory: catData.subcategory,
      name,
    };
  } catch (err) {
    console.error(`  [${id}] detail error: ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('🔍 NOCONCEPT parser — fetching catalog via AJAX API...\n');

  // Step 1: Get all products from catalog API
  const catalogItems = await fetchCatalog();
  console.log(`\n📦 Catalog: ${catalogItems.length} total items\n`);

  // Step 2: Fetch detail pages for each product
  const products: Product[] = [];
  let processed = 0;

  for (const item of catalogItems) {
    processed++;
    if (processed % 10 === 0 || processed === 1) {
      process.stdout.write(`\r  Details: [${processed}/${catalogItems.length}]...`);
    }

    const priceNum = parseFloat(item.price.replace(/\s/g, '')) || 0;
    const photoUrl = item.image?.jpeg ? BASE + item.image.jpeg : '';

    // Fetch detail page
    const details = await fetchProductDetails(item.id);
    await sleep(DELAY_MS);

    const catData = details
      ? { category: details.category, subcategory: details.subcategory }
      : detectCategory(item.name, '');

    products.push({
      id: item.id,
      name: details?.name || item.name,
      brand: 'NOCONCEPT',
      price: priceNum,
      currency: 'RUB',
      color: details?.color || '',
      category: catData.category,
      subcategory: catData.subcategory,
      gender: details?.gender || 'male',
      sku: details?.sku || '',
      composition: details?.composition || '',
      description: details?.description || '',
      sizes: details?.sizes || '',
      product_url: `${BASE}${item.link}`,
      photo_url: photoUrl,
      in_stock: !item.soldout,
    });
  }

  console.log(`\n\n✅ Parsed ${products.length} products`);

  // Write CSV
  const headers = [
    'name', 'brand', 'category', 'subcategory', 'gender', 'price',
    'currency', 'color', 'composition', 'sizes', 'description', 'product_url',
    'photo_url', 'sku', 'in_stock',
  ];

  const rows = products.map(p =>
    headers.map(h => escapeCSV(String((p as Record<string, unknown>)[h] ?? ''))).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(OUT_CSV, csv, 'utf-8');
  console.log(`📄 Saved to ${OUT_CSV}`);

  // Stats
  const cats: Record<string, number> = {};
  const genders: Record<string, number> = {};
  products.forEach(p => {
    cats[p.category] = (cats[p.category] || 0) + 1;
    genders[p.gender || 'unknown'] = (genders[p.gender || 'unknown'] || 0) + 1;
  });
  console.log('\nCategories:', cats);
  console.log('Genders:', genders);
  console.log(`With photos: ${products.filter(p => p.photo_url).length}/${products.length}`);
  console.log(`In stock: ${products.filter(p => p.in_stock).length}/${products.length}`);
  console.log(`With SKU: ${products.filter(p => p.sku).length}/${products.length}`);
  console.log(`With color: ${products.filter(p => p.color).length}/${products.length}`);

  // Sample
  console.log('\nSample (first 5):');
  products.slice(0, 5).forEach(p => {
    console.log(`  ${p.name} | ${p.price}₽ | ${p.color} | ${p.category}/${p.subcategory} | photo: ${p.photo_url ? 'yes' : 'NO'} | stock: ${p.in_stock}`);
  });
}

main().catch(console.error);
