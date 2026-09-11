import type { MetadataRoute } from 'next';

import { articles as staticArticles } from '@/data/blog';
import { getMergedArticles } from '@/data/blog-db';
import { LANDING_LAST_MODIFIED, absoluteUrl, routes } from '@/seo/site';

/**
 * sitemap.xml: лендинг + журнал (список и все статьи).
 *
 * Статьи берутся тем же способом, что и сами страницы журнала — через
 * getMergedArticles(): опубликованные из базы плюс статические, которые база
 * ещё не перекрыла. Иначе sitemap показывал бы не то, что реально открывается.
 *
 * force-dynamic — потому что список статей живёт в базе: собранный на этапе
 * сборки sitemap замёрз бы на составе каталога в момент деплоя.
 */
// eslint-disable-next-line import/no-unused-modules
export const dynamic = 'force-dynamic';

// eslint-disable-next-line import/no-unused-modules
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Недоступная база не должна ронять sitemap целиком: без него поисковик
  // теряет и лендинг. Падаем на статический набор статей.
  let articles = staticArticles;
  try {
    articles = await getMergedArticles();
  } catch {
    articles = staticArticles;
  }

  // lastmod журнала — дата самой свежей статьи в нём.
  const newest = articles.reduce<string>(
    (max, a) => ((a.updated ?? a.date) > max ? (a.updated ?? a.date) : max),
    LANDING_LAST_MODIFIED
  );

  return [
    {
      url: absoluteUrl(routes.landing),
      lastModified: new Date(LANDING_LAST_MODIFIED),
      // Лендинг правится часто, но не ежедневно — «weekly» ближе к правде,
      // чем «daily», а завышенная частота роботом просто игнорируется.
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: absoluteUrl(routes.blog),
      lastModified: new Date(newest),
      changeFrequency: 'weekly',
      priority: 0.7
    },
    ...articles.map((a) => ({
      url: absoluteUrl(routes.blogArticle(a.slug)),
      lastModified: new Date(a.updated ?? a.date),
      // Опубликованный разбор дальше почти не меняется.
      changeFrequency: 'monthly' as const,
      priority: 0.6
    }))
  ];
}
