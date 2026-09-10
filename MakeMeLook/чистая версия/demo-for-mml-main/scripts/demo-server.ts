/**
 * demo-server.ts — локальный mock-сервер для демо Mon Sheri
 *
 * - Storefront API  →  http://localhost:3099/api/storefront/v1/...  (mock)
 * - Widget Session  →  проксируем на реальный b2b.makemelook.ai, подменяем products
 * - Остальной Widget API (фото, try-on, аватары) → проксируем на реальный бэкенд
 * - Widget files    →  http://localhost:3099/widget/...  (local dist)
 * - Image proxy     →  http://localhost:3099/img-proxy?url=...  (обход hotlink monsheri.ru)
 *
 * Запуск:
 *   npx tsx scripts/demo-server.ts
 */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const PORT = 3099;
const REAL_API = 'http://localhost:3010';
const REAL_PROJECT_ID = '19445216-cbf9-48d8-9732-c442df7f4e10';

// Маппинг ms-*** → реальные UUID в бэкенде
const MONSHERI_ID_MAP: Record<string, string> = {
  "ms-001": "70b2f34d-fef1-4c39-b5ae-cc312ec7f7d2",
  "ms-002": "fb62cc65-de26-4f22-9e37-7157ae242f38",
  "ms-003": "f01e2895-7364-4b9d-a257-36df37befbd8",
  "ms-004": "54238df3-fe86-4a79-b3c9-43ef7f8bf266",
  "ms-005": "3dd7ea9f-e0c3-458c-8f92-85ee5d185329",
  "ms-006": "fb0bf57f-b762-46e4-8943-72fef0c8c5bd",
  "ms-007": "46da88ab-9706-4bce-83cb-29538b4a91d1",
  "ms-008": "543f1e23-17b6-4f5c-ae38-412fbffda177",
  "ms-009": "b034ab61-90c7-4cd5-915d-adc198f1d01e",
  "ms-010": "d669ae80-087b-4dd9-9b82-f08bcaa65de9",
  "ms-011": "627243e5-ab50-460e-b491-341a4f900522",
  "ms-012": "5f2a6dc7-7915-4a5a-960b-fb84788ced6b",
  "ms-013": "ff712323-bbc6-441f-a22f-a0a19b2d1196",
  "ms-014": "ea0be6b6-be4d-4bf1-b337-12a507ccbd6c",
  "ms-015": "96df8a55-fcde-44c1-ba67-444925b25f58",
  "ms-016": "c2fd6b17-e6ab-4953-abea-3bd31123dd82",
  "ms-017": "2d3e0342-396b-47d2-9c32-b694a9de1a1f",
  "ms-018": "ac5a6a57-2532-4d0a-a696-e79b959a0974",
  "ms-019": "5fb36c53-4a40-4ff8-8a18-eeea84b1a19d",
  "ms-020": "fa4293e0-7fed-4643-b3a1-59bbb609e2b4",
  "ms-021": "5a72b7fa-6104-4ace-b36c-e19b77a70e30",
  "ms-022": "04a56aa1-c385-4257-bdcf-4117a692b300",
  "ms-023": "dac05189-297f-42c1-982e-5ea9d967f0d0",
  "ms-024": "47c27601-d58c-495b-ba0f-2fd0cba93d1f",
  "ms-025": "d2925ff7-74d0-47bc-8189-f5d849bf6406",
  "ms-026": "4c6e5fb9-7b89-4e11-a520-ea485b62e651",
  "ms-027": "95d67fcf-388e-478f-94af-9ef048063e83",
};

const WIDGET_DIST = path.resolve(
  fileURLToPath(import.meta.url),
  '../../../mml-saas-widget-tryon/dist',
);

// ─── Каталог Mon Sheri ───────────────────────────────────────────────────────

interface Product {
  id: string;
  public_id: string;
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
  photo_url: string;   // оригинальный URL monsheri.ru
  is_new: boolean;
}

// proxyPhotoUrl — картинка через наш прокси (чтобы monsheri.ru не блокировал hotlink)
function proxyPhotoUrl(originalUrl: string): string {
  return `http://localhost:${PORT}/img-proxy?url=${encodeURIComponent(originalUrl)}`;
}

const PRODUCTS: Product[] = [
  {
    id: 'ms-001', public_id: 'ms-001',
    name: 'Платье Adriana молочное',
    brand: 'Mon Sheri', category: 'dresses', subcategory: 'Макси',
    gender: 'female', price: 7900, currency: 'RUB', color: 'Молочный',
    material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Платье Adriana молочное — нежное платье, которое подойдёт для особых случаев и повседневных выходов.',
    product_url: 'https://monsheri.ru/katalog/platya/maksi/plate-adriana-molochnoe/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/04/4.jpg', is_new: true,
  },
  {
    id: 'ms-002', public_id: 'ms-002',
    name: 'Платье Bill черное',
    brand: 'Mon Sheri', category: 'dresses', subcategory: 'Мини',
    gender: 'female', price: 6900, currency: 'RUB', color: 'Черный',
    material: '60% вискоза, 30% нейлон, 10% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Платье Bill черное — базовая модель, которая легко адаптируется под разные случаи.',
    product_url: 'https://monsheri.ru/katalog/platya/mini/plate-bill-chernoe/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0118.webp', is_new: true,
  },
  {
    id: 'ms-003', public_id: 'ms-003',
    name: 'Платье Sera молочное',
    brand: 'Mon Sheri', category: 'dresses', subcategory: 'Макси',
    gender: 'female', price: 7500, currency: 'RUB', color: 'Молочный',
    material: '100% вискоза', sizes: ['XS', 'S', 'M'],
    description: 'Платье Sera молочное — нежная модель в светлом оттенке.',
    product_url: 'https://monsheri.ru/katalog/platya/maksi/plate-sera-molochnoe/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/2-4.jpg', is_new: true,
  },
  {
    id: 'ms-004', public_id: 'ms-004',
    name: 'Платье Melissa',
    brand: 'Mon Sheri', category: 'dresses', subcategory: 'Макси',
    gender: 'female', price: 7900, currency: 'RUB', color: 'Молочный',
    material: '100% вискоза', sizes: ['XS', 'S', 'M'],
    description: 'Платье Melissa — универсальное платье для разных ситуаций.',
    product_url: 'https://monsheri.ru/katalog/platya/maksi/plate-melissa/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/1-3.jpg', is_new: true,
  },
  {
    id: 'ms-005', public_id: 'ms-005',
    name: 'Юбка Gwen молочная',
    brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Трикотажные юбки',
    gender: 'female', price: 5900, currency: 'RUB', color: 'Молочный',
    material: '35% акрил, 23% нейлон, 40% полиэстер, 2% пайетки', sizes: ['One Size'],
    description: 'Юбка Gwen молочная — универсальная юбка в светлом оттенке.',
    product_url: 'https://monsheri.ru/katalog/yubki-shorty/trikotazhnye-yubki-shorty/yubka-gwen-molochnaya/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/04/7.jpg', is_new: true,
  },
  {
    id: 'ms-006', public_id: 'ms-006',
    name: 'Юбка Elizi клетка',
    brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Мини-юбки',
    gender: 'female', price: 5900, currency: 'RUB', color: 'Молочный',
    material: '40% вискоза, 30% шерсть, 30% полиэстер', sizes: ['XS', 'S', 'M'],
    description: 'Юбка Elizi клетка — модель в клетку, которая добавляет образу акцент.',
    product_url: 'https://monsheri.ru/katalog/yubki-shorty/mini-yubki-shorty/yubka-elizi-kletka/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/10.jpg', is_new: true,
  },
  {
    id: 'ms-007', public_id: 'ms-007',
    name: 'Юбка Ester черная',
    brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Мини-юбки',
    gender: 'female', price: 5900, currency: 'RUB', color: 'Черный',
    material: '63% полиэстер, 32% вискоза, 5% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Юбка Ester черная — универсальная модель на каждый день.',
    product_url: 'https://monsheri.ru/katalog/yubki-shorty/mini-yubki-shorty/yubka-ester-chernaya/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0098.webp', is_new: true,
  },
  {
    id: 'ms-008', public_id: 'ms-008',
    name: 'Юбка Laure черная',
    brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Мини-юбки',
    gender: 'female', price: 5900, currency: 'RUB', color: 'Черный',
    material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Юбка Laure черная — универсальная модель, легко впишется в любой гардероб.',
    product_url: 'https://monsheri.ru/katalog/yubki-shorty/mini-yubki-shorty/yubka-laure-chernaya/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/0096.webp', is_new: true,
  },
  {
    id: 'ms-009', public_id: 'ms-009',
    name: 'Лосины Lemon черные',
    brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Леггинсы',
    gender: 'female', price: 3500, currency: 'RUB', color: 'Черный',
    material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Лосины Lemon черные — удобная базовая модель на каждый день.',
    product_url: 'https://monsheri.ru/katalog/bryuki/legginsy/losiny-lemon-chernye/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0146.webp', is_new: true,
  },
  {
    id: 'ms-010', public_id: 'ms-010',
    name: 'Брюки Grace молочные',
    brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Классические брюки',
    gender: 'female', price: 5900, currency: 'RUB', color: 'Молочный',
    material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Брюки Grace молочные — базовые брюки в светлом оттенке.',
    product_url: 'https://monsheri.ru/katalog/bryuki/klassicheskie/bryuki-grace-molochnye/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0149.webp', is_new: true,
  },
  {
    id: 'ms-011', public_id: 'ms-011',
    name: 'Брюки Grace черные',
    brand: 'Mon Sheri', category: 'bottoms', subcategory: 'Классические брюки',
    gender: 'female', price: 5900, currency: 'RUB', color: 'Черный',
    material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Брюки Grace черные — базовые и универсальные, идеально для офиса и выхода.',
    product_url: 'https://monsheri.ru/katalog/bryuki/klassicheskie/bryuki-grace-chernye/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/12.jpg', is_new: true,
  },
  {
    id: 'ms-012', public_id: 'ms-012',
    name: 'Рубашка Gwen молочная',
    brand: 'Mon Sheri', category: 'tops', subcategory: 'Рубашки',
    gender: 'female', price: 4900, currency: 'RUB', color: 'Молочный',
    material: '35% акрил, 23% нейлон, 40% полиэстер, 2% пайетки', sizes: ['One Size'],
    description: 'Рубашка Gwen молочная — светлая модель, сочетается с юбками, брюками и джинсами.',
    product_url: 'https://monsheri.ru/katalog/rubashki/pritalennye-rubashki/rubashka-gwen-molochnaya/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/04/1-1.jpg', is_new: true,
  },
  {
    id: 'ms-013', public_id: 'ms-013',
    name: 'Блуза Rozali молочная',
    brand: 'Mon Sheri', category: 'tops', subcategory: 'Блузы',
    gender: 'female', price: 4500, currency: 'RUB', color: 'Молочный',
    material: '100% вискоза', sizes: ['XS', 'S', 'M'],
    description: 'Блуза Rozali молочная — лёгкая и аккуратная модель в светлом оттенке.',
    product_url: 'https://monsheri.ru/katalog/rubashki/pritalennye-rubashki/bluza-rozali-molochnaya/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/4-2.jpg', is_new: true,
  },
  {
    id: 'ms-014', public_id: 'ms-014',
    name: 'Кардиган June шоколадный',
    brand: 'Mon Sheri', category: 'tops', subcategory: 'Кардиганы',
    gender: 'female', price: 5500, currency: 'RUB', color: 'Шоколадный',
    material: '65% вискоза, 25% хлопок, 10% эластан', sizes: ['One Size'],
    description: 'Кардиган June в насыщенном шоколадном оттенке. Хорошо сочетается с нейтральной одеждой.',
    product_url: 'https://monsheri.ru/katalog/svitery-kardigany/kardigan-june-shokoladnyj/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0142.webp', is_new: true,
  },
  {
    id: 'ms-015', public_id: 'ms-015',
    name: 'Кардиган June молочный',
    brand: 'Mon Sheri', category: 'tops', subcategory: 'Кардиганы',
    gender: 'female', price: 5500, currency: 'RUB', color: 'Молочный',
    material: '65% вискоза, 25% хлопок, 10% эластан', sizes: ['One Size'],
    description: 'Кардиган June молочный — мягкий кардиган на каждый день.',
    product_url: 'https://monsheri.ru/katalog/svitery-kardigany/kardigan-june-molochnyj/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/1-2.jpg', is_new: true,
  },
  {
    id: 'ms-016', public_id: 'ms-016',
    name: 'Кардиган June черный',
    brand: 'Mon Sheri', category: 'tops', subcategory: 'Кардиганы',
    gender: 'female', price: 5500, currency: 'RUB', color: 'Черный',
    material: '65% вискоза, 25% хлопок, 10% эластан', sizes: ['One Size'],
    description: 'Кардиган June черный — практичная модель почти под любой образ.',
    product_url: 'https://monsheri.ru/katalog/svitery-kardigany/kardigan-june-chernyj/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0133.webp', is_new: true,
  },
  {
    id: 'ms-017', public_id: 'ms-017',
    name: 'Комбинезон Morin черный',
    brand: 'Mon Sheri', category: 'dresses', subcategory: 'Комбинезоны',
    gender: 'female', price: 6900, currency: 'RUB', color: 'Черный',
    material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Комбинезон Morin черный — удобная и универсальная модель.',
    product_url: 'https://monsheri.ru/katalog/kombinezony/vechernie/kombinezon-morin-chernyj/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0122.webp', is_new: true,
  },
  {
    id: 'ms-018', public_id: 'ms-018',
    name: 'Комбинезон Bagira черный',
    brand: 'Mon Sheri', category: 'dresses', subcategory: 'Комбинезоны',
    gender: 'female', price: 6500, currency: 'RUB', color: 'Черный',
    material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Комбинезон Bagira черный — универсальная модель на каждый день и для выхода.',
    product_url: 'https://monsheri.ru/katalog/kombinezony/vechernie/kombinezon-bagira-chernyj/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/1.jpg', is_new: true,
  },
  {
    id: 'ms-019', public_id: 'ms-019',
    name: 'Комбинезон Jade черный',
    brand: 'Mon Sheri', category: 'dresses', subcategory: 'Комбинезоны',
    gender: 'female', price: 5900, currency: 'RUB', color: 'Черный',
    material: '65% вискоза, 25% хлопок, 10% эластан', sizes: ['One Size'],
    description: 'Комбинезон Jade черный — аккуратная модель, подчёркивает силуэт.',
    product_url: 'https://monsheri.ru/katalog/kombinezony/bazovye/kombinezon-jade-chernyj/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/0114.webp', is_new: true,
  },
  {
    id: 'ms-020', public_id: 'ms-020',
    name: 'Комбинезон Jade белый',
    brand: 'Mon Sheri', category: 'dresses', subcategory: 'Комбинезоны',
    gender: 'female', price: 5900, currency: 'RUB', color: 'Белый',
    material: '65% вискоза, 25% хлопок, 10% эластан', sizes: ['One Size'],
    description: 'Комбинезон Jade белого цвета — элегантная и удобная модель.',
    product_url: 'https://monsheri.ru/katalog/kombinezony/bazovye/kombinezon-jade-belyj/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/0024.webp', is_new: true,
  },
  {
    id: 'ms-021', public_id: 'ms-021',
    name: 'Жакет Elizi клетка',
    brand: 'Mon Sheri', category: 'outerwear', subcategory: 'Твидовые жакеты',
    gender: 'female', price: 8900, currency: 'RUB', color: 'Молочный',
    material: '40% вискоза, 30% шерсть, 30% полиэстер', sizes: ['XS', 'S', 'M'],
    description: 'Жакет Elizi клетка — стильный жакет, можно носить отдельно или с юбкой в комплекте.',
    product_url: 'https://monsheri.ru/katalog/zhakety-zhilety/tvidovye/zhaket-elizi-kletka/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/6-1.jpg', is_new: true,
  },
  {
    id: 'ms-022', public_id: 'ms-022',
    name: 'Жакет Sven оранжевый',
    brand: 'Mon Sheri', category: 'outerwear', subcategory: 'Твидовые жакеты',
    gender: 'female', price: 8500, currency: 'RUB', color: 'Оранжевый',
    material: '59% акрил, 40% шерсть, 1% люрекс', sizes: ['XS', 'S', 'M'],
    description: 'Жакет Sven оранжевый — яркая модель, акцент в образе.',
    product_url: 'https://monsheri.ru/katalog/zhakety-zhilety/tvidovye/zhaket-sven-oranzhevyj/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/4-1.jpg', is_new: true,
  },
  {
    id: 'ms-023', public_id: 'ms-023',
    name: 'Жакет Karry',
    brand: 'Mon Sheri', category: 'outerwear', subcategory: 'Твидовые жакеты',
    gender: 'female', price: 7900, currency: 'RUB', color: 'Оранжевый',
    material: '70% полиэстер, 26% вискоза, 4% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Жакет Karry — стильная модель, легко комбинируется с брюками, юбками и платьями.',
    product_url: 'https://monsheri.ru/katalog/zhakety-zhilety/tvidovye/zhaket-karry/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/03/7.jpg', is_new: true,
  },
  {
    id: 'ms-024', public_id: 'ms-024',
    name: 'Жакет Emma молочный',
    brand: 'Mon Sheri', category: 'outerwear', subcategory: 'Приталенные жакеты',
    gender: 'female', price: 8500, currency: 'RUB', color: 'Молочный',
    material: '70% полиэстер, 26% вискоза, 4% эластан', sizes: ['XS', 'S', 'M', 'L'],
    description: 'Жакет Emma молочный — аккуратная и стильная модель в светлом оттенке.',
    product_url: 'https://monsheri.ru/katalog/zhakety-zhilety/pritalennye/zhaket-emma-molochnyj/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/0068.webp', is_new: true,
  },
  {
    id: 'ms-025', public_id: 'ms-025',
    name: 'Пальто Graf черное',
    brand: 'Mon Sheri', category: 'outerwear', subcategory: 'Пальто',
    gender: 'female', price: 14900, currency: 'RUB', color: 'Черный',
    material: '100% шерсть', sizes: ['XS-S', 'M-L'],
    description: 'Пальто Graf черного цвета — лаконичная модель с прямым кроем.',
    product_url: 'https://monsheri.ru/katalog/verhnyaya-odezhda/palto-trenchi/palto-graf-chernoe/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/6-1.jpg', is_new: true,
  },
  {
    id: 'ms-026', public_id: 'ms-026',
    name: 'Боди Kristi черное',
    brand: 'Mon Sheri', category: 'tops', subcategory: 'Боди',
    gender: 'female', price: 3900, currency: 'RUB', color: 'Черный',
    material: '96% полиэстер, 4% эластан', sizes: ['XS', 'S', 'M'],
    description: 'Боди Kristi черное — эффектная модель с аккуратной посадкой по фигуре.',
    product_url: 'https://monsheri.ru/katalog/topy-bodi/bodi-topy-bodi/bodi-kristi-chernoe/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/2-4.jpg', is_new: true,
  },
  {
    id: 'ms-027', public_id: 'ms-027',
    name: 'Топ корсетный Noir черный',
    brand: 'Mon Sheri', category: 'tops', subcategory: 'Топы',
    gender: 'female', price: 3500, currency: 'RUB', color: 'Черный',
    material: '100% хлопок', sizes: ['XS', 'S', 'M'],
    description: 'Топ корсетный Noir — лаконичный и эффектный вариант для вечерних выходов.',
    product_url: 'https://monsheri.ru/katalog/topy-bodi/topy/top-korsetnyj-noir-chernyj/',
    photo_url: 'https://monsheri.ru/wp-content/uploads/2026/02/4-2.jpg', is_new: true,
  },
];

// ─── HTTP утилиты ────────────────────────────────────────────────────────────

function cors(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res: http.ServerResponse, data: unknown, status = 200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function serveFile(res: http.ServerResponse, filePath: string, contentType: string) {
  cors(res);
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

// ─── Image proxy (обход hotlink protection monsheri.ru) ──────────────────────

// Fetches a URL following redirects, returns final response
function fetchFollowRedirects(
  targetUrl: string,
  maxRedirects = 5,
): Promise<{ statusCode: number; contentType: string; data: Buffer }> {
  return new Promise((resolve, reject) => {
    const attempt = (url: string, hops: number) => {
      if (hops > maxRedirects) { reject(new Error('Too many redirects')); return; }
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const options: https.RequestOptions = {
        hostname: parsed.hostname,
        port: isHttps ? 443 : 80,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'Referer': 'https://monsheri.ru/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      };
      const req = (isHttps ? https : http).request(options, (res2) => {
        const status = res2.statusCode ?? 200;
        // Follow redirects
        if ((status === 301 || status === 302 || status === 307 || status === 308) && res2.headers.location) {
          const next = res2.headers.location.startsWith('http')
            ? res2.headers.location
            : `${parsed.protocol}//${parsed.host}${res2.headers.location}`;
          res2.resume(); // discard body
          attempt(next, hops + 1);
          return;
        }
        const chunks: Buffer[] = [];
        res2.on('data', (c) => chunks.push(c));
        res2.on('end', () => resolve({
          statusCode: status,
          contentType: res2.headers['content-type'] ?? 'image/jpeg',
          data: Buffer.concat(chunks),
        }));
      });
      req.on('error', reject);
      req.end();
    };
    attempt(targetUrl, 0);
  });
}

function handleImageProxy(req: http.IncomingMessage, res: http.ServerResponse, targetUrl: string) {
  fetchFollowRedirects(targetUrl)
    .then(({ statusCode, contentType, data }) => {
      cors(res);
      res.writeHead(statusCode === 200 ? 200 : 200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    })
    .catch((e) => {
      console.error(`[img-proxy] error for ${targetUrl}: ${e.message}`);
      res.writeHead(502);
      res.end('Image proxy error');
    });
}

// ─── Proxy на реальный бэкенд ─────────────────────────────────────────────────

function proxyToReal(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: Buffer,
  overridePath?: string,
  transformResponse?: (data: unknown) => unknown,
) {
  const targetPath = overridePath ?? req.url ?? '/';
  const parsed = new URL(REAL_API);

  const isHttps = parsed.protocol === 'https:';
  const mod = isHttps ? https : http;
  const options: https.RequestOptions = {
    hostname: parsed.hostname,
    port: parsed.port || (isHttps ? 443 : 80),
    path: targetPath,
    method: req.method,
    headers: {
      'Content-Type': req.headers['content-type'] ?? 'application/json',
      'Content-Length': body.length,
      'User-Agent': 'MML-Demo-Proxy/1.0',
    },
  };

  const proxyReq = mod.request(options, (proxyRes) => {
    const chunks: Buffer[] = [];
    proxyRes.on('data', (chunk) => { chunks.push(chunk); });
    proxyRes.on('end', () => {
      const responseBody = Buffer.concat(chunks).toString('utf-8');
      const status = proxyRes.statusCode ?? 200;
      if (status >= 400) {
        console.error(`[proxy] ${req.method} ${targetPath} → ${status}: ${responseBody.slice(0, 300)}`);
      }
      cors(res);
      if (transformResponse) {
        try {
          const parsed = JSON.parse(responseBody);
          const transformed = transformResponse(parsed);
          res.writeHead(proxyRes.statusCode ?? 200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(transformed));
        } catch (e) {
          res.writeHead(proxyRes.statusCode ?? 200, { 'Content-Type': 'application/json' });
          res.end(responseBody);
        }
      } else {
        res.writeHead(proxyRes.statusCode ?? 200, {
          'Content-Type': proxyRes.headers['content-type'] ?? 'application/json',
        });
        res.end(responseBody);
      }
    });
  });

  proxyReq.on('error', (e) => {
    console.error(`[proxy] error: ${e.message}`);
    json(res, { error: 'Proxy error', message: e.message }, 502);
  });

  proxyReq.write(body);
  proxyReq.end();
}

// ─── Storefront mock ──────────────────────────────────────────────────────────

function filterProducts(params: Record<string, string>): Product[] {
  let items = [...PRODUCTS];
  if (params.category) items = items.filter((p) => p.category === params.category);
  if (params.gender) items = items.filter((p) => p.gender === params.gender);
  if (params.brand) items = items.filter((p) => p.brand === params.brand);
  if (params.color) items = items.filter((p) => p.color === params.color);
  if (params.search) {
    const q = params.search.toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (params.sort === 'price_asc') items.sort((a, b) => a.price - b.price);
  if (params.sort === 'price_desc') items.sort((a, b) => b.price - a.price);
  return items;
}

function toStorefrontProduct(p: Product) {
  return {
    id: p.public_id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    subcategory: p.subcategory,
    price: p.price,
    discount_price: null,
    currency: p.currency,
    color: p.color,
    sizes: p.sizes,
    is_new: p.is_new,
    photos: [{ url: proxyPhotoUrl(p.photo_url), sort_order: 0 }],
  };
}

function toStorefrontDetail(p: Product) {
  return {
    ...toStorefrontProduct(p),
    material: p.material,
    description: p.description,
    season: ['spring', 'summer'],
    related_products: PRODUCTS
      .filter((r) => r.id !== p.id && r.category === p.category)
      .slice(0, 4)
      .map((r) => ({
        id: r.public_id,
        name: r.name,
        brand: r.brand,
        price: r.price,
        currency: r.currency,
        photos: [{ url: proxyPhotoUrl(r.photo_url), sort_order: 0 }],
      })),
  };
}

// ─── Widget session response (подменяем список товаров) ───────────────────────

// Виджет поддерживает: outerwear, tops, bottoms, shoes, accessories
// Маппим "dresses" → "tops" (платья/комбинезоны — надеваются как верх)
function widgetCategory(cat: string): string {
  if (cat === 'dresses') return 'tops';
  return cat;
}

// Виджет ожидает Record<string, string>, а не массив
function sizesToRecord(sizes: string[]): Record<string, string> | null {
  if (!sizes || sizes.length === 0) return null;
  const rec: Record<string, string> = {};
  for (const s of sizes) rec[s] = s;
  return rec;
}

function injectMonSheriProducts(sessionData: unknown): unknown {
  const data = sessionData as Record<string, unknown>;
  const config = (data.config ?? {}) as Record<string, unknown>;
  config.products = PRODUCTS.map((p) => ({
    id: p.id,
    public_id: MONSHERI_ID_MAP[p.id] ?? p.id,
    name: p.name,
    photo_url: proxyPhotoUrl(p.photo_url),
    thumbnail_url: proxyPhotoUrl(p.photo_url),
    category: widgetCategory(p.category),
    subcategory: p.subcategory,
    sku: '',
    color: p.color,
    price: p.price,
    currency: p.currency,
    product_url: p.product_url,
    external_id: p.id,  // для автовыбора товара со страницы
    size_variants: sizesToRecord(p.sizes),
  }));
  config.language = 'ru';
  data.config = config;
  return data;
}

// ─── Server ───────────────────────────────────────────────────────────────────

/**
 * Извлекает изображение из multipart/form-data, сжимает до ≤800KB через sips (macOS),
 * возвращает новый multipart-буфер с тем же boundary.
 */
async function compressPhotoInMultipart(body: Buffer, contentType: string): Promise<Buffer> {
  // Извлекаем boundary из Content-Type
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
  if (!boundaryMatch) throw new Error('No boundary in content-type');
  const boundary = boundaryMatch[1];

  const bodyStr = body.toString('binary');
  const boundaryLine = `--${boundary}`;

  // Находим начало части с файлом
  const partStart = bodyStr.indexOf(boundaryLine + '\r\n');
  if (partStart === -1) throw new Error('Multipart part not found');

  // Находим конец заголовков части (двойной CRLF)
  const headerEnd = bodyStr.indexOf('\r\n\r\n', partStart);
  if (headerEnd === -1) throw new Error('Part headers not found');
  const imageStart = headerEnd + 4; // после \r\n\r\n

  // Конец данных файла — перед closing boundary
  const closingBoundary = `\r\n--${boundary}--`;
  const imageEnd = bodyStr.lastIndexOf(closingBoundary);
  if (imageEnd === -1) throw new Error('Closing boundary not found');

  // Извлекаем байты изображения
  const imageBytes = body.slice(imageStart, imageEnd);
  if (imageBytes.length <= 800 * 1024) {
    // Уже маленькое — не сжимаем
    return body;
  }

  console.log(`[compress] original size: ${(imageBytes.length / 1024).toFixed(0)}KB → compressing...`);

  // Пишем во временный файл
  const tmpId = crypto.randomBytes(6).toString('hex');
  const tmpIn = path.join(os.tmpdir(), `mml-upload-${tmpId}.jpg`);
  const tmpOut = path.join(os.tmpdir(), `mml-upload-${tmpId}-out.jpg`);
  fs.writeFileSync(tmpIn, imageBytes);

  try {
    // Сжимаем циклом: уменьшаем качество и размер пока не влезем в 700KB
    const TARGET = 700 * 1024;
    let compressed: Buffer;
    const attempts = [
      { dim: 1600, quality: 75 },
      { dim: 1200, quality: 60 },
      { dim: 900,  quality: 50 },
      { dim: 700,  quality: 40 },
      { dim: 600,  quality: 30 },
    ];
    for (const { dim, quality } of attempts) {
      execSync(`sips -Z ${dim} --setProperty formatOptions ${quality} "${tmpIn}" --out "${tmpOut}" 2>/dev/null`, { timeout: 15000 });
      compressed = fs.readFileSync(tmpOut);
      console.log(`[compress] attempt dim=${dim} q=${quality}: ${(compressed!.length / 1024).toFixed(0)}KB`);
      if (compressed!.length <= TARGET) break;
    }
    console.log(`[compress] final: ${(compressed!.length / 1024).toFixed(0)}KB`);

    // Восстанавливаем заголовки части
    const partHeaders = body.slice(partStart + boundaryLine.length + 2, headerEnd); // +2 for \r\n
    const newBoundaryLine = Buffer.from(`--${boundary}\r\n`);
    const newHeaders = Buffer.concat([partHeaders, Buffer.from('\r\n\r\n')]);
    const newClose = Buffer.from(`\r\n--${boundary}--\r\n`);

    return Buffer.concat([newBoundaryLine, newHeaders, compressed, newClose]);
  } finally {
    try { fs.unlinkSync(tmpIn); } catch {}
    try { fs.unlinkSync(tmpOut); } catch {}
  }
}

function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const params = Object.fromEntries(url.searchParams.entries());

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Image proxy ──
  if (pathname === '/img-proxy') {
    const targetUrl = params.url;
    if (!targetUrl) { res.writeHead(400); res.end('Missing url param'); return; }
    handleImageProxy(req, res, targetUrl);
    return;
  }

  // ── Widget static files ──
  if (pathname === '/widget/loader.js') return serveFile(res, path.join(WIDGET_DIST, 'loader.js'), 'application/javascript');
  if (pathname === '/widget/widget.js') return serveFile(res, path.join(WIDGET_DIST, 'widget.js'), 'application/javascript');
  if (pathname === '/widget/widget.css') return serveFile(res, path.join(WIDGET_DIST, 'widget.css'), 'text/css');

  // ── Widget assets (intro-girl-new.webp, ai-sparkle.svg и др.) → proxy to real CDN ──
  if (pathname.startsWith('/s3/widget-assets/')) {
    const assetUrl = `https://b2b.makemelook.ai${pathname}`;
    fetchFollowRedirects(assetUrl)
      .then(({ contentType, data }) => {
        cors(res);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
      })
      .catch(() => { res.writeHead(404); res.end('Asset not found'); });
    return;
  }

  // ── Storefront API (полностью local) ──
  const storefrontMatch = pathname.match(/^\/api\/storefront\/v1\/([^/]+)\/(.+)$/);
  if (storefrontMatch) {
    const resource = storefrontMatch[2];

    if (resource === 'products' && req.method === 'GET') {
      const filtered = filterProducts(params);
      const offset = parseInt(params.offset || '0', 10);
      const limit = parseInt(params.limit || '100', 10);
      const allColors = [...new Set(PRODUCTS.map((p) => p.color).filter(Boolean))];
      const allCategories = [...new Set(PRODUCTS.map((p) => p.category))];
      return json(res, {
        items: filtered.slice(offset, offset + limit).map(toStorefrontProduct),
        total: filtered.length,
        offset,
        limit,
        filters: {
          categories: allCategories,
          brands: ['Mon Sheri'],
          colors: allColors,
          price_min: Math.min(...PRODUCTS.map((p) => p.price)),
          price_max: Math.max(...PRODUCTS.map((p) => p.price)),
        },
      });
    }

    const productMatch = resource.match(/^products\/(.+)$/);
    if (productMatch && req.method === 'GET') {
      const product = PRODUCTS.find((p) => p.public_id === productMatch[1]);
      if (product) return json(res, toStorefrontDetail(product));
      return json(res, { error: 'Not found' }, 404);
    }

    if (resource === 'categories' && req.method === 'GET') {
      const cats = [...new Set(PRODUCTS.map((p) => p.category))];
      return json(res, {
        items: cats.map((c) => ({
          category: c,
          count: PRODUCTS.filter((p) => p.category === c).length,
        })),
      });
    }
  }

  // ── Widget API — session create/get → proxy + inject Mon Sheri products ──
  const body = await readBody(req);

  if (pathname === '/api/widget/v1/sessions' && req.method === 'POST') {
    // Создаём реальную сессию на prod бэкенде с нашим project_id
    const realBody = JSON.stringify({ project_id: REAL_PROJECT_ID });
    console.log(`[widget] POST /sessions → proxy to real backend`);
    proxyToReal(req, res, Buffer.from(realBody), '/api/widget/v1/sessions', injectMonSheriProducts);
    return;
  }

  if (pathname.match(/^\/api\/widget\/v1\/sessions\/[^/]+$/) && req.method === 'GET') {
    const token = pathname.split('/').pop();
    console.log(`[widget] GET /sessions/${token} → proxy to real backend`);
    proxyToReal(req, res, body, pathname, injectMonSheriProducts);
    return;
  }

  // ── Photo upload → сжимаем через sips, затем прокси ──
  if (pathname.match(/^\/api\/widget\/v1\/sessions\/[^/]+\/photos$/) && req.method === 'POST') {
    console.log(`[widget] POST ${pathname} → compress + proxy`);
    try {
      const compressedBody = await compressPhotoInMultipart(body, req.headers['content-type'] ?? '');
      proxyToReal(req, res, compressedBody, pathname + url.search);
    } catch (e) {
      console.error(`[compress] failed, proxying original: ${e}`);
      proxyToReal(req, res, body, pathname + url.search);
    }
    return;
  }

  // ── tryon — подменяем ms-* ID на реальные UUID ──
  if (pathname.match(/\/tryon$/) && req.method === 'POST') {
    try {
      const parsed = JSON.parse(body.toString());
      if (Array.isArray(parsed.product_ids)) {
        parsed.product_ids = parsed.product_ids.map((id: string) => MONSHERI_ID_MAP[id] ?? id);
      }
      const newBody = Buffer.from(JSON.stringify(parsed));
      console.log(`[tryon] product_ids → ${JSON.stringify(parsed.product_ids)}`);
      proxyToReal(req, res, newBody, pathname + url.search);
    } catch {
      proxyToReal(req, res, body, pathname + url.search);
    }
    return;
  }

  // ── recommend-size — подменяем ms-* ID на реальный UUID ──
  if (pathname === '/api/widget/v1/recommend-size' && req.method === 'POST') {
    try {
      const parsed = JSON.parse(body.toString());
      if (parsed.product_id && MONSHERI_ID_MAP[parsed.product_id]) {
        parsed.product_id = MONSHERI_ID_MAP[parsed.product_id];
      }
      proxyToReal(req, res, Buffer.from(JSON.stringify(parsed)), pathname + url.search);
    } catch {
      proxyToReal(req, res, body, pathname + url.search);
    }
    return;
  }

  // ── Все остальные Widget API вызовы → прокси на реальный бэкенд ──
  if (pathname.startsWith('/api/widget/')) {
    console.log(`[widget] ${req.method} ${pathname} → proxy`);
    proxyToReal(req, res, body, pathname + url.search);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n✅ Demo API server: http://localhost:${PORT}`);
  console.log(`   Widget:           http://localhost:${PORT}/widget/loader.js`);
  console.log(`   Image proxy:      http://localhost:${PORT}/img-proxy?url=<encoded>`);
  console.log(`   Storefront:       http://localhost:${PORT}/api/storefront/v1/demo-monsheri/products`);
  console.log(`   Widget session → proxy to real backend + Mon Sheri products`);
  console.log(`\n   Открой: http://localhost:8080\n`);
});
