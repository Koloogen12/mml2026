import { articles as staticArticles } from '@/data/blog';
import { getMergedArticles } from '@/data/blog-db';

/**
 * Блок «Журнал» на лендинге.
 *
 * В макете там четыре карточки с выдуманными заголовками и ссылкой на файл
 * макета — то есть в бою они никуда не вели. Берём тот же список статей, что
 * и страница /blog (опубликованные из базы плюс статический набор, который
 * база ещё не перекрыла), и раскладываем по той же вёрстке.
 *
 * Всё, что зависит от локали (месяц прописью), считается здесь, на сервере, и
 * приезжает в разметку готовой строкой. Если форматировать дату в компоненте,
 * сервер и браузер могут разойтись в написании — и React перерисует блок с
 * предупреждением о несовпадении гидрации.
 */

export type JournalCard = {
  href: string;
  cover: string;
  alt: string;
  /** Плашка слева: рубрика статьи. */
  badge: string;
  /** Строка справа от плашки: дата и/или время чтения. */
  meta: string;
  title: string;
  excerpt: string;
};

export type JournalData = {
  /** Большая карточка. null — если статей нет вовсе. */
  lead: JournalCard | null;
  /** Три карточки помельче. */
  rest: JournalCard[];
  /**
   * Адрес разбора, на который ссылается блок «Примерка переехала в логистику».
   * null, пока такой статьи нет: ссылка «Читать полностью» тогда просто не
   * рисуется — это честнее, чем вести читателя на «Статья не найдена».
   */
  whyNowHref: string | null;
};

/** Слаг разбора под блоком о рынке. Появится статья с таким адресом — появится ссылка. */
const WHY_NOW_SLUG = 'primerka-pereehala-v-logistiku';

const MONTHS = [
  'ЯНВАРЯ', 'ФЕВРАЛЯ', 'МАРТА', 'АПРЕЛЯ', 'МАЯ', 'ИЮНЯ',
  'ИЮЛЯ', 'АВГУСТА', 'СЕНТЯБРЯ', 'ОКТЯБРЯ', 'НОЯБРЯ', 'ДЕКАБРЯ'
];

function dateUpper(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} ${MONTHS[m - 1]}`;
}

type Source = {
  slug: string;
  title: string;
  excerpt: string;
  lead?: string;
  cover: string;
  category: string;
  readingTime: number;
  date: string;
};

function toCard(a: Source, withDate: boolean): JournalCard {
  const minutes = Math.max(1, Math.round(a.readingTime));
  return {
    href: `/blog/${a.slug}`,
    cover: a.cover,
    alt: a.title,
    badge: a.category.toUpperCase(),
    meta: withDate ? `${dateUpper(a.date)} · ${minutes} МИН` : `${minutes} мин`,
    title: a.title,
    excerpt: a.excerpt || a.lead || ''
  };
}

export async function getJournal(): Promise<JournalData> {
  // Недоступная база не должна ронять лендинг: блок «Журнал» — не главное,
  // ради чего на страницу приходят. Падаем на статический набор.
  let all: Source[] = staticArticles;
  try {
    all = (await getMergedArticles()) as Source[];
  } catch {
    all = staticArticles;
  }

  const known = new Set(all.map((a) => a.slug));

  return {
    lead: all[0] ? toCard(all[0], true) : null,
    rest: all.slice(1, 4).map((a) => toCard(a, false)),
    whyNowHref: known.has(WHY_NOW_SLUG) ? `/blog/${WHY_NOW_SLUG}` : null
  };
}
