/**
 * import-monsheri.ts — загружает товары Mon Sheri в реальный бэкенд
 * и выводит маппинг ms-id → public_id (UUID)
 *
 * npx tsx scripts/import-monsheri.ts
 */

import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

const API = 'http://localhost:3010';
const PROJECT_NUM_ID = 2;

// Генерируем JWT для user_id=7
function makeJwt(userId: number): string {
  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url({ user_id: userId, exp: now + 7200, iat: now });
  const sig = crypto
    .createHmac('sha256', 'local-dev-secret-key-change-in-production-32chars')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

const TOKEN = makeJwt(2);

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  gender: string;
  price: number;
  currency: string;
  color: string;
  material: string;
  sizes: string[];
  description: string;
  product_url: string;
  photo_url: string;
}

const PRODUCTS: Product[] = [
  { id: 'ms-001', name: 'Платье Adriana молочное', brand: 'Mon Sheri', category: 'tops', subcategory: 'Платья макси', gender: 'female', price: 7900, currency: 'RUB', color: 'Молочный', material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'], description: 'Нежное платье для особых случаев и повседневных выходов.', product_url: 'https://monsheri.ru/katalog/platya/maksi/plate-adriana-molochnoe/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/04/4.jpg' },
  { id: 'ms-002', name: 'Платье Bill черное', brand: 'Mon Sheri', category: 'tops', subcategory: 'Платья мини', gender: 'female', price: 6900, currency: 'RUB', color: 'Черный', material: '60% вискоза, 30% нейлон, 10% эластан', sizes: ['XS', 'S', 'M'], description: 'Базовая модель, легко адаптируется под разные случаи.', product_url: 'https://monsheri.ru/katalog/platya/mini/plate-bill-chernoe/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0118.webp' },
  { id: 'ms-003', name: 'Платье Sera молочное', brand: 'Mon Sheri', category: 'tops', subcategory: 'Платья макси', gender: 'female', price: 7500, currency: 'RUB', color: 'Молочный', material: '100% вискоза', sizes: ['XS', 'S', 'M'], description: 'Нежная модель в светлом оттенке.', product_url: 'https://monsheri.ru/katalog/platya/maksi/plate-sera-molochnoe/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/2-4.jpg' },
  { id: 'ms-004', name: 'Платье Melissa', brand: 'Mon Sheri', category: 'tops', subcategory: 'Платья макси', gender: 'female', price: 7900, currency: 'RUB', color: 'Молочный', material: '100% вискоза', sizes: ['XS', 'S', 'M'], description: 'Универсальное платье для разных ситуаций.', product_url: 'https://monsheri.ru/katalog/platya/maksi/plate-melissa/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/1-3.jpg' },
  { id: 'ms-005', name: 'Юбка Gwen молочная', brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Трикотажные юбки', gender: 'female', price: 5900, currency: 'RUB', color: 'Молочный', material: '35% акрил, 23% нейлон, 40% полиэстер, 2% пайетки', sizes: ['One Size'], description: 'Универсальная юбка в светлом оттенке.', product_url: 'https://monsheri.ru/katalog/yubki-shorty/trikotazhnye-yubki-shorty/yubka-gwen-molochnaya/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/04/7.jpg' },
  { id: 'ms-006', name: 'Юбка Elizi клетка', brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Мини-юбки', gender: 'female', price: 5900, currency: 'RUB', color: 'Молочный', material: '40% вискоза, 30% шерсть, 30% полиэстер', sizes: ['XS', 'S', 'M'], description: 'Модель в клетку, добавляет образу акцент.', product_url: 'https://monsheri.ru/katalog/yubki-shorty/mini-yubki-shorty/yubka-elizi-kletka/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/10.jpg' },
  { id: 'ms-007', name: 'Юбка Ester черная', brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Мини-юбки', gender: 'female', price: 5900, currency: 'RUB', color: 'Черный', material: '63% полиэстер, 32% вискоза, 5% эластан', sizes: ['XS', 'S', 'M'], description: 'Универсальная модель на каждый день.', product_url: 'https://monsheri.ru/katalog/yubki-shorty/mini-yubki-shorty/yubka-ester-chernaya/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0098.webp' },
  { id: 'ms-008', name: 'Юбка Laure черная', brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Мини-юбки', gender: 'female', price: 5900, currency: 'RUB', color: 'Черный', material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'], description: 'Универсальная модель, легко впишется в любой гардероб.', product_url: 'https://monsheri.ru/katalog/yubki-shorty/mini-yubki-shorty/yubka-laure-chernaya/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/0096.webp' },
  { id: 'ms-009', name: 'Лосины Lemon черные', brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Леггинсы', gender: 'female', price: 3500, currency: 'RUB', color: 'Черный', material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'], description: 'Удобная базовая модель на каждый день.', product_url: 'https://monsheri.ru/katalog/bryuki/legginsy/losiny-lemon-chernye/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0146.webp' },
  { id: 'ms-010', name: 'Брюки Grace молочные', brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Классические брюки', gender: 'female', price: 5900, currency: 'RUB', color: 'Молочный', material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'], description: 'Базовые брюки в светлом оттенке.', product_url: 'https://monsheri.ru/katalog/bryuki/klassicheskie/bryuki-grace-molochnye/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0149.webp' },
  { id: 'ms-011', name: 'Брюки Grace черные', brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Классические брюки', gender: 'female', price: 5900, currency: 'RUB', color: 'Черный', material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'], description: 'Базовые и универсальные, идеально для офиса и выхода.', product_url: 'https://monsheri.ru/katalog/bryuki/klassicheskie/bryuki-grace-chernye/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/12.jpg' },
  { id: 'ms-012', name: 'Рубашка Gwen молочная', brand: 'Mon Sheri', category: 'tops', subcategory: 'Рубашки', gender: 'female', price: 4900, currency: 'RUB', color: 'Молочный', material: '35% акрил, 23% нейлон, 40% полиэстер, 2% пайетки', sizes: ['One Size'], description: 'Светлая модель, сочетается с юбками, брюками и джинсами.', product_url: 'https://monsheri.ru/katalog/rubashki/pritalennye-rubashki/rubashka-gwen-molochnaya/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/04/1-1.jpg' },
  { id: 'ms-013', name: 'Блуза Rozali молочная', brand: 'Mon Sheri', category: 'tops', subcategory: 'Блузы', gender: 'female', price: 4500, currency: 'RUB', color: 'Молочный', material: '100% вискоза', sizes: ['XS', 'S', 'M'], description: 'Лёгкая и аккуратная модель в светлом оттенке.', product_url: 'https://monsheri.ru/katalog/rubashki/pritalennye-rubashki/bluza-rozali-molochnaya/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/4-2.jpg' },
  { id: 'ms-014', name: 'Кардиган June шоколадный', brand: 'Mon Sheri', category: 'tops', subcategory: 'Кардиганы', gender: 'female', price: 5500, currency: 'RUB', color: 'Шоколадный', material: '65% вискоза, 25% хлопок, 10% эластан', sizes: ['One Size'], description: 'В насыщенном шоколадном оттенке. Хорошо сочетается с нейтральной одеждой.', product_url: 'https://monsheri.ru/katalog/svitery-kardigany/kardigan-june-shokoladnyj/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0142.webp' },
  { id: 'ms-015', name: 'Кардиган June молочный', brand: 'Mon Sheri', category: 'tops', subcategory: 'Кардиганы', gender: 'female', price: 5500, currency: 'RUB', color: 'Молочный', material: '65% вискоза, 25% хлопок, 10% эластан', sizes: ['One Size'], description: 'Мягкий кардиган на каждый день.', product_url: 'https://monsheri.ru/katalog/svitery-kardigany/kardigan-june-molochnyj/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/1-2.jpg' },
  { id: 'ms-016', name: 'Кардиган June черный', brand: 'Mon Sheri', category: 'tops', subcategory: 'Кардиганы', gender: 'female', price: 5500, currency: 'RUB', color: 'Черный', material: '65% вискоза, 25% хлопок, 10% эластан', sizes: ['One Size'], description: 'Практичная модель почти под любой образ.', product_url: 'https://monsheri.ru/katalog/svitery-kardigany/kardigan-june-chernyj/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0133.webp' },
  { id: 'ms-017', name: 'Комбинезон Morin черный', brand: 'Mon Sheri', category: 'tops', subcategory: 'Комбинезоны', gender: 'female', price: 6900, currency: 'RUB', color: 'Черный', material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'], description: 'Удобная и универсальная модель.', product_url: 'https://monsheri.ru/katalog/kombinezony/vechernie/kombinezon-morin-chernyj/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0122.webp' },
  { id: 'ms-018', name: 'Комбинезон Bagira черный', brand: 'Mon Sheri', category: 'tops', subcategory: 'Комбинезоны', gender: 'female', price: 6500, currency: 'RUB', color: 'Черный', material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'], description: 'Универсальная модель на каждый день и для выхода.', product_url: 'https://monsheri.ru/katalog/kombinezony/vechernie/kombinezon-bagira-chernyj/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/1.jpg' },
  { id: 'ms-019', name: 'Комбинезон Jade черный', brand: 'Mon Sheri', category: 'tops', subcategory: 'Комбинезоны', gender: 'female', price: 5900, currency: 'RUB', color: 'Черный', material: '65% вискоза, 25% хлопок, 10% эластан', sizes: ['One Size'], description: 'Аккуратная модель, подчёркивает силуэт.', product_url: 'https://monsheri.ru/katalog/kombinezony/bazovye/kombinezon-jade-chernyj/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0114.webp' },
  { id: 'ms-020', name: 'Комбинезон Jade белый', brand: 'Mon Sheri', category: 'tops', subcategory: 'Комбинезоны', gender: 'female', price: 5900, currency: 'RUB', color: 'Белый', material: '65% вискоза, 25% хлопок, 10% эластан', sizes: ['One Size'], description: 'Элегантная и удобная модель.', product_url: 'https://monsheri.ru/katalog/kombinezony/bazovye/kombinezon-jade-belyj/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/0024.webp' },
  { id: 'ms-021', name: 'Жакет Elizi клетка', brand: 'Mon Sheri', category: 'outerwear', subcategory: 'Твидовые жакеты', gender: 'female', price: 8900, currency: 'RUB', color: 'Молочный', material: '40% вискоза, 30% шерсть, 30% полиэстер', sizes: ['XS', 'S', 'M'], description: 'Стильный жакет, можно носить отдельно или с юбкой в комплекте.', product_url: 'https://monsheri.ru/katalog/zhakety-zhilety/tvidovye/zhaket-elizi-kletka/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/6-1.jpg' },
  { id: 'ms-022', name: 'Жакет Sven оранжевый', brand: 'Mon Sheri', category: 'outerwear', subcategory: 'Твидовые жакеты', gender: 'female', price: 8500, currency: 'RUB', color: 'Оранжевый', material: '59% акрил, 40% шерсть, 1% люрекс', sizes: ['XS', 'S', 'M'], description: 'Яркая модель, акцент в образе.', product_url: 'https://monsheri.ru/katalog/zhakety-zhilety/tvidovye/zhaket-sven-oranzhevyj/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/4-1.jpg' },
  { id: 'ms-023', name: 'Жакет Karry', brand: 'Mon Sheri', category: 'outerwear', subcategory: 'Твидовые жакеты', gender: 'female', price: 7900, currency: 'RUB', color: 'Оранжевый', material: '70% полиэстер, 26% вискоза, 4% эластан', sizes: ['XS', 'S', 'M'], description: 'Стильная модель, легко комбинируется с брюками, юбками и платьями.', product_url: 'https://monsheri.ru/katalog/zhakety-zhilety/tvidovye/zhaket-karry/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/7.jpg' },
  { id: 'ms-024', name: 'Жакет Emma молочный', brand: 'Mon Sheri', category: 'outerwear', subcategory: 'Приталенные жакеты', gender: 'female', price: 8500, currency: 'RUB', color: 'Молочный', material: '70% полиэстер, 26% вискоза, 4% эластан', sizes: ['XS', 'S', 'M', 'L'], description: 'Аккуратная и стильная модель в светлом оттенке.', product_url: 'https://monsheri.ru/katalog/zhakety-zhilety/pritalennye/zhaket-emma-molochnyj/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/0068.webp' },
  { id: 'ms-025', name: 'Пальто Graf черное', brand: 'Mon Sheri', category: 'outerwear', subcategory: 'Пальто', gender: 'female', price: 14900, currency: 'RUB', color: 'Черный', material: '100% шерсть', sizes: ['XS-S', 'M-L'], description: 'Лаконичная модель с прямым кроем.', product_url: 'https://monsheri.ru/katalog/verhnyaya-odezhda/palto-trenchi/palto-graf-chernoe/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/6-1.jpg' },
  { id: 'ms-026', name: 'Боди Kristi черное', brand: 'Mon Sheri', category: 'tops', subcategory: 'Боди', gender: 'female', price: 3900, currency: 'RUB', color: 'Черный', material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'], description: 'Эффектная модель с аккуратной посадкой по фигуре.', product_url: 'https://monsheri.ru/katalog/topy-bodi/bodi-topy-bodi/bodi-kristi-chernoe/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/2-4.jpg' },
  { id: 'ms-027', name: 'Топ корсетный Noir черный', brand: 'Mon Sheri', category: 'tops', subcategory: 'Топы', gender: 'female', price: 3500, currency: 'RUB', color: 'Черный', material: '100% хлопок', sizes: ['XS', 'S', 'M'], description: 'Лаконичный и эффектный вариант для вечерних выходов.', product_url: 'https://monsheri.ru/katalog/topy-bodi/topy/top-korsetnyj-noir-chernyj/', photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/4-2.jpg' },
];

function fetchUrl(url: string, opts: { method?: string; headers?: Record<string, string>; body?: Buffer | string } = {}): Promise<{ status: number; body: Buffer; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = (mod as typeof https).request(
      { hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: parsed.pathname + parsed.search, method: opts.method || 'GET', headers: opts.headers || {} },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === 'string') headers[k] = v;
            else if (Array.isArray(v)) headers[k] = v[0];
          }
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks), headers });
        });
      }
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function fetchImage(url: string): Promise<{ data: Buffer; contentType: string }> {
  // Follow redirects with Referer
  let currentUrl = url;
  for (let i = 0; i < 5; i++) {
    const res = await fetchUrl(currentUrl, { headers: { Referer: 'https://monsheri.ru/', 'User-Agent': 'Mozilla/5.0' } });
    if (res.status >= 300 && res.status < 400 && res.headers['location']) {
      currentUrl = res.headers['location'].startsWith('http') ? res.headers['location'] : new URL(res.headers['location'], currentUrl).toString();
      continue;
    }
    return { data: res.body, contentType: res.headers['content-type'] || 'image/jpeg' };
  }
  throw new Error(`Too many redirects for ${url}`);
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetchUrl(`${API}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = res.body.toString();
  if (res.status >= 400) throw new Error(`POST ${path} → ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function uploadPhoto(productNumId: number, imageData: Buffer, contentType: string, filename: string): Promise<void> {
  const boundary = `----FormBoundary${crypto.randomBytes(8).toString('hex')}`;
  const ext = contentType.includes('webp') ? 'webp' : 'jpg';
  const parts = [
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}.${ext}"\r\nContent-Type: ${contentType}\r\n\r\n`),
    imageData,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];
  const body = Buffer.concat(parts);

  const res = await fetchUrl(`${API}/api/v1/projects/${PROJECT_NUM_ID}/products/${productNumId}/photos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length.toString() },
    body,
  });
  if (res.status >= 400) throw new Error(`photo upload → ${res.status}: ${res.body.toString()}`);
}

async function main() {
  console.log('🚀 Импорт товаров Mon Sheri...\n');
  const mapping: Record<string, string> = {};

  for (const p of PRODUCTS) {
    try {
      // Создаём товар
      const created = await apiPost(`/api/v1/projects/${PROJECT_NUM_ID}/products`, {
        name: p.name,
        brand: p.brand,
        category: p.category,
        subcategory: p.subcategory,
        gender: p.gender,
        price: p.price,
        currency: p.currency,
        color: p.color,
        material: p.material,
        sizes: p.sizes,
        description: p.description,
        product_url: p.product_url,
      }) as { id: number; public_id: string };

      // Загружаем фото
      const img = await fetchImage(p.photo_url);
      await uploadPhoto(created.id, img.data, img.contentType, p.id);

      mapping[p.id] = created.public_id;
      console.log(`✅ ${p.id} → ${created.public_id}  (${p.name})`);
    } catch (e) {
      console.error(`❌ ${p.id} (${p.name}): ${e}`);
    }
  }

  console.log('\n📋 Маппинг (скопируй в demo-server.ts):');
  console.log('const MONSHERI_ID_MAP: Record<string, string> = ' + JSON.stringify(mapping, null, 2) + ';');
}

main();
