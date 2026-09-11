/**
 * Генератор OG-обложки лендинга: public/landing/ru/og-ru-landing.jpg
 *
 * Обложка собирается из того же кадра, что живёт в hero (hero-16x9.mp4),
 * чтобы превью в мессенджере и первый экран сайта показывали одно и то же.
 * Кадр выбран на 5-й секунде: там на человеке пять слоёв одежды и рядом видна
 * панель виджета — ровно то, о чём лендинг.
 *
 * Запуск (только локально: нужны ffmpeg и шрифты Unbounded/Golos в системе):
 *   node scripts/og-image.mjs
 * Результат коммитится в репозиторий — в Docker-сборке скрипт не участвует.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'public/landing/ru/hero-16x9.mp4');
const OUT = path.join(root, 'public/landing/ru/og-ru-landing.jpg');

const W = 1200;
const H = 630;
const AT = '5.0'; // секунда кадра
const L = 64; // левое поле текста

const tmp = mkdtempSync(path.join(tmpdir(), 'mml-og-'));

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

try {
  // 1. Кадр из видео. Кадрирование повторяет hero: object-fit:cover при
  //    object-position 50% 12% — поэтому вертикально режем со смещением.
  const frame = path.join(tmp, 'frame.png');
  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    '-ss', AT, '-i', SRC,
    '-frames:v', '1',
    '-vf', `scale=${W}:900,crop=${W}:${H}:0:32`,
    frame
  ]);

  // 2. Затемнение и текст одним слоем. Градиенты — те же два, что лежат
  //    поверх hero на сайте: вертикальный к низу и горизонтальный слева.
  //    Текст ложится на них, а не на человека.
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#0A0E16" stop-opacity="0.42"/>
      <stop offset="24%"  stop-color="#0A0E16" stop-opacity="0.12"/>
      <stop offset="52%"  stop-color="#0A0E16" stop-opacity="0.40"/>
      <stop offset="100%" stop-color="#0A0E16" stop-opacity="0.72"/>
    </linearGradient>
    <linearGradient id="h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#0A0E16" stop-opacity="0.72"/>
      <stop offset="34%"  stop-color="#0A0E16" stop-opacity="0.40"/>
      <stop offset="66%"  stop-color="#0A0E16" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="hb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#0A0E16" stop-opacity="0.72"/>
      <stop offset="40%"  stop-color="#0A0E16" stop-opacity="0.40"/>
      <stop offset="64%"  stop-color="#0A0E16" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fadeUp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="30%"  stop-color="#000000"/>
      <stop offset="82%"  stop-color="#ffffff"/>
    </linearGradient>
    <mask id="bottomOnly">
      <rect width="${W}" height="${H}" fill="url(#fadeUp)"/>
    </mask>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#v)"/>
  <rect width="${W}" height="${H}" fill="url(#h)"/>
  <!-- Дополнительное затемнение только под текстовым блоком: панель виджета
       справа остаётся читаемой, а заголовок не спорит с рисунком одежды.
       Маска гасит слой кверху, чтобы не было видимой границы. -->
  <rect width="${W}" height="${H}" fill="url(#hb)" mask="url(#bottomOnly)"/>

  <text x="${L}" y="72" font-family="Unbounded" font-size="26"
        letter-spacing="-0.5" fill="#ffffff">MakeMeLook</text>

  <text x="${L}" y="382" font-family="Golos UI" font-size="15"
        letter-spacing="1.6" fill="#ffffff" fill-opacity="0.72"
        >${esc('ВИРТУАЛЬНАЯ ПРИМЕРКА ДЛЯ ИНТЕРНЕТ-МАГАЗИНОВ ОДЕЖДЫ')}</text>

  <text x="${L}" y="444" font-family="Unbounded" font-size="46"
        letter-spacing="-1.4" fill="#ffffff">${esc('Ваша одежда на покупателе')}</text>
  <text x="${L}" y="500" font-family="Unbounded" font-size="46"
        letter-spacing="-1.4" fill="#ffffff">${esc('до заказа')}</text>

  <text x="${L}" y="552" font-family="Golos UI" font-size="20"
        fill="#ffffff" fill-opacity="0.80"
        >${esc('Одно фото — и покупатель видит вашу вещь на себе.')}</text>
  <text x="${L}" y="580" font-family="Golos UI" font-size="20"
        fill="#ffffff" fill-opacity="0.80"
        >${esc('Размер считается по вашей размерной сетке.')}</text>
</svg>`;

  await sharp(frame)
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .jpeg({ quality: 86, chromaSubsampling: '4:4:4' })
    .toFile(OUT);

  console.log('готово:', path.relative(root, OUT));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
