const cover1 = "/blog/cover-1.jpg";
const cover2 = "/blog/cover-2.jpg";
const cover3 = "/blog/cover-3.jpg";
const cover4 = "/blog/cover-4.jpg";
const cover5 = "/blog/cover-5.jpg";
const cover6 = "/blog/cover-6.jpg";

export type Author = {
  id: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
  color: string; // hex/css for avatar bg
};

export const authors: Record<string, Author> = {
  alina: {
    id: "alina",
    name: "Алина Соколова",
    role: "Head of Growth, MakeMeLook",
    bio: "8 лет в e-commerce, выводила в плюс fashion-бренды в РФ и СНГ. Пишет про конверсию, юнит-экономику и работу с возвратами.",
    initials: "АС",
    color: "#edefff",
  },
  igor: {
    id: "igor",
    name: "Игорь Лавров",
    role: "Solutions Architect, MakeMeLook",
    bio: "Внедряет виртуальную примерочную в магазины и маркетплейсы. Спец по подготовке каталогов и интеграциям.",
    initials: "ИЛ",
    color: "#f2e9ff",
  },
  team: {
    id: "team",
    name: "Команда MakeMeLook",
    role: "Product",
    bio: "Релизы, обновления и анонсы платформы.",
    initials: "ML",
    color: "#fef0e6",
  },
  daria: {
    id: "daria",
    name: "Дарья Никольская",
    role: "Research Lead, MakeMeLook",
    bio: "Исследует поведение покупателей в fashion-ритейле. Разбирается в UX-аналитике и продуктовых метриках.",
    initials: "ДН",
    color: "#e6f7ee",
  },
  mikhail: {
    id: "mikhail",
    name: "Михаил Орлов",
    role: "Engineering Lead, MakeMeLook",
    bio: "Отвечает за scale-out и интеграции с маркетплейсами. 12 лет в backend-инжиниринге.",
    initials: "МО",
    color: "#e6f0fb",
  },
  artem: {
    id: "artem",
    name: "Артём Веселов",
    role: "ML Researcher, MakeMeLook",
    bio: "Работает над диффузионными моделями и геометрией одежды. PhD по компьютерному зрению.",
    initials: "АВ",
    color: "#fdeaf0",
  },
};

export type Metric = { value: string; label: string; delta?: "up" | "down" | "neutral" };
export type Logo = { name: string; initials: string };

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string; cite?: string }
  | { type: "code"; lang?: string; code: string }
  | { type: "img"; src: string; alt: string }
  | { type: "metrics"; items: Metric[] }
  | { type: "cta"; title: string; text: string; button: string };

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
  tags: string[];
  date: string;
  updated?: string;
  readingTime: number;
  authorId: keyof typeof authors;
  lead: string;
  tldr?: string[];
  clients?: Logo[];
  featured?: boolean;
  content: Block[];
};

export const categories = ["Все", "Кейсы", "Гайды", "Новости", "Аналитика", "Технологии"] as const;

export const articles: Article[] = [
  {
    slug: "ai-try-on-conversion-uplift",
    title: "Как AI-примерочная увеличила конверсию магазина одежды на 38%",
    excerpt:
      "Разбираем кейс fashion-бренда, который внедрил виртуальную примерочную MakeMeLook и за 6 недель изменил ключевые метрики корзины.",
    cover: cover1,
    category: "Кейсы",
    tags: ["AI", "Конверсия", "Fashion"],
    date: "2025-03-12",
    updated: "2025-04-02",
    readingTime: 7,
    authorId: "alina",
    featured: true,
    lead:
      "За полтора месяца после запуска виртуальной примерочной средний чек вырос на 18%, а возвраты сократились почти на четверть. Рассказываем, как именно это произошло.",
    tldr: [
      "Конверсия в корзину выросла с 4,2% до 5,8% (+38%)",
      "Средний чек: +18%, возвраты: −7 п.п. за 6 недель",
      "Интеграция заняла 3 дня, без правок бэкенда",
    ],
    clients: [
      { name: "Lume", initials: "LU" },
      { name: "Forma", initials: "FO" },
      { name: "Atelier", initials: "AT" },
    ],
    content: [
      { type: "p", text: "Когда команда бренда обратилась к нам, у них была классическая для онлайн-fashion проблема: высокий процент возвратов и низкая конверсия из карточки товара в корзину. Покупатели не были уверены, как вещь сядет именно на них." },
      { type: "h2", text: "Контекст и стартовые метрики" },
      { type: "p", text: "До интеграции конверсия из просмотра карточки в добавление в корзину держалась на уровне 4,2%, средний чек — 4 800 ₽, доля возвратов — 31%. Это типичные значения для среднего ценового сегмента fashion-ритейла в России." },
      { type: "metrics", items: [
        { value: "4,2%", label: "Конверсия в корзину" },
        { value: "4 800 ₽", label: "Средний чек" },
        { value: "31%", label: "Доля возвратов" },
      ] },
      { type: "h2", text: "Что мы внедрили" },
      { type: "p", text: "Мы подключили виджет MakeMeLook прямо в карточку товара. Покупатель мог загрузить своё фото или выбрать модель, близкую по фигуре, и моментально увидеть, как вещь выглядит на нём." },
      { type: "h3", text: "Технические детали" },
      { type: "p", text: "Интеграция заняла 3 дня: подключение через скрипт, настройка маппинга артикулов и тестирование на 50 товарах. Никаких изменений в бэкенде магазина не потребовалось." },
      { type: "code", lang: "html", code: '<script src="https://cdn.makemelook.ai/widget.js" data-shop="demo"></script>' },
      { type: "cta", title: "Хотите такие же цифры?", text: "За 15 минут покажем, как примерочная встанет в ваш магазин и какой эффект ждать на ваших товарах.", button: "Запросить демо" },
      { type: "h2", text: "Результаты через 6 недель" },
      { type: "metrics", items: [
        { value: "+38%", label: "Конверсия в корзину", delta: "up" },
        { value: "+18%", label: "Средний чек", delta: "up" },
        { value: "−7 п.п.", label: "Возвраты", delta: "down" },
        { value: "+74%", label: "Время на карточке", delta: "up" },
      ] },
      { type: "quote", text: "Виртуальная примерочная стала нашим главным инструментом борьбы с возвратами. Это буквально перевернуло unit-экономику.", cite: "CMO бренда" },
      { type: "h2", text: "Что дальше" },
      { type: "p", text: "Сейчас бренд расширяет интеграцию на категорию обуви и аксессуаров. Мы готовим отдельный кейс по этим разделам — подписывайтесь, чтобы не пропустить." },
    ],
  },
  {
    slug: "virtual-fitting-room-guide",
    title: "Гайд: как подготовить каталог к виртуальной примерочной",
    excerpt: "Чек-лист для ритейлера: какие фото нужны, как описывать ткани и размерные сетки, чтобы AI работал точно.",
    cover: cover2,
    category: "Гайды",
    tags: ["Каталог", "Подготовка", "Best practices"],
    date: "2025-02-28",
    readingTime: 5,
    authorId: "igor",
    lead: "Качество виртуальной примерки на 80% зависит от того, как подготовлен исходный каталог. Собрали практические рекомендации, проверенные на десятках интеграций.",
    tldr: [
      "Фото — фронт, нейтральный фон, от 1500×2000 px",
      "Размерная сетка в см: грудь, талия, бёдра, длина",
      "Описание ткани в стандартных терминах",
    ],
    content: [
      { type: "p", text: "Виртуальная примерочная — это не магия, а математика. И как любая математика, она требует чистых входных данных. Чем аккуратнее ваш каталог, тем точнее AI-модель будет проектировать одежду на пользователя." },
      { type: "h2", text: "Фотографии товара" },
      { type: "p", text: "Идеальное фото — на нейтральном фоне, фронтальный ракурс, манекен или модель в естественной позе с руками вдоль тела. Минимум драпировок и сложного освещения." },
      { type: "ul", items: [
        "Разрешение от 1500×2000 px",
        "Однотонный фон (белый или светло-серый)",
        "Один товар на фото, без аксессуаров",
        "Естественное освещение без жёстких теней",
      ] },
      { type: "cta", title: "Скачайте чек-лист", text: "Полная версия гайда в одном PDF — отдайте контент-менеджеру и подготовьте каталог за день.", button: "Получить чек-лист" },
      { type: "h2", text: "Размерная сетка" },
      { type: "p", text: "Загрузите таблицу с реальными замерами в сантиметрах: обхват груди, талии, бёдер, длина изделия. Этого достаточно для базовой подгонки." },
      { type: "h2", text: "Описание материала" },
      { type: "p", text: "AI учитывает свойства ткани: насколько она тянется, как ложится, какая плотность. Используйте стандартные термины — «трикотаж», «деним», «шёлк», «шифон»." },
      { type: "quote", text: "Самая частая ошибка — загрузить каталог как есть и ждать, что всё заработает. Час на подготовку метаданных экономит недели поддержки." },
    ],
  },
  {
    slug: "release-notes-march-2025",
    title: "Релиз марта: новый редактор поз и API для маркетплейсов",
    excerpt: "Обновили движок генерации, добавили возможность задавать кастомные позы и выпустили обвязку для интеграции с маркетплейсами.",
    cover: cover5,
    category: "Новости",
    tags: ["Релиз", "API", "Маркетплейсы"],
    date: "2025-03-01",
    readingTime: 3,
    authorId: "team",
    lead: "Главное за март: больше контроля над визуалом, новые точки интеграции и заметное ускорение рендера.",
    tldr: [
      "Редактор поз: фронт, ¾, профиль, ходьба",
      "API v2 с батчами до 500 SKU",
      "Среднее время рендера: 2,8 → 1,4 с",
    ],
    content: [
      { type: "h2", text: "Редактор поз" },
      { type: "p", text: "Теперь вы можете задавать позы модели через простой пресет-пикер: фронт, три четверти, профиль, ходьба. Это особенно полезно для категорий outerwear и сложных силуэтов." },
      { type: "h2", text: "API для маркетплейсов" },
      { type: "p", text: "Выпустили v2 нашего REST API с поддержкой батч-обработки до 500 SKU за один запрос. Идеально для крупных площадок, которые загружают каталоги пачками." },
      { type: "code", lang: "bash", code: 'curl -X POST https://api.makemelook.ai/v2/batch \\\n  -H "Authorization: Bearer $TOKEN" \\\n  -d @catalog.json' },
      { type: "h2", text: "Производительность" },
      { type: "metrics", items: [
        { value: "1,4 с", label: "Время рендера", delta: "down" },
        { value: "2×", label: "Ускорение", delta: "up" },
        { value: "500", label: "SKU за запрос" },
      ] },
    ],
  },
  {
    slug: "fashion-ecommerce-trends-2025",
    title: "Тренды fashion-ecommerce 2025: что меняется в покупательском поведении",
    excerpt: "Аналитика по 120 онлайн-магазинам одежды: где растёт мобильная конверсия, как меняется подход к фото и что покупатели ждут от карточки товара.",
    cover: cover6,
    category: "Аналитика",
    tags: ["Тренды", "Аналитика", "UX"],
    date: "2025-02-14",
    readingTime: 8,
    authorId: "daria",
    lead: "Мы проанализировали поведение пользователей в 120 fashion-магазинах и собрали ключевые сдвиги, которые произошли за последний год.",
    tldr: [
      "Мобильный трафик в fashion: 64% → 78% за год",
      "Видео в карточке даёт +12% к конверсии",
      "Virtual try-on в топ-3 факторов выбора магазина",
    ],
    content: [
      { type: "h2", text: "Мобайл становится основной точкой покупки" },
      { type: "p", text: "Доля заказов с мобильных устройств в выборке выросла с 64% до 78% за год. При этом конверсия на мобильных всё ещё на 20% ниже десктопной." },
      { type: "metrics", items: [
        { value: "78%", label: "Мобильный трафик", delta: "up" },
        { value: "+12%", label: "Видео в карточке", delta: "up" },
        { value: "41%", label: "Ждут virtual try-on" },
      ] },
      { type: "h2", text: "Видео в карточке вместо галереи" },
      { type: "p", text: "Карточки с короткими видео-роликами (5–8 секунд) дают +12% к конверсии относительно классических галерей." },
      { type: "h2", text: "Виртуальная примерка как стандарт" },
      { type: "p", text: "В 2024 году virtual try-on был «фишкой». В 2025 — становится ожидаемым элементом UX. 41% опрошенных покупателей назвали её фактором выбора магазина." },
      { type: "cta", title: "Не отставайте от тренда", text: "Подключите виртуальную примерочную к своему магазину за несколько дней.", button: "Запросить демо" },
    ],
  },
  {
    slug: "case-marketplace-integration",
    title: "Кейс: интеграция MakeMeLook в крупный российский маркетплейс",
    excerpt: "Как мы за 4 недели подключили виртуальную примерочную к каталогу из 240 000 SKU и не положили продакшн.",
    cover: cover3,
    category: "Кейсы",
    tags: ["Маркетплейс", "Интеграция", "Scale"],
    date: "2025-01-22",
    readingTime: 6,
    authorId: "mikhail",
    lead: "Большой каталог — большой стресс. Делимся, как мы спроектировали интеграцию, чтобы она выдержала сезонный пик трафика.",
    tldr: [
      "240 000 SKU обработано за 4 недели",
      "Cache hit ratio 94% к концу 2-й недели",
      "Среднее время рендера: 1,6 секунды",
    ],
    clients: [
      { name: "Marketplace A", initials: "MA" },
      { name: "Brand B", initials: "BB" },
    ],
    content: [
      { type: "h2", text: "Архитектура" },
      { type: "p", text: "Мы вынесли всю обработку каталога в очередь и обрабатывали SKU батчами по 500 штук. Это позволило не упереться в rate-limit и держать предсказуемое время отклика." },
      { type: "h2", text: "Кэширование" },
      { type: "p", text: "Сгенерированные образы кэшируются на CDN на стороне маркетплейса. Cache hit ratio через 2 недели вышел на 94%." },
      { type: "metrics", items: [
        { value: "240k", label: "SKU обработано" },
        { value: "94%", label: "Cache hit ratio", delta: "up" },
        { value: "1,6 с", label: "Время рендера" },
      ] },
      { type: "quote", text: "Главный челлендж был не в AI, а в инженерной обвязке. AI давно работает — а вот scale-out требует усилий." },
      { type: "h2", text: "Итог" },
      { type: "p", text: "За 4 недели обработали весь каталог, выдержали Чёрную пятницу без единого инцидента, средний рендер — 1,6 секунды." },
    ],
  },
  {
    slug: "ai-models-behind-makemelook",
    title: "Что под капотом: модели и пайплайны MakeMeLook",
    excerpt: "Глубокий технический разбор архитектуры: как мы комбинируем диффузионные модели и геометрические сетки одежды.",
    cover: cover4,
    category: "Технологии",
    tags: ["AI", "ML", "Архитектура"],
    date: "2025-01-08",
    readingTime: 10,
    authorId: "artem",
    lead: "Технический пост для тех, кому интересны детали. Разбираем, как устроен наш пайплайн виртуальной примерки от загрузки фото до финального рендера.",
    tldr: [
      "3 стадии: парсинг тела, ретопология одежды, рендер",
      "SMPL-X на 140k размеченных образов",
      "Диффузионная модель: 1,4 с на образ",
    ],
    content: [
      { type: "h2", text: "Общая схема" },
      { type: "p", text: "Пайплайн состоит из трёх ключевых стадий: парсинг тела пользователя, ретопология одежды на сетку фигуры, финальный рендер с диффузионной моделью." },
      { type: "h3", text: "Парсинг тела" },
      { type: "p", text: "Используем кастомный fork SMPL-X, дообученный на нашем датасете из ~140 000 размеченных образов. На выходе получаем 3D-меш фигуры пользователя." },
      { type: "h3", text: "Ретопология одежды" },
      { type: "p", text: "Каждый товар при загрузке проходит через сегментацию и упрощение в трёхмерную сетку. На пользовательском теле мы натягиваем эту сетку с учётом физики ткани." },
      { type: "h3", text: "Финальный рендер" },
      { type: "p", text: "Диффузионная модель дорисовывает текстуры, тени и складки. Среднее время — 1,4 секунды на образ." },
      { type: "code", lang: "python", code: "result = pipeline.run(\n    user_photo=photo,\n    garment_id=sku,\n    pose='front',\n)" },
    ],
  },
];

export const getArticleBySlug = (slug: string) => articles.find((a) => a.slug === slug);

export const getRelatedArticles = (current: Article, limit = 3) => {
  return articles
    .filter((a) => a.slug !== current.slug)
    .map((a) => ({
      a,
      score:
        (a.category === current.category ? 2 : 0) +
        a.tags.filter((t) => current.tags.includes(t)).length,
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.a);
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

export const relativeDate = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const day = 86400;
  if (diff < day) return "сегодня";
  if (diff < day * 2) return "вчера";
  if (diff < day * 7) return `${Math.floor(diff / day)} дн. назад`;
  if (diff < day * 30) return `${Math.floor(diff / (day * 7))} нед. назад`;
  if (diff < day * 365) return `${Math.floor(diff / (day * 30))} мес. назад`;
  return `${Math.floor(diff / (day * 365))} г. назад`;
};
