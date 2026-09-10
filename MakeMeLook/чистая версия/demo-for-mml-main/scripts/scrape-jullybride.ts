/**
 * JullyBride scraper — собирает свадебные платья с первой страницы каталога.
 *
 * Использование:
 *   npx tsx scripts/scrape-jullybride.ts
 *
 * Зависимости:
 *   npm install playwright playwright-extra playwright-extra-plugin-stealth
 *   npx playwright install chromium
 *
 * Выход: jullybride-products.csv — готов к импорту через SaaS-админку
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

chromium.use(StealthPlugin());

// --- Конфигурация ---

const CATALOG_URL = 'https://jullybride.ru/c/wedding/';
const DELAY_MS = 1500;
const BRAND = 'Jully Bride';

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

// --- Скрапинг листинга (только первая страница) ---

async function scrapeListingPage(page: any): Promise<string[]> {
  console.log(`\n  Открываю каталог: ${CATALOG_URL}`);
  await page.goto(CATALOG_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(3000);

  // Подгружаем все товары: кликаем "Загрузить ещё" / скроллим
  let prevCount = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    // Пробуем кликнуть кнопку подгрузки
    const loadMoreBtn = await page.$('.w-grid-loadmore, .loadmore, button:has-text("Загрузить ещё"), a:has-text("Загрузить ещё"), .us-loadmore, [class*="loadmore"], .w-grid-list + .w-grid-loadmore');
    if (loadMoreBtn) {
      try {
        await loadMoreBtn.click();
        console.log(`  Клик "Загрузить ещё" (попытка ${attempt + 1})`);
        await sleep(2500);
      } catch {
        // кнопка могла исчезнуть
      }
    }

    // Прокрутка до конца
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1500);

    // Считаем текущие ссылки
    const currentCount = await page.evaluate(() => {
      const links = new Set<string>();
      document.querySelectorAll('a[href]').forEach((a: any) => {
        const href = a.href as string;
        if (href && /\/p\/[a-z0-9-]+\/?$/i.test(href)) {
          links.add(href);
        }
      });
      return links.size;
    });

    console.log(`  Ссылок на странице: ${currentCount}`);

    if (currentCount === prevCount && !loadMoreBtn) break;
    prevCount = currentCount;
  }

  // Собираем финальный список ссылок
  const result = await page.evaluate(() => {
    const links = new Set<string>();
    document.querySelectorAll('a[href]').forEach((a: any) => {
      const href = a.href as string;
      if (href && /\/p\/[a-z0-9-]+\/?$/i.test(href)) {
        links.add(href.replace(/\/?$/, '/'));
      }
    });
    return Array.from(links);
  });

  console.log(`  Итого товарных ссылок: ${result.length}`);
  return result;
}

// --- Скрапинг детальной страницы товара ---

async function scrapeProductPage(page: any, url: string): Promise<ScrapedProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(1500);

    const data = await page.evaluate(() => {
      // --- JSON-LD ---
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      let jsonLdProduct: any = null;
      for (const script of jsonLdScripts) {
        try {
          const json = JSON.parse(script.textContent || '');
          if (json['@type'] === 'Product') {
            jsonLdProduct = json;
            break;
          }
          // WooCommerce может вложить в @graph
          if (json['@graph']) {
            for (const item of json['@graph']) {
              if (item['@type'] === 'Product') {
                jsonLdProduct = item;
                break;
              }
            }
          }
        } catch {}
      }

      // --- DOM парсинг ---

      // Название
      const nameEl =
        document.querySelector('.product_title') ||
        document.querySelector('h1.entry-title') ||
        document.querySelector('h1[class*="product"]') ||
        document.querySelector('h1');
      const name = nameEl?.textContent?.trim() || '';

      // Цена
      const priceEl =
        document.querySelector('.price ins .woocommerce-Price-amount') ||
        document.querySelector('.price .woocommerce-Price-amount') ||
        document.querySelector('.product-price') ||
        document.querySelector('[class*="price"]');
      const priceText = priceEl?.textContent?.trim() || '';

      // Описание — собираем из нескольких источников
      const descSources = [
        document.querySelector('.woocommerce-product-details__short-description'),
        document.querySelector('#tab-description'),
        document.querySelector('.product-description'),
        document.querySelector('.w-post-elm[class*="content"]'),
        document.querySelector('.entry-content .wpb_wrapper'),
        document.querySelector('.entry-content'),
      ];

      let description = '';
      for (const el of descSources) {
        if (el) {
          // Берём только текстовое содержимое, исключая скрипты и стили
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('script, style, .price, .cart, form, .woocommerce-product-attributes').forEach((rm: any) => rm.remove());
          const text = clone.textContent?.trim().replace(/\s+/g, ' ') || '';
          // Описание должно быть осмысленным (>20 символов) и не дублировать название
          if (text && text.length > 20 && text.length > description.length) {
            description = text;
          }
        }
      }

      // Доп. попытка: все параграфы в контенте
      if (!description) {
        const paragraphs: string[] = [];
        document.querySelectorAll('.entry-content p, .product p, .w-post-elm p').forEach((p: any) => {
          const t = p.textContent?.trim();
          if (t && t.length > 20 && !t.match(/₽|руб|корзин|купить|артикул|sku/i)) {
            paragraphs.push(t);
          }
        });
        description = paragraphs.join(' ');
      }

      // Дополнительная информация (материал, состав и т.д.)
      // WooCommerce хранит в таблице дополнительной информации
      const additionalInfo: Record<string, string> = {};
      document.querySelectorAll('.woocommerce-product-attributes tr, .shop_attributes tr, table.woocommerce-product-attributes tr').forEach((tr: any) => {
        const label = tr.querySelector('th')?.textContent?.trim().toLowerCase() || '';
        const value = tr.querySelector('td p')?.textContent?.trim() || tr.querySelector('td')?.textContent?.trim() || '';
        if (label && value) {
          additionalInfo[label] = value;
        }
      });

      // Также ищем в табах
      const tabContent = document.querySelector('#tab-additional_information');
      if (tabContent) {
        tabContent.querySelectorAll('tr').forEach((tr: any) => {
          const label = tr.querySelector('th')?.textContent?.trim().toLowerCase() || '';
          const value = tr.querySelector('td p')?.textContent?.trim() || tr.querySelector('td')?.textContent?.trim() || '';
          if (label && value) {
            additionalInfo[label] = value;
          }
        });
      }

      // Ищем описание/состав в тексте страницы
      const allText = document.body.innerText || '';
      let materialFromText = '';
      // Только берём строку если она похожа на реальный материал (ткань, не цену)
      const matMatch = allText.match(/(?:состав|материал|ткань)[:\s]*([^\n]{3,80})/i);
      if (matMatch) {
        const candidate = matMatch[1].trim();
        // Фильтруем мусор — не должно содержать цены или длинный текст
        if (!candidate.match(/₽|руб|\d{4,}/) && candidate.length < 80) {
          materialFromText = candidate;
        }
      }

      // Изображения — собираем все из галереи
      const imageUrls: string[] = [];

      // WooCommerce gallery
      document.querySelectorAll('.woocommerce-product-gallery__image img, .woocommerce-product-gallery img').forEach((img: any) => {
        const src = img.getAttribute('data-large_image') || img.getAttribute('data-src') || img.src;
        if (src && !src.includes('placeholder') && !imageUrls.includes(src)) {
          imageUrls.push(src);
        }
      });

      // Fallback: все большие изображения в контенте
      if (imageUrls.length === 0) {
        document.querySelectorAll('.w-post-elm img, .product img, .entry-content img').forEach((img: any) => {
          const src = img.getAttribute('data-large_image') || img.getAttribute('data-src') || img.src;
          if (src && !src.includes('placeholder') && !src.includes('logo') && !imageUrls.includes(src)) {
            imageUrls.push(src);
          }
        });
      }

      // Fallback: OG image
      if (imageUrls.length === 0) {
        const ogImg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
        if (ogImg?.content) imageUrls.push(ogImg.content);
      }

      // Размеры
      const sizes: string[] = [];
      // WooCommerce select вариаций
      document.querySelectorAll('select[name*="size"] option, select[id*="size"] option, .variations select option').forEach((opt: any) => {
        const val = opt.textContent?.trim();
        if (val && val !== '' && val.toLowerCase() !== 'выберите' && !val.toLowerCase().includes('выбрать')) {
          sizes.push(val);
        }
      });
      // Кнопки размеров
      if (sizes.length === 0) {
        document.querySelectorAll('[class*="size"] button, [class*="size"] a, .product-sizes span').forEach((el: any) => {
          const val = el.textContent?.trim();
          if (val) sizes.push(val);
        });
      }

      // Цвет
      let color = additionalInfo['цвет'] || additionalInfo['color'] || '';
      if (!color) {
        document.querySelectorAll('select[name*="color"] option:checked, select[id*="color"] option:checked').forEach((opt: any) => {
          color = opt.textContent?.trim() || '';
        });
      }

      // Коллекция из WooCommerce атрибутов
      const collection = additionalInfo['коллекция'] || additionalInfo['collection'] || '';

      // Подкатегория: силуэт платья из WooCommerce атрибутов
      const silhouette = additionalInfo['силуэт'] || additionalInfo['фасон'] || additionalInfo['тип'] || '';

      return {
        name,
        priceText,
        description,
        additionalInfo,
        materialFromText,
        imageUrls,
        sizes,
        color,
        silhouette,
        collection,
        jsonLdProduct,
      };
    });

    if (!data || !data.name) {
      console.log(`  ✗ Нет названия на ${url}`);
      return null;
    }

    // Парсинг цены
    const priceClean = data.priceText.replace(/[^\d.,]/g, '').replace(/\s/g, '');
    const price = parseFloat(priceClean.replace(',', '.')) || 0;

    // Валидация: материал должен быть названием ткани, не фрагментом описания
    const KNOWN_MATERIALS = ['атлас', 'кружево', 'тафта', 'шёлк', 'шелк', 'органза', 'фатин', 'шифон', 'сатин', 'микадо', 'креп', 'бархат', 'тюль', 'жоржет', 'гипюр', 'полиэстер', 'хлопок', 'вискоза', 'нейлон', 'эластан'];
    const isValidMaterial = (s: string) => {
      if (!s || s.length > 80) return false;
      if (/₽|руб|\d{4,}|ляла|платье|силуэт|образ|невест|деталями|линии|делают/.test(s.toLowerCase())) return false;
      // Должен содержать хотя бы одно известное слово ткани
      const lower = s.toLowerCase();
      return KNOWN_MATERIALS.some(m => lower.includes(m));
    };

    // Материал: приоритет — доп. инфо > текст страницы > JSON-LD
    const materialCandidates = [
      data.additionalInfo['материал'],
      data.additionalInfo['состав'],
      data.additionalInfo['ткань'],
      data.additionalInfo['fabric'],
      data.additionalInfo['composition'],
      data.materialFromText,
      data.jsonLdProduct?.material,
    ];
    let material = '';
    for (const candidate of materialCandidates) {
      if (candidate && isValidMaterial(candidate)) {
        material = candidate;
        break;
      }
    }

    // Описание: собираем из всех источников
    let description = data.description;
    if (!description && data.jsonLdProduct?.description) {
      description = data.jsonLdProduct.description.replace(/<[^>]+>/g, '').trim();
    }

    // Убираем лишние пробелы и переносы
    description = description.replace(/\s+/g, ' ').trim();

    // Название: убираем бренд из начала если есть
    let productName = data.name;
    if (data.jsonLdProduct?.name) {
      productName = data.jsonLdProduct.name;
    }

    const product: ScrapedProduct = {
      name: productName,
      brand: BRAND,
      category: 'dresses',
      subcategory: data.collection || data.silhouette || 'Свадебные платья',
      gender: 'female',
      price,
      currency: 'RUB',
      color: data.color || 'Айвори',
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
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8',
    },
  });

  const page = await context.newPage();

  // Блокируем тяжёлые ресурсы
  await page.route('**/*.{woff,woff2,ttf,mp4,gif}', (route: any) => route.abort());

  try {
    // Шаг 1: собираем ссылки с первой страницы
    const productUrls = await scrapeListingPage(page);

    if (productUrls.length === 0) {
      console.log('\n⚠️  Товарные ссылки не найдены. Проверьте структуру страницы.');
      await browser.close();
      return;
    }

    console.log(`\n===== Парсинг ${productUrls.length} товаров =====\n`);

    // Шаг 2: обходим каждую страницу товара
    const allProducts: ScrapedProduct[] = [];

    for (let i = 0; i < productUrls.length; i++) {
      const url = productUrls[i];
      console.log(`  [${i + 1}/${productUrls.length}] ${url}`);

      const product = await scrapeProductPage(page, url);
      if (product && product.name) {
        allProducts.push(product);
        console.log(`  ✓ ${product.name} — ${product.price} ₽`);
      } else {
        console.log(`  ✗ Пропущен`);
      }

      await sleep(DELAY_MS + Math.random() * 500);
    }

    await browser.close();

    if (allProducts.length === 0) {
      console.log('\n⚠️  Товары не собраны.');
      return;
    }

    const csv = toCSV(allProducts);
    const outPath = path.join(process.cwd(), 'jullybride-products.csv');
    fs.writeFileSync(outPath, csv, 'utf-8');

    console.log(`\n✅ Собрано товаров: ${allProducts.length}`);
    console.log(`📄 Сохранено в: ${outPath}`);
    console.log('\nДалее:');
    console.log('  1. Проверь CSV (открой в Excel/Google Sheets)');
    console.log('  2. Загрузи в SaaS-админку: Каталог → Импорт CSV');
  } catch (e) {
    console.error(`Ошибка: ${e}`);
    await browser.close();
  }
}

main().catch(console.error);
