/**
 * domvesta.ru scraper — свадебные платья
 *
 * Использование:
 *   npx tsx scripts/scrape-domvesta.ts
 *   npx tsx scripts/scrape-domvesta.ts --pages 5   # первые 5 страниц (~180 товаров)
 *
 * Выход: domvesta-products.csv — готов к импорту через SaaS-админку
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Конфигурация ---

const BASE_URL = 'https://domvesta.ru';
const CATALOG_URL = `${BASE_URL}/catalog/svadebnye-platya/`;
const PRODUCTS_PER_PAGE = 36;
const DELAY_MS = 800;

// Сколько страниц парсить (null = все ~42)
const MAX_PAGES = parseInt(process.argv[process.argv.indexOf('--pages') + 1] || '3', 10) || 3;

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
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractMeta(html: string, itemprop: string): string {
  const m = html.match(new RegExp(`<meta[^>]+itemprop=["']${itemprop}["'][^>]+content=["']([^"']+)["']`, 'i'));
  return m?.[1] ?? '';
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// --- Парсинг листинга ---

function extractProductLinks(html: string): string[] {
  const links: string[] = [];
  // ищем href внутри .dresses__product
  const blocks = html.match(/<div[^>]+class="[^"]*dresses__product[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi) || [];

  if (blocks.length === 0) {
    // fallback: ищем все ссылки на товары каталога
    const re = /href="(\/catalog\/svadebnye-platya\/[^/"]+\/)"/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (!links.includes(m[1])) links.push(m[1]);
    }
    return links;
  }

  for (const block of blocks) {
    const m = block.match(/href="(\/catalog\/svadebnye-platya\/[^/"]+\/)"/i);
    if (m) links.push(m[1]);
  }
  return [...new Set(links)];
}

// --- Парсинг страницы товара ---

// Извлекает все поля info-list за один проход
function extractInfoList(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Ищем все пары title/value в product-page__info-list
  const listMatch = html.match(/<ul[^>]*class="[^"]*product-page__info-list[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
  const block = listMatch?.[1] ?? html;

  const itemRe = /<li[^>]*class="[^"]*list-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let item;
  while ((item = itemRe.exec(block)) !== null) {
    const labelM = item[1].match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const valueM = item[1].match(/<span[^>]*class="[^"]*value[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    if (labelM && valueM) {
      const label = stripTags(labelM[1]).replace(/\s+/g, ' ').trim();
      const value = stripTags(valueM[1]).replace(/\s+/g, ' ').trim();
      if (label) result[label] = value;
    }
  }
  return result;
}

function extractMainImage(html: string): string {
  // Изображение в src атрибуте img — 900px версия из upload
  const patterns = [
    /<img[^>]+src="(\/upload\/[^"]*900_900[^"]*\.jpg)"/i,
    /<img[^>]+src="(\/upload\/[^"]*1500[^"]*\.jpg)"/i,
    /<img[^>]+src="(\/upload\/resize_cache\/iblock\/[^"]+\.jpg)"/i,
    /<img[^>]+src="(\/upload\/iblock\/[^"]+\.jpg)"/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1] && !m[1].includes('spacer') && !m[1].includes('icon')) {
      return `${BASE_URL}${m[1]}`;
    }
  }
  return '';
}

async function scrapeProduct(slug: string): Promise<ScrapedProduct | null> {
  const url = `${BASE_URL}${slug}`;
  try {
    const html = await fetchPage(url);

    const price = parseFloat(extractMeta(html, 'price') || '0');
    const currency = extractMeta(html, 'priceCurrency') || 'RUB';

    const info = extractInfoList(html);
    const brand = info['Бренд'] || info['Производитель'] || 'Domvesta';
    const modelName = info['Название'] || '';
    const color = info['Цвет'] || '';
    const material = info['Ткань'] || info['Материал'] || '';
    const sizes = info['Размеры'] || info['Размер'] || '';
    const subcategory = info['Тип'] || info['Юбка'] || 'Свадебное платье';

    // Название: "Бренд Модель" или просто бренд если нет модели
    const name = modelName ? `${brand} ${modelName}` : (info['Артикул'] ? `${brand} #${info['Артикул']}` : brand);

    // Описание
    const descMatch = html.match(/itemprop="description"[^>]*>([\s\S]*?)<\/(?:div|p|span)>/i);
    const description = descMatch ? stripTags(descMatch[1]).slice(0, 500) : '';

    const photo_url = extractMainImage(html);

    if (price === 0) return null;

    return {
      name,
      brand,
      category: 'dresses',
      subcategory,
      gender: 'female',
      price,
      currency,
      color,
      material,
      sizes,
      description,
      product_url: url,
      photo_url,
    };
  } catch (e) {
    console.error(`  ✗ Ошибка ${slug}: ${e}`);
    return null;
  }
}

// --- CSV ---

function toCSV(products: ScrapedProduct[]): string {
  const headers = [
    'name', 'brand', 'category', 'subcategory', 'gender',
    'price', 'currency', 'color', 'material', 'sizes',
    'description', 'product_url', 'photo_url',
  ];
  const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = products.map((p) =>
    headers.map((h) => escape(p[h as keyof ScrapedProduct] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// --- Точка входа ---

async function main() {
  console.log(`\n🌸 domvesta.ru — свадебные платья`);
  console.log(`   Парсим ${MAX_PAGES} стр. (~${MAX_PAGES * PRODUCTS_PER_PAGE} товаров)\n`);

  const allLinks: string[] = [];

  // Собираем ссылки с листингов
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? CATALOG_URL : `${CATALOG_URL}?PAGEN_1=${page}`;
    process.stdout.write(`  Страница ${page}/${MAX_PAGES}... `);
    try {
      const html = await fetchPage(url);
      const links = extractProductLinks(html);
      console.log(`${links.length} ссылок`);
      allLinks.push(...links);
      await sleep(DELAY_MS);
    } catch (e) {
      console.log(`ошибка: ${e}`);
    }
  }

  const uniqueLinks = [...new Set(allLinks)];
  console.log(`\n  Уникальных товаров: ${uniqueLinks.length}`);
  console.log(`  Парсим детальные страницы...\n`);

  const products: ScrapedProduct[] = [];

  for (let i = 0; i < uniqueLinks.length; i++) {
    const slug = uniqueLinks[i];
    process.stdout.write(`  [${i + 1}/${uniqueLinks.length}] ${slug.split('/').slice(-2)[0]}... `);
    const product = await scrapeProduct(slug);
    if (product) {
      products.push(product);
      console.log(`✓ ${product.brand} — ${product.name} — ${product.price.toLocaleString('ru')} ₽`);
    } else {
      console.log(`✗ пропущен`);
    }
    await sleep(DELAY_MS + Math.random() * 400);
  }

  if (products.length === 0) {
    console.log('\n⚠️  Товары не собраны.');
    return;
  }

  // Статистика фото
  const withPhoto = products.filter(p => p.photo_url).length;

  const csv = toCSV(products);
  const outPath = path.join(process.cwd(), 'domvesta-products.csv');
  fs.writeFileSync(outPath, csv, 'utf-8');

  console.log(`\n✅ Собрано: ${products.length} товаров`);
  console.log(`🖼  С фото: ${withPhoto}/${products.length}`);
  console.log(`📄 Сохранено в: ${outPath}`);
}

main().catch(console.error);
