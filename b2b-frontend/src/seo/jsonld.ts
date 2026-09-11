/**
 * Структурированные данные лендинга и журнала.
 *
 * Правило, которому здесь следуем: размечаем только то, что реально есть на
 * странице. Поэтому тут нет отзывов и рейтингов (их на сайте нет), нет
 * LocalBusiness (клиентов по адресу не принимают — см. комментарий к
 * organizationNode) и нет SearchAction у WebSite (поиск по сайту живёт внутри
 * страницы журнала и не имеет собственного адреса с параметром).
 */
import { OG_IMAGE, SITE_URL, absoluteUrl, organization, routes } from './site';

/** Стабильные идентификаторы узлов — чтобы ссылаться друг на друга внутри @graph. */
export const ID = {
  organization: `${SITE_URL}/#organization`,
  website: `${SITE_URL}/#website`,
  widget: `${SITE_URL}/#widget`
} as const;

type JsonLdNode = Record<string, unknown>;

/**
 * Организация.
 *
 * Адрес — юридический адрес ООО «МОНОРУС». Координат (geo) намеренно нет:
 * проверенных координат у нас не было, а выдуманные — это разметка под то,
 * чего нет. Географию закрываем честно: areaServed = Россия и адрес в Москве.
 * Тип LocalBusiness тоже не ставим: это SaaS, офис не место приёма покупателей,
 * а LocalBusiness у поисковиков означает именно точку обслуживания.
 */
export function organizationNode(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': ID.organization,
    name: organization.name,
    legalName: organization.legalName,
    url: `${SITE_URL}/`,
    logo: absoluteUrl(organization.logo),
    image: absoluteUrl(OG_IMAGE.url),
    email: organization.email,
    taxID: organization.inn,
    vatID: organization.inn,
    identifier: [
      { '@type': 'PropertyValue', name: 'ИНН', value: organization.inn },
      { '@type': 'PropertyValue', name: 'ОГРН', value: organization.ogrn },
      { '@type': 'PropertyValue', name: 'КПП', value: organization.kpp }
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: organization.address.street,
      addressLocality: organization.address.city,
      addressRegion: organization.address.city,
      postalCode: organization.address.postalCode,
      addressCountry: organization.address.country
    },
    areaServed: { '@type': 'Country', name: 'Россия' },
    knowsLanguage: 'ru-RU',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: organization.email,
        areaServed: 'RU',
        availableLanguage: ['ru']
      },
      {
        '@type': 'ContactPoint',
        contactType: 'legal',
        email: organization.legalEmail,
        areaServed: 'RU',
        availableLanguage: ['ru']
      }
    ]
  };
}

/**
 * Сайт как сущность. SearchAction не добавляем: поиск в журнале работает
 * на клиенте и не открывается ссылкой вида ?q=..., а разметка обещала бы
 * поисковику страницу результатов, которой нет.
 */
export function websiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': ID.website,
    url: `${SITE_URL}/`,
    name: organization.name,
    inLanguage: 'ru-RU',
    publisher: { '@id': ID.organization }
  };
}

/**
 * Сам виджет. SoftwareApplication, а не Product: продаётся доступ к сервису,
 * а не физическая вещь. Цена — та же, что напечатана в блоке с калькулятором
 * («8 ₽ стоит одна примерка»), поэтому разметка не расходится со страницей.
 * Рейтинга и отзывов нет — на сайте их тоже нет.
 */
export function widgetNode(): JsonLdNode {
  return {
    '@type': 'SoftwareApplication',
    '@id': ID.widget,
    name: 'MakeMeLook — виртуальная примерка одежды',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Виртуальная примерочная для интернет-магазина',
    operatingSystem: 'Web',
    url: absoluteUrl(routes.landing),
    image: absoluteUrl(OG_IMAGE.url),
    inLanguage: 'ru-RU',
    provider: { '@id': ID.organization },
    description:
      'Виджет виртуальной примерки для интернет-магазина одежды: покупатель загружает одно фото и видит товар на себе, до пяти слоёв одежды в одном образе. Рекомендованный размер считается по размерной сетке магазина.',
    featureList: [
      'Виртуальная примерка на фото покупателя',
      'До пяти слоёв одежды в одном образе',
      'Расчёт рекомендованного размера по размерной сетке магазина',
      'Чат-стилист, собирающий образ из каталога магазина',
      'Настройка внешнего вида кнопки и шагов под дизайн сайта',
      'Статистика примерок, добавлений в корзину и выкупов'
    ],
    offers: {
      '@type': 'Offer',
      price: '8',
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '8',
        priceCurrency: 'RUB',
        unitText: 'примерка',
        referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: 'примерка' }
      },
      seller: { '@id': ID.organization },
      eligibleRegion: { '@type': 'Country', name: 'Россия' }
    }
  };
}

/** Хлебные крошки. items идут от корня к текущей странице. */
export function breadcrumbNode(items: { name: string; path: string }[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export type ArticleForJsonLd = {
  slug: string;
  title: string;
  excerpt?: string;
  lead?: string;
  cover?: string;
  date: string;
  updated?: string;
  authorName?: string;
};

/** Статья журнала. */
export function blogPostingNode(a: ArticleForJsonLd): JsonLdNode {
  return {
    '@type': 'BlogPosting',
    '@id': `${absoluteUrl(routes.blogArticle(a.slug))}#article`,
    mainEntityOfPage: absoluteUrl(routes.blogArticle(a.slug)),
    headline: a.title,
    description: a.excerpt || a.lead || undefined,
    image: a.cover ? absoluteUrl(a.cover) : absoluteUrl(OG_IMAGE.url),
    datePublished: a.date,
    dateModified: a.updated ?? a.date,
    inLanguage: 'ru-RU',
    author: a.authorName
      ? { '@type': 'Person', name: a.authorName, worksFor: { '@id': ID.organization } }
      : { '@id': ID.organization },
    publisher: { '@id': ID.organization },
    isPartOf: { '@id': ID.website }
  };
}

/** Обёртка: собирает узлы в один @graph, который кладётся в одну <script>. */
export function graph(...nodes: JsonLdNode[]): JsonLdNode {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/**
 * Готовый граф лендинга. FAQPage передаётся снаружи: он генерируется из макета
 * (src/app/ru/v2/jsonld.generated.json) и остаётся единственным источником
 * вопросов — дублировать их здесь значило бы развести разметку и страницу.
 */
export function landingGraph(faqPage?: JsonLdNode): JsonLdNode {
  const nodes = [organizationNode(), websiteNode(), widgetNode()];
  if (faqPage) {
    // У готового FAQPage свой '@context' — внутри @graph он лишний и мешает
    // читать разметку глазами. Снимаем, содержимое не трогаем.
    const { '@context': _drop, ...rest } = faqPage as JsonLdNode & { '@context'?: unknown };
    nodes.push(rest);
  }
  return graph(...nodes);
}

/** Граф страницы журнала (список статей). */
export function blogIndexGraph(): JsonLdNode {
  return graph(
    breadcrumbNode([
      { name: 'Главная', path: routes.landing },
      { name: 'Журнал', path: routes.blog }
    ]),
    organizationNode()
  );
}

/** Граф страницы статьи. */
export function blogArticleGraph(a: ArticleForJsonLd): JsonLdNode {
  return graph(
    breadcrumbNode([
      { name: 'Главная', path: routes.landing },
      { name: 'Журнал', path: routes.blog },
      { name: a.title, path: routes.blogArticle(a.slug) }
    ]),
    blogPostingNode(a),
    organizationNode()
  );
}
