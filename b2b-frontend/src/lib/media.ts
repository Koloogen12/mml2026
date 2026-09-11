import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Картинки блога: где лежат, как называются, что вообще принимаем.
 *
 * Файлы кладутся в /app/data/media — это смонтированный том (volume
 * landingdata в compose), тот же, где лежит SQLite блога. Не в public/:
 * public попадает внутрь образа на сборке, и всё загруженное редактором
 * пропадало бы при каждом деплое.
 *
 * Имя файла — хеш содержимого. Три следствия, ради которых так и сделано:
 *   • один и тот же файл, залитый дважды, не займёт места дважды;
 *   • имя не зависит от того, что пользователь назвал файл (никаких пробелов,
 *     кириллицы и «../» в пути);
 *   • содержимое по адресу не меняется никогда, значит отдавать можно с
 *     годовым immutable-кэшем.
 */

/** Каталог с загруженными картинками. Переопределяется MEDIA_DIR. */
export function mediaDir(): string {
  return process.env.MEDIA_DIR ?? path.join(process.cwd(), 'data', 'media');
}

/**
 * Что принимаем. SVG в списке намеренно нет: это XML, внутри которого
 * исполняется скрипт, а файл отдаётся с нашего домена — залитая обложка
 * стала бы XSS в админке и на сайте.
 */
const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif'
};

export const MAX_BYTES = 8 * 1024 * 1024;

/** Расширение по MIME-типу; null — значит тип не разрешён. */
export function extensionFor(mime: string): string | null {
  return ALLOWED[mime] ?? null;
}

/** MIME-тип по имени файла в хранилище (для заголовка при отдаче). */
export function mimeForFile(file: string): string | null {
  const ext = path.extname(file).toLowerCase();
  const found = Object.entries(ALLOWED).find(([, e]) => e === ext);
  return found ? found[0] : null;
}

/**
 * Сигнатура содержимого. Declared MIME из браузера — это подсказка, а не
 * факт: заголовок подставляет клиент. Поэтому тип определяем по первым
 * байтам и сверяем с заявленным.
 */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png';
  if (buf.subarray(0, 3).toString('latin1') === 'GIF') return 'image/gif';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP')
    return 'image/webp';
  // AVIF: ISO-BMFF, бренд в ftyp-боксе.
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('latin1');
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
}

/** Имя в хранилище: 32 hex-символа хеша плюс расширение. */
export function storageName(buf: Buffer, ext: string): string {
  return createHash('sha256').update(buf).digest('hex').slice(0, 32) + ext;
}

/**
 * Имя безопасно для файловой системы? Проверяется на отдаче: параметр
 * маршрута приходит из адресной строки, и без этой проверки «..%2F..%2Fetc»
 * читал бы что угодно с диска.
 */
export function isSafeStorageName(file: string): boolean {
  return /^[0-9a-f]{32}\.(jpg|png|webp|avif|gif)$/.test(file);
}

/** Публичный адрес файла. */
export function publicUrl(file: string): string {
  return `/media/${file}`;
}

export async function saveMedia(buf: Buffer, ext: string): Promise<string> {
  const dir = mediaDir();
  await mkdir(dir, { recursive: true });
  const name = storageName(buf, ext);
  const dest = path.join(dir, name);
  // Имя = хеш содержимого, значит перезапись тем же содержимым бессмысленна.
  try {
    await readFile(dest);
  } catch {
    await writeFile(dest, buf);
  }
  return name;
}

export async function readMedia(file: string): Promise<Buffer | null> {
  if (!isSafeStorageName(file)) return null;
  try {
    return await readFile(path.join(mediaDir(), file));
  } catch {
    return null;
  }
}
