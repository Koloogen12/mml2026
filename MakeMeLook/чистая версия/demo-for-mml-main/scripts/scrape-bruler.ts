/**
 * Bruler scraper — собирает весь каталог https://bruler.ru/catalog
 *
 * Использование:
 *   npx tsx scripts/scrape-bruler.ts
 *
 * Зависимости:
 *   npm install playwright playwright-extra playwright-extra-plugin-stealth
 *   npx playwright install chromium
 *
 * Выход: bruler-products.csv — готов к импорту через SaaS-админку
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

chromium.use(StealthPlugin());

// --- Конфигурация ---

const CATALOG_URL = 'https://bruler.ru/catalog';
const DELAY_MS = 1200;
const BRAND = 'Brûler';

// --- Маппинг URL-категорий сайта → категории бэкенда ---
const URL_CATEGORY_MAP: Array<[RegExp, string]> = [
  [/\/(t-shirt|t-shirts)\//, 'tops'],
  [/\/(hoodie|hoodies)\//, 'tops'],
  [/\/sweaters\//, 'tops'],
  [/\/(zip-hoodie|zip-hoodies)\//, 'tops'],
  [/\/half-zips\//, 'tops'],
  [/\/shirts\//, 'tops'],
  [/\/(anorak|anoraks)\//, 'outerwear'],
  [/\/verxniaia-odezda\//, 'outerwear'],
  [/\/jeans\//, 'bottoms'],
  [/\/(briuki|pants)\//, 'bottoms'],
  [/\/accessories\//, 'accessories'],
];

const SUBCATEGORY_MAP: Record<string, string> = {
  't-shirt': 'Футболки',
  't-shirts': 'Футболки',
  'hoodie': 'Худи',
  'hoodies': 'Худи',
  'sweaters': 'Свитера',
  'zip-hoodie': 'Зип-худи',
  'zip-hoodies': 'Зип-худи',
  'half-zips': 'Half-zip',
  'shirts': 'Рубашки',
  'anorak': 'Анораки',
  'anoraks': 'Анораки',
  'verxniaia-odezda': 'Верхняя одежда',
  'jeans': 'Джинсы',
  'briuki': 'Брюки',
  'pants': 'Брюки',
  'accessories': 'Аксессуары',
};

function mapCategoryFromUrl(url: string): { category: string; subcategory: string } {
  for (const [re, cat] of URL_CATEGORY_MAP) {
    if (re.test(url)) {
      // Извлекаем сегмент для подкатегории
      const m = url.match(/bruler\.ru\/([^/]+)\//);
      const seg = m?.[1] || '';
      return { category: cat, subcategory: SUBCATEGORY_MAP[seg] || '' };
    }
  }
  return { category: 'tops', subcategory: '' };
}

// Исключаем нерелевантные URL
const SKIP_PATTERNS = [/\/gift-cards?\//, /\/podarocnyi-sertifikat\//, /сertifecat/];

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

// --- Скрапинг каталога ---

async function scrapeListingPage(page: any): Promise<string[]> {
  console.log(`\n  Открываю каталог: ${CATALOG_URL}`);
  await page.goto(CATALOG_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);

  // Агрессивный скролл для infinite scroll / lazy load
  let prevCount = 0;
  let stableCount = 0;
  for (let attempt = 0; attempt < 50; attempt++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1200);

    // Пробуем кликнуть "Показать ещё" если есть
    const loadMoreBtn = await page.$('button:has-text("Показать"), button:has-text("Загрузить"), .load-more, .show-more');
    if (loadMoreBtn) {
      try {
        await loadMoreBtn.click();
        await sleep(1500);
      } catch {}
    }

    const currentCount = await page.evaluate(() => {
      const links = new Set<string>();
      document.querySelectorAll('a[href]').forEach((a: any) => {
        const href = a.href as string;
        if (href && href.includes('bruler.ru/') && /\/[a-z-]+\/[a-z0-9-]+$/i.test(new URL(href).pathname)) {
          links.add(href);
        }
      });
      return links.size;
    });

    console.log(`  Ссылок на странице: ${currentCount}`);

    if (currentCount === prevCount) {
      stableCount++;
      if (stableCount >= 3) break;
    } else {
      stableCount = 0;
    }
    prevCount = currentCount;
  }

  // Собираем финальный список ссылок на товары
  const result = await page.evaluate(() => {
    const links = new Set<string>();
    const skipSegments = new Set(['catalog', 'about', 'contacts', 'delivery', 'return', 'lookbook', 'login', 'register', 'cart', 'checkout', 'wishlist', 'blog', 'news', 'faq', 'terms', 'privacy']);

    document.querySelectorAll('a[href]').forEach((a: any) => {
      const href = a.href as string;
      if (!href || !href.includes('bruler.ru/')) return;
      try {
        const u = new URL(href);
        const parts = u.pathname.split('/').filter(Boolean);
        // Паттерн: /{category}/{slug}
        if (parts.length === 2 && !skipSegments.has(parts[0])) {
          links.add(u.origin + u.pathname);
        }
      } catch {}
    });

    return Array.from(links);
  });

  console.log(`  Итого товарных ссылок: ${result.length}`);
  return result.filter(url => !SKIP_PATTERNS.some(p => p.test(url)));
}

// --- Скрапинг детальной страницы ---

async function scrapeProductPage(page: any, url: string): Promise<ScrapedProduct | null> {
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (resp && resp.status() >= 400) {
      console.log(`  ✗ ${resp.status()} на ${url}`);
      return null;
    }
    await sleep(2500);

    const data = await page.evaluate(() => {
      // --- window.productData (Livewire) ---
      const productData: any = (window as any).productData || null;

      // --- Название ---
      const nameEl = document.querySelector('h1');
      const name = nameEl?.textContent?.trim() || productData?.name || '';

      // --- Описание из Alpine.js биндинга x-html="text" ---
      // Это самый надёжный источник на bruler — полный текст описания
      let description = '';
      document.querySelectorAll('[x-html="text"]').forEach((el: any) => {
        const t = el.textContent?.trim().replace(/\s+/g, ' ') || '';
        if (t.length > description.length) description = t;
      });

      // Fallback: ищем элемент со словом "Описание" в заголовке и берём следующий текст
      if (!description) {
        const bodyText = document.body.innerText || '';
        const descIdx = bodyText.indexOf('Описание');
        if (descIdx >= 0) {
          const after = bodyText.slice(descIdx + 8, descIdx + 1500);
          // Обрезаем до следующего заголовка
          const cut = after.split(/Уход и технологии|Доставка и возврат|Задать вопрос|Похожие товары/)[0];
          description = cut.trim().replace(/\s+/g, ' ');
        }
      }

      // --- Размеры: кнопки .btn-outlined с текстом-размером ---
      const sizes: string[] = [];
      document.querySelectorAll('button').forEach((btn: any) => {
        const t = btn.textContent?.trim() || '';
        if (/^(XS|S|M|L|XL|XXL|XXXL)$/.test(t) && !sizes.includes(t)) {
          sizes.push(t);
        }
      });

      // --- Артикул ---
      let article = '';
      document.querySelectorAll('[x-text="article"]').forEach((el: any) => {
        const t = el.textContent?.trim() || '';
        if (t) article = t;
      });

      // --- Состав / материал — пытаемся извлечь из описания и "Уход и технологии" ---
      const bodyText = document.body.innerText || '';
      let material = '';

      // Паттерн: "Состав: ..." или "Материал: ..."
      const matPatterns = [
        /(?:состав(?:\s*:)?)\s*([^\n.]{5,200})/i,
        /(?:материал(?:\s*:)?)\s*([^\n.]{5,200})/i,
        /(?:composition|fabric)\s*:?\s*([^\n.]{5,200})/i,
      ];
      for (const re of matPatterns) {
        const m = bodyText.match(re);
        if (m) {
          const candidate = m[1].trim();
          // Валидация: должен содержать % или название ткани
          if (candidate.match(/%|хлопок|полиэстер|шерсть|эластан|нейлон|вискоза|пряжа|акрил|хб|cotton|wool|polyester/i)) {
            material = candidate.split(/[;]/)[0].trim();
            break;
          }
        }
      }

      // Fallback: из описания — ищем "из X" (например "из смесовой пряжи")
      if (!material && description) {
        const m = description.match(/из\s+([а-яё\s]{3,40}(?:пряжи|хлопка|шерсти|материала|ткани|полиэстера|нейлона|вискозы|флиса|денима|джинс[ыа]))/i);
        if (m) material = m[1].trim();
      }

      // --- Изображения ---
      const imageUrls: string[] = [];
      document.querySelectorAll('img').forEach((img: any) => {
        let src = img.getAttribute('data-src') || img.src || '';
        if (src && src.includes('/storage/products/') && !imageUrls.includes(src)) {
          imageUrls.push(src);
        }
      });

      // --- Цена: из productData или из текста ---
      let priceText = '';
      // Ищем текст с ₽ в ближайших элементах рядом с заголовком
      const priceRe = /(\d[\d\s]*)\s*₽/;
      const m = bodyText.match(priceRe);
      if (m) priceText = m[1];

      // OG image fallback
      if (imageUrls.length === 0) {
        const og = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
        if (og?.content) imageUrls.push(og.content);
      }

      return {
        name,
        priceText,
        description,
        material,
        article,
        sizes,
        imageUrls,
        productData,
        bodyText: bodyText.slice(0, 3000),
      };
    });

    if (!data || !data.name) return null;

    // --- Цена ---
    let price = 0;
    if (data.productData?.price) {
      price = Number(data.productData.price) || 0;
    }
    if (!price) {
      const priceClean = data.priceText.replace(/[^\d]/g, '');
      price = parseInt(priceClean, 10) || 0;
    }

    // --- Категория из URL ---
    const { category, subcategory } = mapCategoryFromUrl(url);

    // --- Цвет из названия ---
    let color = '';
    const colorKeywords: Record<string, string> = {
      'black': 'Чёрный', 'white': 'Белый', 'gray': 'Серый', 'grey': 'Серый',
      'melange': 'Меланж', 'blue': 'Синий', 'navy': 'Тёмно-синий', 'dark blue': 'Тёмно-синий',
      'green': 'Зелёный', 'red': 'Красный', 'brown': 'Коричневый', 'beige': 'Бежевый',
      'milky': 'Молочный', 'milk': 'Молочный', 'burgundy': 'Бордовый',
      'violet': 'Фиолетовый', 'purple': 'Фиолетовый', 'pink': 'Розовый',
      'graphite': 'Графитовый', 'camouflage': 'Камуфляж', 'khaki': 'Хаки',
      'azur': 'Лазурный', 'orange': 'Оранжевый', 'yellow': 'Жёлтый',
    };
    const nameLower = data.name.toLowerCase();
    for (const [en, ru] of Object.entries(colorKeywords)) {
      if (nameLower.includes(en)) {
        color = ru;
        break;
      }
    }

    // --- Описание ---
    const description = (data.description || '').replace(/\s+/g, ' ').trim().slice(0, 1900);

    // --- Материал: валидация, обрезка ---
    let material = data.material || '';
    if (material.length > 200) material = material.slice(0, 200);

    const product: ScrapedProduct = {
      name: data.name,
      brand: BRAND,
      category,
      subcategory,
      gender: 'unisex',
      price,
      currency: 'RUB',
      color,
      material,
      sizes: data.sizes.join(','),
      description,
      product_url: url,
      photo_url: data.imageUrls[0] || '',
    };

    return product;
  } catch (e) {
    console.error(`  Ошибка при парсинге ${url}: ${e}`);
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
  const escape = (v: string | number) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };
  const rows = products.map((p) =>
    headers.map((h) => escape(p[h as keyof ScrapedProduct] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// --- Main ---

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8' },
  });

  const page = await context.newPage();
  await page.route('**/*.{woff,woff2,ttf,mp4,gif}', (route: any) => route.abort());

  try {
    const productUrls = await scrapeListingPage(page);

    if (productUrls.length === 0) {
      console.log('\n⚠️  Товарные ссылки не найдены.');
      await browser.close();
      return;
    }

    console.log(`\n===== Парсинг ${productUrls.length} товаров =====\n`);
    const allProducts: ScrapedProduct[] = [];

    for (let i = 0; i < productUrls.length; i++) {
      const url = productUrls[i];
      console.log(`  [${i + 1}/${productUrls.length}] ${url.replace('https://bruler.ru', '')}`);

      const product = await scrapeProductPage(page, url);
      if (product && product.name && product.price > 0) {
        allProducts.push(product);
        console.log(`  ✓ ${product.name} — ${product.price} ₽ [${product.sizes || 'no sizes'}]`);
      } else {
        console.log(`  ✗ Пропущен`);
      }

      await sleep(DELAY_MS + Math.random() * 400);
    }

    await browser.close();

    if (allProducts.length === 0) {
      console.log('\n⚠️  Товары не собраны.');
      return;
    }

    const csv = toCSV(allProducts);
    const outPath = path.join(process.cwd(), 'bruler-products.csv');
    fs.writeFileSync(outPath, csv, 'utf-8');

    console.log(`\n✅ Собрано товаров: ${allProducts.length}`);
    console.log(`📄 Сохранено в: ${outPath}`);
  } catch (e) {
    console.error(`Ошибка: ${e}`);
    await browser.close();
  }
}

main().catch(console.error);
