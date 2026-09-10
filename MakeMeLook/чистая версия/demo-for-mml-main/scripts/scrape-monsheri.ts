/**
 * monsheri.ru scraper — новая коллекция
 *
 * Использование:
 *   npx tsx scripts/scrape-monsheri.ts
 *
 * Выход: monsheri-products.csv — готов к импорту через SaaS-админку
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Конфигурация ---

const BASE_URL = 'https://monsheri.ru';
const COLLECTION_URL = `${BASE_URL}/new-collection/`;
const DELAY_MS = 800;

// --- Типы ---

interface ScrapedProduct {
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  gender: string;
  price: number;
  currency: string;
  color: string;
  material: string;
  sizes: string;
  description: string;
  product_url: string;
  photo_url: string;
}

// --- Утилиты ---

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8381;/g, '₽')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// --- Парсинг листинга ---

function extractProductLinks(html: string): string[] {
  const links: string[] = [];

  // Основной паттерн: ссылки в карточках товаров WooCommerce
  // Ищем href внутри h3.wd-entities-title и a.product-image-link
  const re = /href="(https:\/\/monsheri\.ru\/katalog\/[^"]+\/)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (!links.includes(m[1])) links.push(m[1]);
  }

  return links;
}

// --- Парсинг атрибутов из таблицы WooCommerce ---

function extractAttributeTable(html: string): Record<string, string> {
  const result: Record<string, string> = {};

  const tableMatch = html.match(
    /<table[^>]*class="[^"]*woocommerce-product-attributes[^"]*"[^>]*>([\s\S]*?)<\/table>/i
  );
  if (!tableMatch) return result;

  const rowRe = /<tr[^>]*class="[^"]*woocommerce-product-attributes-item[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(tableMatch[1])) !== null) {
    const labelM = row[1].match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    const valueM = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (labelM && valueM) {
      const label = stripTags(labelM[1]).trim();
      const value = stripTags(valueM[1]).trim();
      if (label) result[label] = decodeEntities(value);
    }
  }

  return result;
}

// --- Парсинг размеров ---

function extractSizes(html: string): string {
  const sizes: string[] = [];

  // Из select[name="attribute_pa_razmer"]
  const selectMatch = html.match(
    /<select[^>]*name="attribute_pa_razmer"[^>]*>([\s\S]*?)<\/select>/i
  );
  if (selectMatch) {
    const optionRe = /<option[^>]*value="([^"]+)"[^>]*>/gi;
    let opt: RegExpExecArray | null;
    while ((opt = optionRe.exec(selectMatch[1])) !== null) {
      if (opt[1] && opt[1] !== '') sizes.push(opt[1]);
    }
  }

  // Fallback: swatch-элементы
  if (sizes.length === 0) {
    const swatchRe = /data-id="pa_razmer"[\s\S]*?<\/div>\s*<\/div>/i;
    const swatchBlock = html.match(swatchRe)?.[0] || '';
    const valRe = /data-value="([^"]+)"/gi;
    let sw: RegExpExecArray | null;
    while ((sw = valRe.exec(swatchBlock)) !== null) {
      sizes.push(sw[1]);
    }
  }

  return sizes.join(', ');
}

// --- Парсинг цвета ---

function extractColor(html: string, url: string, attrs: Record<string, string>): string {
  // 1. Из атрибутов таблицы
  const colorFromAttrs =
    attrs['Цвет'] || attrs['цвет'] || attrs['Цвет изделия'] || attrs['Color'] || '';
  if (colorFromAttrs) return colorFromAttrs;

  // 2. Из select[name="attribute_pa_tsvet"]
  const selectMatch = html.match(
    /<select[^>]*name="attribute_pa_tsvet"[^>]*>([\s\S]*?)<\/select>/i
  );
  if (selectMatch) {
    const optM = selectMatch[1].match(/<option[^>]*value="([^"]+)"[^>]*>/i);
    if (optM?.[1]) return decodeEntities(optM[1]);
  }

  // 3. Из URL (последний сегмент slug — обычно содержит цвет)
  const slugMatch = url.match(/\/([^/]+)\/?$/);
  if (slugMatch) {
    // убираем название товара, оставляем цветовой суффикс
    const parts = slugMatch[1].split('-');
    if (parts.length > 1) return parts[parts.length - 1];
  }

  return '';
}

// --- Парсинг главного фото ---

function extractMainImage(html: string): string {
  // data-large_image — полноразмерное фото из WooCommerce Gallery
  const m = html.match(/data-large_image="([^"]+)"/);
  if (m?.[1]) return m[1];

  // Fallback: первый src из gallery
  const galleryMatch = html.match(
    /woocommerce-product-gallery__image[\s\S]*?<img[^>]*src="([^"]+)"/i
  );
  if (galleryMatch?.[1]) return galleryMatch[1];

  return '';
}

// --- Парсинг категории из URL ---

function extractCategoryFromUrl(url: string): { category: string; subcategory: string } {
  // URL: /katalog/[category]/[subcategory]/[slug]/
  const parts = url.replace(BASE_URL, '').replace(/^\/katalog\//, '').split('/').filter(Boolean);

  const rawCat = parts[0] || '';
  const rawSub = parts[1] || rawCat;

  // Маппинг slug → понятное название
  const MAP: Record<string, string> = {
    'platya': 'dresses',
    'yubki': 'bottoms',
    'yubki-shorty': 'bottoms',
    'bryuki': 'bottoms',
    'dzhinsy': 'bottoms',
    'shorty': 'bottoms',
    'bluzki': 'tops',
    'futbolki': 'tops',
    'kofty': 'tops',
    'svitery': 'tops',
    'verhnyaya-odezhda': 'outerwear',
    'palto': 'outerwear',
    'kurtki': 'outerwear',
    'aksessuary': 'accessories',
    'sumki': 'accessories',
  };

  let category = 'tops';
  for (const [key, val] of Object.entries(MAP)) {
    if (rawCat.includes(key)) {
      category = val;
      break;
    }
  }

  // Подкатегория — человекочитаемая версия slug
  const subcategory = rawSub
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return { category, subcategory };
}

// --- Парсинг описания ---

function extractDescription(html: string): string {
  // Описание из вкладки WooCommerce
  const tabMatch = html.match(
    /<div[^>]*class="[^"]*woocommerce-Tabs-panel--description[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i
  );
  if (tabMatch) {
    return stripTags(tabMatch[1]).slice(0, 800).trim();
  }

  // Fallback: short description
  const shortMatch = html.match(
    /<div[^>]*class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (shortMatch) {
    return stripTags(shortMatch[1]).slice(0, 800).trim();
  }

  return '';
}

// --- Парсинг страницы товара ---

async function scrapeProduct(url: string): Promise<ScrapedProduct | null> {
  try {
    const html = await fetchPage(url);

    // Название
    const titleMatch = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
    const name = titleMatch ? decodeEntities(stripTags(titleMatch[1])) : '';
    if (!name) return null;

    // Цена (числовая)
    const priceMatch = html.match(/<bdi>([\d\s.,]+)<span[^>]*>&#8381;<\/span><\/bdi>/);
    const priceStr = priceMatch ? priceMatch[1].replace(/\s/g, '').replace(',', '.') : '0';
    const price = parseFloat(priceStr) || 0;

    // Атрибуты из таблицы
    const attrs = extractAttributeTable(html);
    const material = attrs['Состав'] || attrs['Материал'] || attrs['состав'] || '';

    // Остальные поля
    const sizes = extractSizes(html);
    const color = extractColor(html, url, attrs);
    const photo_url = extractMainImage(html);
    const description = extractDescription(html);
    const { category, subcategory } = extractCategoryFromUrl(url);

    return {
      name,
      brand: 'Mon Sheri',
      category,
      subcategory,
      gender: 'female',
      price,
      currency: 'RUB',
      color,
      material,
      sizes,
      description,
      product_url: url,
      photo_url,
    };
  } catch (e) {
    console.error(`  ✗ Ошибка ${url}: ${e}`);
    return null;
  }
}

// --- CSV ---

function toCSV(products: ScrapedProduct[]): string {
  const headers: (keyof ScrapedProduct)[] = [
    'name', 'brand', 'category', 'subcategory', 'gender',
    'price', 'currency', 'color', 'material', 'sizes',
    'description', 'product_url', 'photo_url',
  ];
  const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = products.map((p) => headers.map((h) => escape(p[h] ?? '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}

// --- Точка входа ---

async function main() {
  console.log('\n Mon Sheri — новая коллекция');
  console.log(`   ${COLLECTION_URL}\n`);

  // Шаг 1: собираем ссылки с листинга
  process.stdout.write('  Загружаю листинг... ');
  const html = await fetchPage(COLLECTION_URL);
  const links = extractProductLinks(html);
  console.log(`${links.length} товаров найдено`);

  if (links.length === 0) {
    console.log('\n⚠️  Ссылки на товары не найдены. Возможно, изменилась структура страницы.');
    return;
  }

  // Шаг 2: парсим каждую страницу товара
  console.log('  Парсим детальные страницы...\n');
  const products: ScrapedProduct[] = [];

  for (let i = 0; i < links.length; i++) {
    const url = links[i];
    const slug = url.split('/').filter(Boolean).pop() ?? url;
    process.stdout.write(`  [${i + 1}/${links.length}] ${slug}... `);

    const product = await scrapeProduct(url);
    if (product) {
      products.push(product);
      const priceStr = product.price > 0 ? `${product.price.toLocaleString('ru')} ₽` : 'цена?';
      console.log(`✓ ${product.name} — ${priceStr}`);
    } else {
      console.log('✗ пропущен');
    }

    await sleep(DELAY_MS + Math.random() * 400);
  }

  if (products.length === 0) {
    console.log('\n⚠️  Товары не собраны.');
    return;
  }

  // Статистика
  const withPhoto = products.filter((p) => p.photo_url).length;
  const withMaterial = products.filter((p) => p.material).length;
  const withDesc = products.filter((p) => p.description).length;

  // Сохранение
  const csv = toCSV(products);
  const outPath = path.join(process.cwd(), 'monsheri-products.csv');
  fs.writeFileSync(outPath, csv, 'utf-8');

  console.log(`\n✅ Собрано: ${products.length} товаров`);
  console.log(`   С фото: ${withPhoto}/${products.length}`);
  console.log(`   С составом: ${withMaterial}/${products.length}`);
  console.log(`   С описанием: ${withDesc}/${products.length}`);
  console.log(`\n📄 Сохранено в: ${outPath}`);
  console.log('\nДалее:');
  console.log('  1. Проверь CSV (Excel / Google Sheets)');
  console.log('  2. Загрузи в SaaS-админку: Каталог → Импорт CSV');
}

main().catch(console.error);
