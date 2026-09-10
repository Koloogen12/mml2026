import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ locale: 'ru-RU', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('https://bruler.ru/sweaters/cardigantravailtardblack', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));

  // Print all h1-h3 and key class elements
  const snapshot = await page.evaluate(() => {
    const out: any = { sizes: [], material: '', description: '', priceBlock: '', classes: [] };

    // Все кнопки, в которых может быть размер
    const sizeButtons: string[] = [];
    document.querySelectorAll('button, [role="button"], label, span, div').forEach((el: any) => {
      const t = el.textContent?.trim() || '';
      if (/^(XS|S|M|L|XL|XXL)$/.test(t) && t.length <= 4) {
        sizeButtons.push(`${el.tagName}.${el.className} [${t}]`);
      }
    });
    out.sizes = sizeButtons.slice(0, 20);

    // Текст страницы
    const body = document.body.innerText;
    out.bodyFirst3000 = body.slice(0, 3000);
    out.bodyContainsSostav = body.includes('Состав') || body.includes('состав');
    out.bodyContainsOpisanie = body.includes('Описание') || body.includes('описание');

    // Все элементы с классом, содержащим size/desc/material
    const classMatches: string[] = [];
    document.querySelectorAll('[class*="size"],[class*="desc"],[class*="material"],[class*="composition"],[class*="product"]').forEach((el: any) => {
      classMatches.push(`${el.tagName}.${String(el.className).slice(0, 80)}`);
    });
    out.classes = classMatches.slice(0, 40);

    // Dump productData
    out.productData = (window as any).productData || null;

    // Ищем ссылку на описание в секциях
    const sections: any[] = [];
    document.querySelectorAll('section, article, .accordion, details, [x-data]').forEach((el: any) => {
      const html = el.innerHTML?.slice(0, 200);
      if (html) sections.push(`${el.tagName}.${String(el.className).slice(0,60)}: ${html.replace(/\s+/g, ' ')}`);
    });
    out.sections = sections.slice(0, 15);

    return out;
  });

  console.log(JSON.stringify(snapshot, null, 2));

  await browser.close();
}

main().catch(console.error);
