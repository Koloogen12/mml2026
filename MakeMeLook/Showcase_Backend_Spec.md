# Спецификация: Бэкенд для шоукейс-магазина MakeMeLook

> **Цель:** превратить статичное демо (demo-for-mml-main) в живой шоукейс, где товары грузятся из реальной БД MakeMeLook SaaS, а виджет виртуальной примерки работает на боевом API.
>
> **Чекаут, оплата, авторизация покупателей — НЕ нужны.** Это витрина для демонстрации продукта потенциальным B2B-клиентам.

---

## 1. Текущее состояние

### 1.1 Фронтенд (demo-for-mml-main)
- **Стек:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Router
- **Сборка:** Lovable (lovable-tagger в devDependencies)
- **Проблема:** все товары захардкожены в 4 местах:
  - `src/components/content/ProductCarousel.tsx` — 6 товаров (luxury бренды, ₽)
  - `src/components/content/ProductGrid.tsx` — 12 товаров (luxury бренды, ₽)
  - `src/components/category/ProductGrid.tsx` — 24 товара (ювелирка, €!) ← **баг: другая тема**
  - `src/components/product/ProductInfo.tsx` — 1 товар (Valentino платье)
  - `src/components/product/ProductImageGallery.tsx` — захардкоженные изображения
- **Виджет:** уже подключен через `<script src="https://cdn.makemeelook.ai/widget/loader.js" data-project="PROJECT_ID" async></script>`
- **Триггер виджета:** `window.dispatchEvent(new CustomEvent('makemeelook:open'))` — работает на кнопках "Примерить" и floating button

### 1.2 SaaS Backend (mml-saas-backend)
- **Стек:** Go + Chi router + GORM + PostgreSQL + Minio S3
- **Продуктовый API (защищённый, JWT):**
  - `GET /api/v1/projects/{id}/products` — список с фильтрами (search, category, gender, group_id, status)
  - `GET /api/v1/projects/{id}/products/{productId}` — детали товара
  - `POST /api/v1/projects/{id}/products` — создание
  - Фото: загрузка, reorder, удаление
  - CSV импорт: parse-headers → validate → execute
- **Widget API (публичный, domain verification):**
  - `GET /api/widget/v1/config/{projectId}` — конфиг виджета
  - `POST /api/widget/v1/sessions` — создание сессии
  - `POST /api/widget/v1/sessions/{token}/tryon` — запуск примерки
  - `POST /api/widget/v1/sessions/{token}/products/sync` — синхронизация товаров с платформы
- **Модель товара (ProductResponse):**
  ```json
  {
    "id": 1,
    "public_id": "uuid",
    "project_id": 1,
    "name": "Платье макси из шёлка",
    "category": "tops",
    "subcategory": "dresses",
    "gender": "female",
    "sku": "VAL-001",
    "price": 87500,
    "discount_price": null,
    "currency": "RUB",
    "product_url": "https://...",
    "season": ["spring", "summer"],
    "color": "red",
    "material": "silk",
    "brand": "VALENTINO",
    "sizes": ["XS", "S", "M", "L", "XL"],
    "description": "...",
    "is_active": true,
    "source": "manual",
    "photos": [
      {"id": 1, "url": "https://s3.../photo.jpg", "sort_order": 0}
    ],
    "created_at": "...",
    "updated_at": "..."
  }
  ```

---

## 2. Архитектура решения

### Принцип: НЕ создаём отдельный бэкенд для магазина

Шоукейс-магазин должен работать на **публичном API существующего SaaS-бэкенда**. Для этого нужно добавить один новый блок роутов — **Storefront API**.

```
┌─────────────────────┐     ┌──────────────────────────┐
│  Шоукейс-магазин    │────▶│  MML SaaS Backend        │
│  (React, Lovable)   │     │                          │
│                     │     │  /api/storefront/v1/     │
│  cdn.makemeelook.ai │     │    {projectPublicId}/    │
│  widget loader.js   │────▶│    products              │
│                     │     │    products/{publicId}    │
│                     │     │    categories             │
│                     │     │                          │
└─────────────────────┘     │  /api/widget/v1/         │
                            │    config/{projectId}    │
                            │    sessions/...          │
                            └──────────────────────────┘
```

### Почему не отдельный бэкенд:
1. Товары уже в БД MakeMeLook — дублировать бессмысленно
2. Фото уже на S3/Minio — URL'ы готовы
3. Один проект в админке = один шоукейс-магазин = единый каталог
4. Меньше инфраструктуры, быстрее деплой

---

## 3. Задача 1: Storefront API (бэкенд)

### 3.1 Новые эндпоинты

Все эндпоинты **публичные** (без JWT), но с rate limiting.

#### `GET /api/storefront/v1/{projectPublicId}/products`

Возвращает список активных товаров проекта.

**Query parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `category` | string | Фильтр по категории (`outerwear`, `tops`, `bottoms`, `shoes`, `accessories`) |
| `gender` | string | Фильтр по полу (`female`, `male`, `kids`, `unisex`) |
| `brand` | string | Фильтр по бренду (точное совпадение) |
| `color` | string | Фильтр по цвету |
| `search` | string | Поиск по имени/бренду |
| `sort` | string | Сортировка: `newest`, `price_asc`, `price_desc` |
| `group_id` | int | Фильтр по группе товаров |
| `offset` | int | Пагинация, default 0 |
| `limit` | int | Пагинация, default 20, max 100 |

**Response:**
```json
{
  "products": [
    {
      "id": "uuid-public-id",
      "name": "Платье макси из шёлка с V-образным вырезом",
      "brand": "VALENTINO",
      "category": "tops",
      "subcategory": "dresses",
      "price": 87500,
      "discount_price": null,
      "currency": "RUB",
      "color": "red",
      "sizes": ["XS", "S", "M", "L", "XL"],
      "is_new": true,
      "photos": [
        {"url": "https://s3.../photo1.jpg", "sort_order": 0},
        {"url": "https://s3.../photo2.jpg", "sort_order": 1}
      ]
    }
  ],
  "total": 42,
  "offset": 0,
  "limit": 20,
  "filters": {
    "categories": ["tops", "bottoms", "outerwear", "accessories"],
    "brands": ["VALENTINO", "BALENCIAGA", "LORO PIANA"],
    "colors": ["red", "black", "beige"],
    "price_range": {"min": 12000, "max": 245000}
  }
}
```

**Важно:**
- Возвращаем ТОЛЬКО `is_active = true` товары
- `id` в ответе = `public_id` (UUID), НЕ internal int ID
- Поле `is_new` = `created_at` за последние 30 дней
- `filters` — агрегация доступных значений фильтров (для UI)

#### `GET /api/storefront/v1/{projectPublicId}/products/{productPublicId}`

Детальная страница товара.

**Response:**
```json
{
  "id": "uuid-public-id",
  "name": "Платье макси из шёлка с V-образным вырезом",
  "brand": "VALENTINO",
  "category": "tops",
  "subcategory": "dresses",
  "price": 87500,
  "discount_price": null,
  "currency": "RUB",
  "color": "red",
  "material": "silk",
  "sizes": ["XS", "S", "M", "L", "XL"],
  "description": "Элегантное платье макси из натурального шёлка...",
  "season": ["spring", "summer"],
  "photos": [
    {"url": "https://s3.../photo1.jpg", "sort_order": 0},
    {"url": "https://s3.../photo2.jpg", "sort_order": 1},
    {"url": "https://s3.../photo3.jpg", "sort_order": 2}
  ],
  "related_products": [
    {
      "id": "uuid",
      "name": "...",
      "brand": "...",
      "price": 52300,
      "currency": "RUB",
      "photos": [{"url": "...", "sort_order": 0}]
    }
  ]
}
```

**Логика `related_products`:** до 8 товаров из той же категории, исключая текущий, отсортированных по `created_at DESC`.

#### `GET /api/storefront/v1/{projectPublicId}/categories`

Список категорий с количеством товаров (для навигации).

**Response:**
```json
{
  "categories": [
    {"key": "tops", "label": "Одежда", "count": 18},
    {"key": "bottoms", "label": "Низ", "count": 8},
    {"key": "outerwear", "label": "Верхняя одежда", "count": 5},
    {"key": "shoes", "label": "Обувь", "count": 7},
    {"key": "accessories", "label": "Аксессуары", "count": 4}
  ],
  "total_products": 42
}
```

**Примечание:** маппинг `key → label` можно захардкодить на фронте или в конфиге проекта.

### 3.2 Имплементация в Go

**Файлы для создания/изменения:**

```
internal/
├── dto/
│   └── storefront.go              ← новый: DTO для storefront API
├── handler/
│   └── storefront.go              ← новый: хендлеры
├── service/
│   └── storefront.go              ← новый: бизнес-логика
├── repository/
│   └── storefront_repo.go         ← новый: запросы к БД
└── server/
    ├── server.go                  ← добавить storefrontHandler
    └── routes.go                  ← добавить роуты
```

**Добавить в `routes.go`:**
```go
// Storefront API (public, read-only, rate-limited)
r.Route("/api/storefront/v1/{projectPublicId}", func(r chi.Router) {
    r.Use(middleware.WidgetCORS())
    r.Use(middleware.StorefrontRateLimit(s.storefrontLimiter)) // 100 req/min/IP
    r.Get("/products", s.storefront.ListProducts)
    r.Get("/products/{productPublicId}", s.storefront.GetProduct)
    r.Get("/categories", s.storefront.ListCategories)
})
```

**Rate limiting:** 100 запросов/мин на IP (через middleware, аналогично WidgetRateLimit).

### 3.3 Безопасность
- Публичный API, но **только чтение** (GET)
- Нет персональных данных в ответах
- Rate limiting на уровне IP
- projectPublicId = UUID (не инкрементальный ID)
- Не раскрываем internal IDs — только public_id
- CORS: разрешить домен шоукейса + localhost для dev

---

## 4. Задача 2: Рефакторинг фронтенда

### 4.1 Создать data layer

**Новые файлы:**

```
src/
├── api/
│   └── storefront.ts          ← API клиент
├── types/
│   └── product.ts             ← TypeScript типы
└── hooks/
    ├── useProducts.ts         ← React Query хук для списка
    ├── useProduct.ts          ← React Query хук для детали
    └── useCategories.ts       ← React Query хук для категорий
```

#### `src/api/storefront.ts`
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.makemeelook.ai';
const PROJECT_ID = import.meta.env.VITE_PROJECT_ID || 'PROJECT_UUID';

export async function fetchProducts(params?: {
  category?: string;
  brand?: string;
  color?: string;
  search?: string;
  sort?: string;
  offset?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });
  }
  const res = await fetch(
    `${API_BASE}/api/storefront/v1/${PROJECT_ID}/products?${query}`
  );
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function fetchProduct(publicId: string) {
  const res = await fetch(
    `${API_BASE}/api/storefront/v1/${PROJECT_ID}/products/${publicId}`
  );
  if (!res.ok) throw new Error('Product not found');
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(
    `${API_BASE}/api/storefront/v1/${PROJECT_ID}/categories`
  );
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}
```

#### `src/hooks/useProducts.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '@/api/storefront';

export function useProducts(params?: Parameters<typeof fetchProducts>[0]) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
    staleTime: 5 * 60 * 1000, // 5 минут кэш
  });
}
```

### 4.2 Рефакторинг компонентов

#### `ProductCarousel.tsx` — Новинки
- Заменить захардкоженный массив на `useProducts({ sort: 'newest', limit: 6 })`
- Маппить `product.photos[0].url` → image, `product.photos[1]?.url` → hoverImage
- `isNew` = `product.is_new`

#### `ProductGrid.tsx` (content/) — Каталог
- Заменить на `useProducts({ limit: 12 })` с поддержкой фильтров
- `filterConfigs` генерировать из `response.filters` (categories, brands, colors)
- Сортировка: маппить на `sort` query param

#### `ProductGrid.tsx` (category/) — Страница категории
- **Полностью переписать**: сейчас это ювелирка в EUR (баг!)
- Использовать `useProducts({ category: routeParam, limit: 24 })`
- Добавить пагинацию через offset/limit

#### `ProductDetail.tsx` + `ProductInfo.tsx` + `ProductImageGallery.tsx`
- Получать `productId` из URL (уже есть `useParams`)
- Загружать через `useProduct(productId)` (где productId = public_id UUID)
- `ProductInfo` — динамические данные: brand, name, price, sizes, colors, description
- `ProductImageGallery` — `product.photos.map(p => p.url)`
- Связанные товары: `product.related_products`

#### `ProductCard.tsx`
- Уже принимает пропсы — минимум изменений
- Добавить `publicId` в пропсы для навигации: `<Link to={/product/${publicId}}>`
- Кнопка "Примерить" — передавать product ID в виджет: 
  ```typescript
  window.dispatchEvent(new CustomEvent('makemeelook:open', { 
    detail: { productId: publicId } 
  }));
  ```

### 4.3 Навигация

Обновить хедер:
- **Новинки** → `/category/new` (sort=newest)
- **Одежда** → `/category/tops`
- **Обувь** → `/category/shoes`
- **Аксессуары** → `/category/accessories`
- Меню генерировать из `useCategories()`

### 4.4 ENV-переменные

Добавить `.env`:
```
VITE_API_URL=https://api.makemeelook.ai
VITE_PROJECT_ID=<uuid из админки>
```

---

## 5. Задача 3: Наполнение каталога

### 5.1 Создать проект в админке MakeMeLook
1. Зарегистрироваться / войти в admin.makemeelook.ai
2. Создать проект "ATELIER Showcase"
3. Добавить домен шоукейса в настройках (для виджета)
4. Скопировать `PROJECT_ID` (UUID)

### 5.2 Загрузить товары

**Вариант A: CSV импорт (быстрее)**
Подготовить CSV с 20-30 товарами:
```csv
name,brand,category,subcategory,gender,price,currency,color,material,sizes,description,product_url,photo_url
"Платье макси из шёлка с V-образным вырезом",VALENTINO,tops,dresses,female,87500,RUB,red,silk,"XS,S,M,L,XL","Элегантное платье макси...",https://showcase.makemeelook.ai/product/1,https://images.unsplash.com/...
```

**Вариант B: Через API (автоматизация)**
Написать скрипт seed.ts:
```typescript
// Создать 20-30 товаров через POST /api/v1/projects/{id}/products
// Загрузить фото через POST /api/v1/projects/{id}/products/{id}/photos
```

### 5.3 Рекомендуемый каталог (20-30 SKU)

| Категория | Кол-во | Бренды |
|-----------|--------|--------|
| Платья | 6 | VALENTINO, ELIE SAAB, THE ROW |
| Блузы/Топы | 4 | THE ROW, LORO PIANA |
| Пиджаки | 3 | BALENCIAGA, RALPH LAUREN |
| Брюки/Юбки | 3 | PRADA, RALPH LAUREN |
| Верхняя одежда | 3 | MAX MARA, BALENCIAGA |
| Аксессуары | 3 | BOTTEGA VENETA, VALENTINO |
| Трикотаж | 3 | LORO PIANA, THE ROW |

**Фото:** использовать бесплатные стоковые фото с Unsplash (fashion editorial) или генерировать через Nano Banana Pro. По 2-4 фото на товар.

---

## 6. Задача 4: Виджет

### 6.1 Обновить PROJECT_ID
В `index.html` заменить:
```html
<script src="https://cdn.makemeelook.ai/widget/loader.js" data-project="РЕАЛЬНЫЙ_UUID" async></script>
```

### 6.2 Передача контекста товара в виджет
При клике "Примерить" на карточке/странице товара — передавать ID товара:
```typescript
window.dispatchEvent(new CustomEvent('makemeelook:open', {
  detail: { productId: product.id } // public_id
}));
```

Виджет подхватит этот товар и откроет примерку сразу с ним.

### 6.3 Добавить домен в настройках проекта
Виджет проверяет домен при загрузке. Домен шоукейса (например `showcase.makemeelook.ai` или Lovable-домен) нужно добавить через:
- Админку: Проект → Домены → Добавить
- Или API: `POST /api/v1/projects/{id}/domains`

---

## 7. Порядок выполнения

### Фаза 1: Бэкенд (1-2 дня)
1. ✅ Создать `dto/storefront.go` — DTO для публичного API
2. ✅ Создать `repository/storefront_repo.go` — запросы с фильтрами
3. ✅ Создать `service/storefront.go` — бизнес-логика (related products, is_new, filters aggregation)
4. ✅ Создать `handler/storefront.go` — HTTP хендлеры
5. ✅ Обновить `server/routes.go` — новые роуты
6. ✅ Добавить rate limit middleware для storefront
7. ✅ Задеплоить

### Фаза 2: Наполнение (0.5 дня)
1. ✅ Создать проект в админке
2. ✅ Подготовить CSV с 25 товарами + фото
3. ✅ Импортировать через админку
4. ✅ Проверить через GET /api/storefront/v1/{id}/products

### Фаза 3: Фронтенд (1-2 дня)
1. ✅ Создать `api/storefront.ts` + types + hooks
2. ✅ Рефакторинг `ProductCarousel` → API
3. ✅ Рефакторинг `ProductGrid` (content/) → API + динамические фильтры
4. ✅ Рефакторинг `ProductGrid` (category/) → API + пагинация
5. ✅ Рефакторинг `ProductDetail` + `ProductInfo` + `ProductImageGallery` → API
6. ✅ Обновить навигацию (Header, категории)
7. ✅ Подключить виджет с реальным PROJECT_ID
8. ✅ Тестирование

### Фаза 4: Деплой (0.5 дня)
1. ✅ Задеплоить фронтенд (Lovable / Vercel / свой хостинг)
2. ✅ Добавить домен в настройки проекта (для виджета)
3. ✅ Финальная проверка: каталог → карточка → виджет → примерка

**Общий срок: 3-5 дней**

---

## 8. Что НЕ делаем

- ❌ Корзина с реальной логикой (оставляем как UI-заглушку или убираем)
- ❌ Чекаут и оплата
- ❌ Авторизация покупателей
- ❌ Отдельную БД для магазина
- ❌ Отдельный бэкенд-сервис
- ❌ Поиск по полнотексту (хватит ILIKE для 30 товаров)
- ❌ Кэширование (Redis) — при 30 товарах не нужно

---

## 9. Чеклист для агента (Claude Code / Cursor)

Передай этот блок агенту, который будет писать код:

```
КОНТЕКСТ:
Ты работаешь с Go-бэкендом MakeMeLook SaaS (mml-saas-backend).
Стек: Go + Chi router + GORM + PostgreSQL + Minio S3.
Структура: cmd/server/main.go, internal/{handler,service,repository,dto,middleware,server}.

ЗАДАЧА:
Добавить Storefront API — публичные read-only эндпоинты для шоукейс-магазина.

ЭНДПОИНТЫ:
1. GET /api/storefront/v1/{projectPublicId}/products — список товаров с фильтрами
2. GET /api/storefront/v1/{projectPublicId}/products/{productPublicId} — детали товара
3. GET /api/storefront/v1/{projectPublicId}/categories — категории с count

ТРЕБОВАНИЯ:
- Публичный API (без JWT auth)
- Rate limit: 100 req/min/IP
- Только is_active=true товары
- Использовать public_id (UUID), не internal ID
- Фильтры: category, gender, brand, color, search, sort, group_id
- Сортировка: newest (default), price_asc, price_desc
- Пагинация: offset + limit (default 20, max 100)
- is_new = created_at за последние 30 дней
- related_products = до 8 товаров из той же категории
- filters в ответе = агрегация доступных значений
- CORS: WidgetCORS (тот же что для виджета)

ОРИЕНТИРУЙСЯ НА:
- internal/handler/product.go — существующий product handler
- internal/dto/product.go — существующие DTO
- internal/server/routes.go — роутинг
- internal/middleware/ratelimit.go — rate limiting
- internal/repository/product.go — существующие запросы к products

НЕ ТРОГАЙ существующие эндпоинты, они работают в продакшене.
```
