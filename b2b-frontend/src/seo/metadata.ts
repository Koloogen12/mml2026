/**
 * Готовые объекты metadata для страниц лендинга и журнала.
 *
 * Страницы их только импортируют — чтобы канонические адреса, OG-обложка и
 * директивы для роботов задавались в одном месте, а не переписывались в каждом
 * page.tsx по памяти.
 *
 * Подключение (после переезда маршрутов):
 *   // src/app/page.tsx        → export const metadata = landingMetadata;
 *   // src/app/blog/page.tsx   → export const metadata = blogIndexMetadata;
 *   // src/app/blog/[slug]/page.tsx → return blogArticleMetadata(article);
 */
import type { Metadata } from 'next';

import { OG_IMAGE, SITE_URL, absoluteUrl, organization, routes } from './site';

/** Общие для всего сайта основания: база для относительных адресов и язык. */
export const metadataBase = new URL(SITE_URL);

const ogImage = {
  url: OG_IMAGE.url,
  width: OG_IMAGE.width,
  height: OG_IMAGE.height,
  alt: OG_IMAGE.alt
};

/**
 * Разрешения для роботов. max-image-preview:large нужен, чтобы в выдаче и в
 * «Турбо»-подобных карточках картинка показывалась крупно, а не иконкой.
 */
const indexable: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1
  }
};

/** Для служебных разделов: кабинет, стенды, демо-витрина. */
export const noindex: Metadata = {
  robots: { index: false, follow: false, nocache: true }
};

const TITLE = 'Виртуальная примерка одежды для интернет-магазина — MakeMeLook';
const DESCRIPTION =
  'Виджет примерки на сайт магазина одежды: покупатель загружает одно фото и видит вашу вещь на себе, до пяти слоёв в образе. Размер считается по вашей размерной сетке. Скрипт ставится за десять минут.';

/**
 * Семантика лендинга. Список короткий и честный: это ровно те запросы, на
 * которые страница отвечает текстом, а не всё, что хотелось бы собрать.
 * Основную работу делают H1, подзаголовки и текст блоков — meta keywords
 * поисковики давно не учитывают, поле оставлено как справка для команды.
 */
export const KEYWORDS = [
  'виртуальная примерка одежды',
  'виртуальная примерочная для сайта',
  'виджет примерки для интернет-магазина',
  'примерка одежды по фото',
  'подбор размера одежды онлайн',
  'рекомендация размера в интернет-магазине',
  'снижение возвратов одежды',
  'примерка для Tilda и InSales'
];

/** Лендинг. */
export const landingMetadata: Metadata = {
  metadataBase,
  title: TITLE,
  description: DESCRIPTION,
  keywords: KEYWORDS,
  applicationName: organization.name,
  authors: [{ name: organization.name, url: absoluteUrl(routes.landing) }],
  creator: organization.legalName,
  publisher: organization.legalName,
  category: 'technology',
  robots: indexable,
  alternates: { canonical: absoluteUrl(routes.landing) },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: organization.name,
    url: absoluteUrl(routes.landing),
    title: TITLE,
    description: DESCRIPTION,
    images: [ogImage]
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url]
  }
};

const BLOG_TITLE = 'Журнал MakeMeLook — возвраты, размерные сетки и примерка';
const BLOG_DESCRIPTION =
  'Разборы на данных магазинов одежды: из чего складывается цена возврата, как собрать размерную сетку и какие фото товара подходят для примерки. С методикой и источниками.';

/** Список статей журнала. */
export const blogIndexMetadata: Metadata = {
  metadataBase,
  title: BLOG_TITLE,
  description: BLOG_DESCRIPTION,
  robots: indexable,
  alternates: { canonical: absoluteUrl(routes.blog) },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: organization.name,
    url: absoluteUrl(routes.blog),
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    images: [ogImage]
  },
  twitter: {
    card: 'summary_large_image',
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    images: [OG_IMAGE.url]
  }
};

export type ArticleForMetadata = {
  slug: string;
  title: string;
  excerpt?: string;
  lead?: string;
  cover?: string;
  date: string;
  updated?: string;
  authorName?: string;
};

/**
 * Статья журнала. Обложка статьи идёт в OG, если она есть, иначе — общая
 * обложка лендинга: пустой og:image в мессенджере выглядит как битая ссылка.
 */
export function blogArticleMetadata(a: ArticleForMetadata): Metadata {
  const url = absoluteUrl(routes.blogArticle(a.slug));
  const description = a.excerpt || a.lead || BLOG_DESCRIPTION;
  const image = a.cover ? absoluteUrl(a.cover) : absoluteUrl(OG_IMAGE.url);

  return {
    metadataBase,
    title: `${a.title} — Журнал MakeMeLook`,
    description,
    robots: indexable,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      locale: 'ru_RU',
      siteName: organization.name,
      url,
      title: a.title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: a.title }],
      publishedTime: a.date,
      modifiedTime: a.updated ?? a.date,
      authors: a.authorName ? [a.authorName] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title: a.title,
      description,
      images: [image]
    }
  };
}

/** Метаданные для страницы, которой не должно быть в индексе. */
export function noindexMetadata(title: string): Metadata {
  return { metadataBase, title, ...noindex };
}
