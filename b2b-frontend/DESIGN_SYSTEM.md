# MakeMeLook B2B — Design System

> Извлечено из текущего кода `b2b-frontend` (Next.js 14 + FSD + SCSS модули).
> Описывает тот визуальный язык, в котором сделан лендинг `b2b.makemelook.ai`.
> Используй этот файл как бриф для Lovable / v0 / любого генератора — чтобы
> новые блоки (блог, страница статьи) попадали в ту же стилистику.

---

## 1. Визуальная философия

- **Минимализм.** Много воздуха, мало цветов. Основная палитра — белый/почти чёрный + тонкие серые.
- **Крупная типографика.** Большие заголовки с отрицательным letter-spacing (`-1.7px`…`-2.5px`).
- **Мягкие формы.** Карточки со скруглением `24–60px`. Кнопки — почти pill-shape (`border-radius: 100px`).
- **Тихие анимации.** `framer-motion`, длительности `0.2–0.3s`, ease-out.
- **Inter.** Все надписи — Inter 400/500/600/700.
- **Контентная ширина — 1120px** (медиа-контейнер), узкие текстовые блоки — до 760px.

---

## 2. Токены цвета (CSS variables)

Определены в `src/app/globals.scss`:

```css
:root {
  /* Фоны и поверхности */
  --whiteColor:     #ffffff;
  --primaryColor:   #f7f7f7;   /* базовый фон страницы */
  --secondaryColor: #c6c8c4;
  --blackColor:     #000000;
  --darkColor:      #011010;   /* почти-чёрный для логотипа/акцентов */
  --thirdlyColor:   #edefff;   /* лавандовый фон для "чипов"-подзаголовков */
  --fourthColor:    #6d7373;   /* нейтральный серый */

  /* Текст */
  --text-whiteColor:     #ffffff;
  --text-blackColor:     #000000;
  --text-primaryColor:   #292824;
  --text-secondaryColor: #747474;
  --text-thirdlyColor:   #4859f5;  /* индиго — акцентный, для SectionTitle и ссылок */

  --borderColor: #f7f7f7;

  /* Layout */
  --containerMaxlWidthXxl: 1120px;
  --containerXPaddingsXxl: 8px;
}
```

### Семантическая карта цветов для блога

| Роль | Значение | Токен |
|---|---|---|
| Фон страницы | `#f7f7f7` | `--primaryColor` |
| Фон карточки | `#ffffff` | `--whiteColor` |
| Основной текст | `#292824` | `--text-primaryColor` |
| Вторичный текст (даты, мета) | `#747474` | `--text-secondaryColor` |
| Акцентный (ссылки, теги) | `#4859f5` | `--text-thirdlyColor` |
| Акцентный фон (чип-бейдж) | `#edefff` | `--thirdlyColor` |
| Логотип / "почти-чёрный" | `#011010` | `--darkColor` |
| CTA-кнопка (фон) | `#000000` | `--blackColor` |

---

## 3. Типографика

### Шрифт

**Inter** (next/font, variable `--primaryFont` и `--secondaryFont`), веса `400, 500, 600, 700`, latin subset.

Базовый размер `<html>`: **15px**, `line-height: inherit`, `scroll-behavior: smooth`.

### Шкала из реального кода

| Элемент | Размер | Вес | Letter-spacing | Line-height |
|---|---|---|---|---|
| H1 лендинга (платформа) | `clamp(40–64px)` | 700 | `-0.02em` | `1.05` |
| H2 крупный | `36px` (desktop) → `26px` (mobile) | 400 | `-2.52px` → `-1.3px` | `110%` → `105%` |
| H2 в InfoBlock | `34px` → `26px` | 400 | `-1.7px` → `-0.05em` | `95%` → `105%` |
| Подзаголовок / lead | `18–20px` | 400–500 | `normal` | `1.5` |
| Body (параграф) | `15–16px` | 400 | `normal` | `1.5–1.7` |
| Маленький текст (мета) | `13–14px` | 400–500 | `-0.05em` (footer) | `1.05–1.4` |
| "Chip"-бейдж (SectionTitle) | `12px` | 400 | `normal` | `105%` |
| Кнопка | `13px` | 500 | `normal` | - |

**Правило:** чем крупнее заголовок, тем сильнее отрицательный letter-spacing. Это фирменный приём бренда.

---

## 4. Сетка, отступы, контейнеры

```scss
.inner {
  max-width: var(--containerMaxlWidthXxl);   /* 1120px */
  padding: 22px var(--containerXPaddingsXxl); /* 22px вертикальный, 8px горизонтальный */
  margin: 0 auto;
}

// Вертикальные отступы между секциями лендинга:
.section {
  margin-bottom: 140px;
  @media (max-width: 440px) { margin-bottom: 110px; }
}
```

### Брейкпоинты

```
1024px — широкие планшеты / малые ноутбуки
768px  — iPad portrait
720px  — вторичный tablet (используется в хедере для сжатия)
540px  — граница мобильного навбара
440px  — "мобилка" (основной mobile-брейкпоинт)
```

---

## 5. Радиусы и формы

| Элемент | Radius | Пример |
|---|---|---|
| Кнопка (pill) | `100px` | Все CTA |
| Чип-бейдж | `50px` | `SectionTitle` |
| Крупная карточка | `60px` | `ImageCardFeature` |
| Средняя карточка | `24px` | Иконка-бокс в features |
| Маленький блок / поле | `12–16px` | Input, карточка блога |

**Правило:** крупные декоративные карточки → крупный радиус (40–60px). Мелкие UI-элементы → 8–16px.

---

## 6. Кнопки (`src/fsd/shared/ui/Button/Button.css` + `ui.css`)

Все кнопки: высота **42px**, padding `0 24px`, font-size **13px** / weight **500**, `border-radius: 100px`, `transition: 0.3s`.

### Preset `primarySolid` — основной CTA (чёрный)
```css
color: #ffffff;
background: var(--blackColor);          /* #000 */
hover: { background: var(--fourthColor); } /* #6d7373 */
```

### Preset `secondarySolid` — второстепенный CTA (белый)
```css
color: #000;
background: #ffffff;
hover: { background: #e8e8e8; }
```

### Preset `thirdlySolid` — акцентный CTA (индиго)
```css
color: #ffffff;
background: var(--text-thirdlyColor);   /* #4859f5 */
hover: { background: #283adb; }
```

---

## 7. "SectionTitle" — фирменный чип-бейдж

Маленький бейдж-пилюля, который открывает секции лендинга. Используется над каждым заголовком секции.

```scss
.container {
  background: var(--thirdlyColor);  /* #edefff */
  height: 34px;
  padding: 10px 16px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50px;
}
.text {
  font-family: var(--primaryFont);
  font-size: 12px;
  font-weight: 400;
  line-height: 105%;
  color: var(--text-thirdlyColor);  /* #4859f5 */
}
```

Используй этот чип для категорий/тегов статей в блоге — сразу будет узнаваемо.

---

## 8. Карточки (паттерн из `ImageCardFeature`)

```scss
.imageCard {
  background: var(--whiteColor);
  border-radius: 60px;
  padding: 28px;
  height: 310px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
```

Иконка внутри карточки:
```scss
.titleWithIconIcon {
  width: 74px; height: 74px;
  background: #f2e9ff;       /* пастельный фон */
  color: #9747ff;            /* и подходящая "бренд"-заливка иконки */
  border-radius: 24px;
  display: flex; align-items: center; justify-content: center;

  @media (max-width: 440px) {
    width: 64px; height: 64px;
    border-radius: 20px;
  }
}
```

**Для карточки статьи блога** — такой же `border-radius: 24px`, белый фон, обложка `aspect-ratio: 16/9`, hover lift `translateY(-2px)` + мягкая тень.

---

## 9. Анимации

### Появление из-за экрана (хедер, герои)
```tsx
<motion.div
  initial={{ y: -100, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ duration: 0.3 }}
/>
```

### Hover на карточке
```scss
transition: transform 0.2s ease, box-shadow 0.2s ease;
&:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.08);
}
```

### Hover на ссылке / кнопке
- На кнопках: смена фона, `transition: 0.3s`.
- На nav-ссылках: `opacity: 0.65`, `transition: 0.15s ease`.

### Tailwind-style keyframes (есть в `tailwind.config.ts`, используется в `/shop`)
- `fade-in` (0.3s)
- `slide-in-right` (0.3s)
- `scale-in` (0.2s)
- `breathe` — пульсация 2.5s infinite

---

## 10. Хедер (референс)

```
┌──────────────────────────────────────────────────────┐
│  [Лого]    Демо-магазин   Блог           [CTA btn]   │
└──────────────────────────────────────────────────────┘
   22px     padding vertical             max 1120px
```

- Фон: прозрачный / равный `--primaryColor`.
- Nav-ссылки: `15px / 500`, gap `28px`, чёрный цвет, hover `opacity: 0.65`.
- На `< 540px` — центральный nav скрывается (как минимум на моём брейкпоинте). На `< 440px` — CTA-кнопка тоже скрывается, остаётся только лого.

---

## 11. Футер (референс)

```scss
.inner {
  max-width: 1120px;
  padding: 22px 8px;
  color: #a4a3a0;
  font-size: 14px;
  font-weight: 400;
  line-height: 14.7px;
  letter-spacing: -0.05em;

  & a { transition: color 0.2s; }
  & a:hover { color: var(--text-primaryColor); }
}
```

На мобилке `.inner` становится колонкой (`flex-direction: column`).

---

## 12. Формы (из `Modal.tsx`)

- Инпут: высота `~42px`, `border-radius: 12px`, border `1px solid #e0e0e0`, focus → border accent indigo.
- Ошибка: текст `red`, маленький, под полем.
- Submit: `primarySolid` preset (чёрный pill).

---

## 13. Применительно к блогу — конкретные рекомендации

### Список статей `/ru/blog`

- Фон страницы — `--primaryColor` (#f7f7f7)
- Hero-заголовок "Блог" — по центру, `font-size: clamp(40–64px)`, weight 700, letter-spacing `-0.02em`
- Над ним — **SectionTitle-чип** с текстом типа "Статьи и обзоры"
- Карточки статей — сетка `repeat(auto-fill, minmax(320px, 1fr))`, gap 28px
- Карточка: белый фон, `border-radius: 24px`, обложка `16/9`, заголовок `20px/600`, мета серая `13px`, hover `translateY(-2px) + shadow 0 12px 32px rgba(0,0,0,0.08)`

### Страница статьи `/ru/blog/[slug]`

- Максимальная ширина контента **760px** (читабельная длина строки ~70ch)
- Большая обложка `16/9` сверху с `border-radius: 16–24px`
- Заголовок H1 — `clamp(32–48px)`, weight 700, letter-spacing `-0.02em`
- Подзаголовок-лид — `20px`, серый `#444`
- Тело статьи — `18px / line-height 1.7`, тёмный текст
- H2 в теле: `26px / 700`, отступы `40px 0 14px`
- Ссылки в тексте: цвет `--text-thirdlyColor` (#4859f5), underline с `text-underline-offset: 3px`
- Blockquote: левый бордер `3px solid #e0e0e0`, padding-left `20px`, italic `#555`
- Картинки: `max-width: 100%`, `border-radius: 12px`, margin `24px 0`
- Code inline: фон `#f4f4f4`, padding `2px 6px`, radius `4px`, моноширинный `SFMono-Regular`
- Pre (блоки кода): фон `#0f0f12`, текст `#e6e6e6`, padding `20px 22px`, radius `12px`
- Теги статьи — маленькие чипы в стиле SectionTitle
- Внизу — блок "Читайте также" с 2-3 карточками

### Что взять из бренда (must-have)

✅ Inter везде
✅ Отрицательный letter-spacing на заголовках (`-0.02em` / `-1.7px`)
✅ Pill-кнопки `border-radius: 100px`
✅ `SectionTitle` чип (лавандовый фон `#edefff` + индиго текст `#4859f5`)
✅ Отступы секций `140px / 110px mobile`
✅ Hover-анимации `transition 0.2–0.3s ease`
✅ Максимум 1120px для медиа-контейнера, 760px для текста

### Чего не делать

❌ Не использовать shadcn / Tailwind HSL-токены — они применяются **только в `/shop/**`**, для основного лендинга не подходят.
❌ Не добавлять тени на каждый элемент — брендовые карточки чаще без shadow, shadow появляется только на hover.
❌ Не городить много разных цветов. Палитра: белый / светло-серый фон / почти-чёрный / индиго-акцент.

---

## 14. Полезные пути в репо

| Файл | Что там |
|---|---|
| `src/app/globals.scss` | CSS-переменные, ресеты |
| `src/app/layout.tsx` | Подключение Inter, presets кнопок |
| `src/fsd/shared/ui/Button/Button.css` + `.../Button.tsx` | Базовая кнопка |
| `src/fsd/shared/assets/styles/ui.css` | Preset-классы кнопок |
| `src/fsd/shared/ui/SectionTitle.tsx/.scss` | Чип-бейдж |
| `src/fsd/widgets/Header/Header.tsx/.scss` | Хедер |
| `src/fsd/widgets/Footer/Footer.tsx/.scss` | Футер |
| `src/fsd/widgets/ImageCardFeature/...` | Паттерн карточек с иконкой |
| `src/fsd/widgets/InfoBlock/...` | Паттерн крупных текстовых блоков |
| `tailwind.config.ts` | Конфиг Tailwind (только для `/shop`) |

---

## 15. Шаблон-промпт для Lovable

> Сделай блок блога и страницу статьи в стилистике бренда MakeMeLook B2B.
>
> **Палитра:** фон `#f7f7f7`, белые карточки, основной текст `#292824`,
> вторичный `#747474`, акцент индиго `#4859f5` на лавандовом фоне `#edefff`,
> CTA-чёрный `#000` с hover `#6d7373`.
>
> **Шрифт:** Inter (400/500/600/700). Большие заголовки с letter-spacing
> `-0.02em` / `-1.7px`. Body 15–18px, line-height 1.5–1.7.
>
> **Формы:** pill-кнопки (`border-radius: 100px`, height 42px, padding 0 24px,
> font 13/500). Крупные карточки с `border-radius: 24–60px`. Чип-бейджи для
> категорий (`background: #edefff`, `color: #4859f5`, `border-radius: 50px`,
> padding `10px 16px`, font `12px/400`).
>
> **Сетка:** max-width `1120px` для широких секций, `760px` для текста
> статьи. Отступы между секциями `140px` на desktop, `110px` на mobile.
> Брейкпоинты: `440/540/720/768/1024px`.
>
> **Анимации:** framer-motion, длительности 0.2–0.3s ease-out. На карточках
> hover `translateY(-2px)` + `box-shadow 0 12px 32px rgba(0,0,0,0.08)`.
> На ссылках hover — opacity 0.65, transition 0.15s.
>
> **Не использовать** shadcn, Tailwind HSL-токены, тяжёлые тени по умолчанию.
>
> Блок блога: hero с SectionTitle-чипом и большим H1 "Блог", под ним сетка
> карточек статей `auto-fill minmax(320px, 1fr)` gap 28px. Каждая карточка:
> обложка 16/9, заголовок 20px/600, 2-строчный excerpt серым, мета-строка
> с датой и "Читать →".
>
> Страница статьи: узкий контент 760px, большая обложка 16/9 сверху,
> H1 clamp(32–48px)/700/-0.02em, lead 20px серым #444, тело 18px line-height
> 1.7. Typography для h2/h3/ul/ol/blockquote/code/pre/img/table. Ссылки
> индиго `#4859f5` с подчёркиванием offset 3px. В конце — блок "Читайте
> также" с 2–3 карточками.
