/**
 * Farfetch scraper — собирает товары с листингов и детальных страниц.
 *
 * Использование:
 *   npx tsx scripts/scrape-farfetch.ts
 *
 * Зависимости:
 *   npm install playwright playwright-extra playwright-extra-plugin-stealth
 *   npx playwright install chromium
 *
 * Выход: farfetch-products.csv — готов к импорту через SaaS-админку
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

chromium.use(StealthPlugin());

// --- Конфигурация ---

const CATEGORIES = [
  {
    url: 'https://www.farfetch.com/de/shopping/men/clothing-2/items.aspx',
    gender: 'male',
  },
  {
    url: 'https://www.farfetch.com/de/shopping/women/clothing-1/items.aspx',
    gender: 'female',
  },
  {
    url: 'https://www.farfetch.com/de/shopping/women/dresses-1/items.aspx',
    gender: 'female',
  },
];

const MAX_PRODUCTS_PER_CATEGORY = 37; // все найденные товары (~111 всего)
const DELAY_MS = 2000; // задержка между запросами

// --- Маппинг категорий Farfetch → наши категории ---
const CATEGORY_MAP: Record<string, string> = {
  'Coats': 'outerwear',
  'Jackets': 'outerwear',
  'Blazers': 'outerwear',
  'Dresses': 'tops',
  'Tops': 'tops',
  'Blouses': 'tops',
  'Shirts': 'tops',
  'Knitwear': 'tops',
  'Trousers': 'bottoms',
  'Skirts': 'bottoms',
  'Jeans': 'bottoms',
  'Shorts': 'bottoms',
  'Shoes': 'shoes',
  'Sneakers': 'shoes',
  'Boots': 'shoes',
  'Bags': 'accessories',
  'Accessories': 'accessories',
  'Scarves': 'accessories',
};

function mapCategory(rawCategory: string): string {
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (rawCategory.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return 'tops'; // fallback
}

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

// --- Задержка ---

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Скрапинг листинга ---

async function scrapeListingPage(page: any, url: string, gender: string): Promise<string[]> {
  console.log(`\n  Открываю листинг: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);

  // Отладка: что загрузилось
  const pageTitle = await page.title();
  const pageUrl = page.url();
  console.log(`  Title: "${pageTitle}"`);
  console.log(`  URL: ${pageUrl}`);

  // Прокрутка для подгрузки товаров
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
  await sleep(2000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 2 / 3));
  await sleep(2000);

  // Собираем ссылки — несколько стратегий
  const productLinks = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a[href]'))
      .map((a: any) => a.href as string);

    // Стратегия 1: item- в URL (стандартный формат Farfetch)
    const byItem = allLinks.filter(h => h.includes('/item-'));

    // Стратегия 2: паттерн slug-ЧИСЛА.aspx
    const byAspx = allLinks.filter(h => /\/[a-z][a-z0-9-]+-\d{5,}\.aspx/i.test(h));

    // Стратегия 3: /p- формат
    const byP = allLinks.filter(h => h.includes('/p-') && h.includes('farfetch'));

    // Стратегия 4: data-testid карточек
    const byCard = Array.from(document.querySelectorAll('[data-testid="productCard"] a, [data-component="ProductCard"] a'))
      .map((a: any) => a.href as string)
      .filter(Boolean);

    const combined = [...new Set([...byItem, ...byAspx, ...byP, ...byCard])];

    // Отладка: показываем первые 5 любых ссылок
    const sample = allLinks.slice(0, 5);

    return { links: combined, sample, total: allLinks.length };
  }) as { links: string[]; sample: string[]; total: number };

  console.log(`  Всего ссылок на странице: ${productLinks.total}`);
  console.log(`  Образец первых ссылок: ${JSON.stringify(productLinks.sample)}`);
  console.log(`  Найдено товарных ссылок: ${productLinks.links.length}`);

  return productLinks.links.slice(0, MAX_PRODUCTS_PER_CATEGORY);
}

// --- Скрапинг детальной страницы товара ---

async function scrapeProductPage(page: any, url: string, gender: string): Promise<ScrapedProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(1500);

    const data = await page.evaluate(() => {
      // Попытка найти структурированные данные (JSON-LD)
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of jsonLdScripts) {
        try {
          const json = JSON.parse(script.textContent || '');
          if (json['@type'] === 'Product' || json['@type'] === 'ProductGroup' || json.name) {
            return { source: 'jsonld', data: json };
          }
        } catch {}
      }

      // Fallback: DOM парсинг
      const name = (
        document.querySelector('[data-testid="product-short-description"]') ||
        document.querySelector('h1[class*="product"]') ||
        document.querySelector('h1')
      )?.textContent?.trim();

      const brand = (
        document.querySelector('[data-testid="designers-info-link"]') ||
        document.querySelector('a[class*="designer"]') ||
        document.querySelector('[class*="brand"]')
      )?.textContent?.trim();

      const priceEl = (
        document.querySelector('[data-testid="price"]') ||
        document.querySelector('[class*="price"]')
      )?.textContent?.trim();

      const color = (
        document.querySelector('[data-testid="color-selector-label"]') ||
        document.querySelector('[class*="color"]')
      )?.textContent?.trim();

      const description = (
        document.querySelector('[data-testid="product-description"]') ||
        document.querySelector('[class*="description"]')
      )?.textContent?.trim();

      const category = (
        document.querySelector('[data-testid="breadcrumb"] li:last-child') ||
        document.querySelector('nav[aria-label*="breadcrumb"] li:last-child') ||
        document.querySelector('[class*="breadcrumb"] li:last-child')
      )?.textContent?.trim();

      const sizes = Array.from(
        document.querySelectorAll('[data-testid="size-selector"] button, [class*="size"] button')
      )
        .map((el: any) => el.textContent?.trim())
        .filter(Boolean)
        .slice(0, 8);

      // Изображение
      const img = (
        document.querySelector('img[data-testid="product-image-0"]') ||
        document.querySelector('[class*="gallery"] img') ||
        document.querySelector('img[class*="product"]') ||
        document.querySelector('img')
      ) as HTMLImageElement | null;
      const photoUrl = img?.src || img?.getAttribute('data-src') || '';

      return {
        source: 'dom',
        data: { name, brand, priceEl, color, description, category, sizes, photoUrl },
      };
    });

    if (!data) return null;

    let product: Partial<ScrapedProduct> = { gender, product_url: url };

    if (data.source === 'jsonld') {
      const json = data.data;
      product.name = json.name;
      product.brand = json.brand?.name || json.brand || '';
      product.description = json.description || '';
      product.color = json.color || '';
      product.material = json.material || '';

      // Фото: image может быть строкой, массивом строк или массивом ImageObject
      // Farfetch использует contentUrl внутри ImageObject
      const resolveImage = (img: any): string => {
        if (!img) return '';
        if (typeof img === 'string') return img;
        if (Array.isArray(img)) {
          const first = img[0];
          if (typeof first === 'string') return first;
          return first?.contentUrl || first?.url || '';
        }
        return img.contentUrl || img.url || '';
      };
      product.photo_url = resolveImage(json.image);

      // Цена: offers может быть массивом или в hasVariant[0].offers (ProductGroup)
      let offers = Array.isArray(json.offers) ? json.offers[0] : (json.offers || null);
      if (!offers && json.hasVariant) {
        const variants = Array.isArray(json.hasVariant) ? json.hasVariant : [json.hasVariant];
        const varOffers = variants[0]?.offers;
        offers = Array.isArray(varOffers) ? varOffers[0] : (varOffers || null);
      }
      offers = offers || {};
      const priceRaw = offers.price || offers.lowPrice || offers.highPrice || '0';
      product.price = parseFloat(String(priceRaw).replace(/[^\d.]/g, '')) || 0;
      product.currency = (offers.priceCurrency || 'EUR').replace('€', 'EUR');

      // Размеры
      const itemOffered = offers.itemOffered ?? json.offers?.itemOffered;
      if (itemOffered) {
        const offered = Array.isArray(itemOffered) ? itemOffered : [itemOffered];
        product.sizes = offered
          .map((o: any) => o.size || o.name || '')
          .filter(Boolean)
          .join(',');
      }

      product.category = mapCategory(json.category || json.productLine || '');
      product.subcategory = json.category || json.productLine || '';
    } else {
      const d = data.data;
      product.name = d.name || '';
      product.brand = d.brand || '';
      product.description = d.description || '';
      product.color = d.color || '';
      product.photo_url = d.photoUrl || '';
      product.sizes = (d.sizes || []).join(',');
      product.category = mapCategory(d.category || '');
      product.subcategory = d.category || '';

      // Парсинг цены (например "€ 2 450")
      const priceStr = d.priceEl || '';
      const priceMatch = priceStr.match(/[\d\s.,]+/);
      product.price = priceMatch ? parseFloat(priceMatch[0].replace(/\s/g, '').replace(',', '.')) : 0;
      product.currency = priceStr.includes('€') ? 'EUR' : priceStr.includes('$') ? 'USD' : 'EUR';
    }

    if (!product.name || !product.brand) return null;

    return product as ScrapedProduct;
  } catch (e) {
    console.error(`  Ошибка при парсинге ${url}: ${e}`);
    return null;
  }
}

// --- Сохранение в CSV ---

function toCSV(products: ScrapedProduct[]): string {
  const headers = [
    'name', 'brand', 'category', 'subcategory', 'gender',
    'price', 'currency', 'color', 'material', 'sizes',
    'description', 'product_url', 'photo_url',
  ];

  const escape = (v: string | number) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = products.map((p) =>
    headers.map((h) => escape(p[h as keyof ScrapedProduct] ?? '')).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

// --- Точка входа ---

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browser.newContext({
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8',
    },
  });

  const allProducts: ScrapedProduct[] = [];

  for (const category of CATEGORIES) {
    console.log(`\n===== Категория: ${category.gender} =====`);
    const page = await context.newPage();

    // Блокируем тяжёлые ресурсы
    await page.route('**/*.{woff,woff2,ttf,mp4,gif}', (route) => route.abort());

    try {
      const productUrls = await scrapeListingPage(page, category.url, category.gender);

      for (let i = 0; i < productUrls.length; i++) {
        const url = productUrls[i];
        console.log(`  [${i + 1}/${productUrls.length}] ${url.substring(0, 80)}...`);

        const product = await scrapeProductPage(page, url, category.gender);
        if (product && product.name) {
          allProducts.push(product);
          console.log(`  ✓ ${product.brand} — ${product.name}`);
        } else {
          console.log(`  ✗ Пропущен`);
        }

        await sleep(DELAY_MS + Math.random() * 1000);
      }
    } catch (e) {
      console.error(`Ошибка категории ${category.gender}: ${e}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  if (allProducts.length === 0) {
    console.log('\n⚠️  Товары не собраны. Вероятно, сайт заблокировал запросы.');
    console.log('   Попробуй: запустить с headless: false для отладки,');
    console.log('   или использовать Apify с готовым актором для Farfetch.');
    return;
  }

  const csv = toCSV(allProducts);
  const outPath = path.join(process.cwd(), 'farfetch-products.csv');
  fs.writeFileSync(outPath, csv, 'utf-8');

  console.log(`\n✅ Собрано товаров: ${allProducts.length}`);
  console.log(`📄 Сохранено в: ${outPath}`);
  console.log('\nДалее:');
  console.log('  1. Проверь CSV (открой в Excel/Google Sheets)');
  console.log('  2. Загрузи в SaaS-админку: Каталог → Импорт CSV');
}

main().catch(console.error);
