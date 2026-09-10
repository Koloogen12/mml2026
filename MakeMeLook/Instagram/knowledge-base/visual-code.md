# Visual Code v3 — MakeMeLook Instagram

**Дата:** 2026-04-19
**Статус:** ✅ LOCKED (v3 — Daydream primary). Источник правды по визуалу для всего IG-контента. Этот документ отменяет v1 (monochrome + vermilion) и v2 (warm cream + lavender).
**База:** скрины 1–3 из референс-пула Данила от 2026-04-19 — Red Antler case для Daydream + aidaydream.com homepage.

---

## 1. ДНК визуала — одной строкой

> **Cool blue-purple gradient с iridescent одеждой.** Холодный gradient `#E5EAFB → #A8B4F5 → #7D8FE8`, iridescent garment как hero (переливы `#3D55F0 / #7B4FEA / #E8A3D8`), electric cobalt CTA `#2D1FB8`, serif wordmark в школе Canela / PP Editorial New, плавающие белые UI-карточки с soft shadow. Школа: **Daydream × Red Antler × премиальный consumer-AI**.

**Почему так:**

1. **Wow-фактор для product-демо.** 60% контента по brand-profile — visual wow (try-on карусели, демо 5 слоёв). Cool gradient + iridescent даёт максимальный «AI-magic» эффект в ленте.
2. **Holographic = AI-генерация читается сразу.** Мы продаём AI-try-on. Iridescent одежда на модели — это визуальная метафора «это не настоящая съёмка, это примерка сгенерирована». Максимально on-brand.
3. **Premium consumer, не dev-tech.** ЦА — CMO/основатели fashion-брендов. Им не нужен Linear-style minimal. Им нужен Condé-Nast-уровень editorial с AI-твистом.
4. **Cyrillic-ready через serif.** PP Editorial New (или Roslindale Display) отлично читает кириллицу и даёт fashion-editorial ощущение — не «кальку с английского».

---

## 2. Цветовая палитра (ЖЁСТКО — не добавлять цветов без обновления документа)

### Primary gradient (основа 80% слайдов)

| Роль | Hex | Применение |
|---|---|---|
| Gradient light | `#E5EAFB` | верхняя точка вертикального gradient (180deg или radial centre) |
| Gradient mid | `#A8B4F5` | середина gradient |
| Gradient deep | `#7D8FE8` | нижняя точка вертикального gradient |
| Gradient edge (accent) | `#6872D8` | для drama-hero (slide 1, 6) |

**Форма gradient:** обычно `linear-gradient(180deg, #E5EAFB 0%, #A8B4F5 55%, #7D8FE8 100%)` ИЛИ `radial-gradient(ellipse at 50% 40%, #E5EAFB 0%, #A8B4F5 50%, #7D8FE8 100%)`. Первый — для text-heavy слайдов, второй — для hero с iridescent garment в центре.

### Iridescent accent (только на hero-visual слайдах)

| Роль | Hex | Применение |
|---|---|---|
| Iridescent blue | `#3D55F0` | синие переливы на одежде, светящиеся рефлексы |
| Iridescent purple | `#7B4FEA` | midtone переливы |
| Iridescent rose | `#E8A3D8` | редкий розовый rim-light на холографических одеждах (rare — не более 15% площади iridescent) |
| Iridescent cyan (highlight) | `#8FB8FF` | top-layer highlight на glossy одежде |

Iridescent палитра применяется ТОЛЬКО как градиент-переливы НА ОДЕЖДЕ или текстиле, не как фон слайда и не как типографический цвет.

### Functional (UI + CTA)

| Роль | Hex | Применение |
|---|---|---|
| Electric cobalt | `#2D1FB8` | pill CTA, send-arrow, accent-underline, slide-pagination dot |
| Electric cobalt deep | `#1A0F88` | hover / pressed state |
| Paper white | `#FFFFFF` | плавающие UI-карточки, mockup surfaces |
| Near-black ink | `#0E0E14` | primary text (wordmark, headlines) |
| Graphite | `#3D3F4D` | secondary text (captions, subheads) |
| Mute | `#8183A0` | labels, метаданные, pagination numbers |
| Soft shadow | `rgba(46, 31, 184, 0.08)` | тень под белыми карточками (тонированная в индиго, не серая) |
| Card border (optional) | `rgba(14, 14, 20, 0.06)` | 1px hairline под некоторыми карточками |

### Запреты

- ❌ Никаких warm тонов: cream `#F5F1EA`, ivory, beige — всё ушло из палитры.
- ❌ Никакого orange / red / vermilion (v1 анти-паттерн).
- ❌ Никакого чистого `#000` — только `#0E0E14`.
- ❌ Никаких градиентов кроме основного blue-purple и iridescent на одежде.
- ❌ Никаких status-colors (green-success, red-danger) — если нужна метрика «−30%», рендерим в `#2D1FB8` cobalt.
- ❌ Никакого лавандового pastel из v2 (`#C5B1EE` / `#E8E0F8`) — ушло.

---

## 3. Типографика

### Шрифты (ЖЁСТКО — эта пара заменяет всё, что было в v1/v2)

| Шрифт | Где | Веса | Cyrillic fallback |
|---|---|---|---|
| **PP Editorial New** (или Canela Deck, Roslindale Display) | display headings, wordmark, hero-quote, slide titles | 500, 700 | PP Editorial New (поддерживает cyrillic) |
| **Untitled Sans** (или Söhne, Inter) | body, UI, pill CTA, labels, captions | 400, 500, 600 | Inter (fallback) |
| **JetBrains Mono** | числа в UI-карточках, product prices, техно-лейблы | 500 | — |

**ВАЖНО:** weights serif — только 500 и 700 (Regular и Bold). Иерархия — через размер и letter-spacing, а не через 5 разных весов.

**Wordmark MakeMeLook:** набирается **serif** (PP Editorial New 700) с iridescent-эффектом (текст заливается cool gradient `#E5EAFB → #A8B4F5 → #7D8FE8` через background-clip). На plain-gradient фоне без эффекта — solid `#0E0E14`.

### Шкала размеров (для IG 1080×1350)

| Назначение | Размер | Вес | Tracking | Шрифт |
|---|---|---|---|---|
| Display 2XL (slide 1 hero, hero-quote) | 140–180pt | 700 | -0.035em | PP Editorial New Bold |
| Display XL (slide title большие) | 96–120pt | 700 | -0.03em | PP Editorial New Bold |
| Display LG (mid-slide titles) | 64–80pt | 500 | -0.025em | PP Editorial New Regular |
| Heading (subhead) | 36–44pt | 600 | -0.015em | Untitled Sans SemiBold |
| Body LG (тело текста) | 22–28pt | 400 | 0 | Untitled Sans Regular |
| Body (captions под карточкой) | 18–20pt | 400 | 0 | Untitled Sans Regular |
| Label (top-left METADATA) | 12–14pt | 500 | +0.12em, UPPERCASE | Untitled Sans Medium |
| Mono (цены, numbers в UI) | 16–20pt | 500 | 0 | JetBrains Mono Medium |
| Pagination pill | 12pt | 500 | +0.06em | Untitled Sans Medium |

### Правила работы с типографикой

- **Display = serif.** Все hero-тексты, заголовки, цифры-герои — PP Editorial New. Никогда не sans.
- **Body = sans.** Подписи, caption'ы, метки, CTA — Untitled Sans. Чистый контраст serif/sans — половина эстетики.
- **Italic — разрешено** в serif для pull-quote ("*Fashion-ритейл теряет...*"). Используем точечно, не более 1 раз на карусель.
- **Letter-spacing для huge type — отрицательное** (-0.03em для 100pt+), чтобы серифы «склеивались» как в fashion-журналах.
- **Labels UPPERCASE** с трекингом +0.12em.
- **Numbers — tabular** через `font-variant-numeric: tabular-nums`.

---

## 4. Сетка и формат

### Формат
- **1080×1350 (4:5)** — основной для каруселей.
- 1080×1080 (1:1) — одиночные посты.
- 1080×1920 (9:16) — Reels + highlights.

### Safe zone
- **Внешний padding: 80–96px** со всех сторон.
- Hero-zone (slide 1): заголовок в верхней половине, iridescent garment mid-to-bottom.
- Footer (последние 72px): только wordmark + slide number.

### Wordmark
- Top-left на большинстве слайдов, размер ~140px ширина (serif full wordmark).
- Цвет: `#0E0E14` ink на светлой части gradient, либо iridescent fill на hero-слайдах.
- На hero slide 1 — CENTRAL placement, display-size.

### Slide number pill
- Right-bottom corner.
- Form: pill `9999px`, `28×56px`, белый фон с `rgba(46,31,184,0.08)` тенью.
- Текст: `#0E0E14`, Untitled Sans Medium 12pt: `01 / 08 →`
- На последнем слайде — CTA pill electric cobalt `#2D1FB8` с белым текстом (см. CTA-компонент).

---

## 5. Компоненты

### 5.1 Pill CTA (главный conversion-элемент)

```
[container]
  background: #2D1FB8
  border-radius: 9999px
  padding: 18px 40px
  box-shadow: 0 12px 32px rgba(46, 31, 184, 0.24)

[text]
  color: #FFFFFF
  font: Untitled Sans Medium 18pt
  letter-spacing: -0.005em

[icon — arrow-right 16px, white, stroke 1.5]
```

Примеры текстов: `Забронировать демо →`, `Попробовать виджет →`, `Смотреть кейс →`.

### 5.2 Floating UI-card (для демо виджета / product grid)

```
[card]
  background: #FFFFFF
  border-radius: 24px
  padding: 24–32px
  box-shadow:
    0 4px 12px rgba(14, 14, 20, 0.04),
    0 24px 64px rgba(46, 31, 184, 0.12)
  border: 1px solid rgba(14, 14, 20, 0.04)
```

Внутри — UI-mockup виджета MakeMeLook, product grid, chat-input (как у Daydream «Describe what you're shopping for»).

### 5.3 Iridescent garment hero

Это главный signature-shot MakeMeLook. Описание для Nano Banana Pro:

> «A model wearing translucent iridescent holographic outerwear (coat / jacket / dress) that refracts light into blue, purple, and soft pink rim-lights, standing against a soft cool blue-purple vertical gradient background (#E5EAFB → #7D8FE8). The garment has the quality of dichroic film — subtle rainbow shift, glossy but not plastic, catching light across the shoulders and sleeves. Studio editorial lighting, large softbox from front-left. Cool ambient fill.»

Критично:
- Dichroic film / iridescent PVC / holographic organza — текстуры, которые нужно описывать в промпте.
- Rim-light blue / purple — обязательно.
- Модель должна быть cropped (не видно лица либо видно часть) — фокус на одежде.

### 5.4 Pagination pill

```
[pill]
  background: #FFFFFF
  color: #0E0E14
  border: 1px solid rgba(14, 14, 20, 0.08)
  border-radius: 9999px
  padding: 8px 16px
  font: Untitled Sans Medium 12pt

[text]: 01 / 08 →
```

На slide 8 — подменяется на CTA pill.

### 5.5 Metadata label (top-left)

```
[label]
  font: Untitled Sans Medium 12pt
  letter-spacing: +0.12em
  color: rgba(14, 14, 20, 0.6)
  UPPERCASE

[format]: МАНИФЕСТ · 01 / 08
         КЕЙС · СВАДЕБНОЕ ПЛАТЬЕ
         ИНТЕГРАЦИЯ · 1 СТРОКА КОДА
```

Под лейблом иногда — 1px underline того же цвета, 48px ширина.

### 5.6 Serif iridescent wordmark (hero-only)

На slide 1 и финальных hero-слайдах wordmark «MakeMeLook» рендерится с iridescent-заливкой:

```css
background: linear-gradient(135deg, #E5EAFB 0%, #A8B4F5 35%, #7B4FEA 70%, #3D55F0 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
font: PP Editorial New Bold 180pt;
letter-spacing: -0.035em;
```

На text-only слайдах — solid `#0E0E14`.

---

## 6. Архетипы слайдов (5 штук)

### 6.1 Cover / Hero (slide 1)
- Full-bleed radial gradient.
- Iridescent garment ИЛИ large serif hero quote + iridescent wordmark.
- Padded metadata label top-left.
- Pagination pill bottom-right.

### 6.2 Stat / Number hero
- Full-bleed vertical gradient.
- Огромная цифра PP Editorial New Bold 280pt в `#0E0E14` (или iridescent fill).
- Caption Untitled Sans 22pt в `#3D3F4D` под цифрой.
- Один факт, одна цифра, одна подпись.

### 6.3 Manifesto / Text
- Vertical gradient, менее насыщенный (gradient light→mid, без deep).
- Pull-quote serif 72pt italic, центровка left.
- Подзаголовок sans 24pt.
- Никаких других элементов.

### 6.4 Product demo / UI-showcase
- Gradient фон.
- Одна-две floating white cards с UI-mockup виджета.
- Никаких handwritten аннотаций (это Aiuta-школа, у Daydream нет).
- Вместо этого — short serif caption над card'ом.

### 6.5 CTA / Final (slide 8)
- Radial gradient (concentrated).
- Центральный serif headline: "Попробуй / Запусти у себя / Забронируй демо."
- Pill CTA electric cobalt под headline.
- Wordmark под CTA (serif iridescent).

---

## 7. Анти-паттерны (из v1/v2 failed итераций — не повторяем)

- ❌ Chalk / cream / ivory фон (v2 warm gradient)
- ❌ Lavender pastel `#C5B1EE` (v2 Aiuta-clone)
- ❌ Vermilion `#D84315` (v1 monochrome)
- ❌ Handwritten Caveat аннотации со стрелками (Aiuta-школа, не Daydream)
- ❌ Three-phone row mockup (слишком Aiuta — переработать под white cards или iridescent)
- ❌ Warm rounded sans (Manrope / Söhne) для headlines — display = serif, точка
- ❌ Inter Display для hero (заменено на PP Editorial New)
- ❌ Photography of business people in suits (стоковые CMO-шоты — не наш mood)

---

## 8. Master Nano Banana Pro visual brief

Базовый промпт-шаблон, к которому добавляются конкретные детали слайда:

```
Editorial visual for MakeMeLook.ai (AI fashion try-on brand) Instagram carousel,
aspect ratio 4:5 (1080×1350px equivalent), 2K resolution.

Background: smooth vertical gradient from soft cool blue #E5EAFB at top,
through periwinkle #A8B4F5 in the middle, to cool indigo #7D8FE8 at the bottom.
No texture, no grain, clean premium finish.
[OR for hero: radial gradient, centre light, edges deep indigo]

[SLIDE-SPECIFIC CONTENT HERE — see individual prompts]

Typography: serif display headings in the style of Canela or PP Editorial New
(bold, tight letter-spacing, editorial feel). Body text in clean modern sans.
All text in Russian (cyrillic).

Tone: premium AI-magic, cool and optimistic, editorial fashion, Condé-Nast-meets-consumer-AI.
No warm colors, no cream, no orange, no beige. No handwritten annotations.
No 3D abstract shapes — keep it grounded in fashion photography and clean UI.
```

Полные промпты для Карусели 01 «Манифест» — см. `/content-plans/carousels/01_manifest_v3_prompts.md`.

---

## 9. Что триггерит обновление этого документа

- Новый референс от Данила, который противоречит Daydream-школе → обсуждаем v4.
- Запуск нового контент-пула (Reels / Stories) — добавляем секцию.
- A/B-результаты по первому пулу каруселей (4+ недели спустя) — корректируем приоритеты в палитре.

**Владелец документа:** Данил. Обновления — только после согласования.
