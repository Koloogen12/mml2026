import type { MetadataRoute } from 'next';

import { DISALLOWED_PATHS, SITE_URL, absoluteUrl } from '@/seo/site';

/**
 * robots.txt.
 *
 * Отдаётся кодом, а не файлом в public/, чтобы адрес sitemap и список закрытых
 * разделов брались из того же места, что канонические ссылки: рассинхрон между
 * robots.txt и sitemap.xml — самая частая причина «страница закрыта в robots.txt»
 * в панелях вебмастера.
 *
 * Host указан явно: на сервере рядом живут соседние проекты, и приложение может
 * открыться по чужому имени или по IP. Вместе с абсолютным каноническим адресом
 * это говорит роботу, какой адрес считать единственным.
 */
// eslint-disable-next-line import/no-unused-modules
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...DISALLOWED_PATHS]
      }
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL
  };
}
