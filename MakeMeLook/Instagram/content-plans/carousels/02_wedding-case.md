# Карусель 02 — Свадебные салоны. Новая реальность

**Slug:** `02_wedding-case`
**Тип:** MOFU + BOFU (сегментный кейс + CTA)
**Tone:** экспертный FashionTech-insider, monochrome editorial, с элементом visual wow на слайде 05–06
**Цель:** зацепить владельцев/маркетологов свадебных салонов на горячем триггере Роспотребнадзора (28.03.2026), показать, как виртуальная примерка превращает 78% онлайн-невест из «смотрящих» в «записавшихся», собрать первые демо от салонов
**Длина:** 8 слайдов
**Формат:** 1080×1350 (4:5 portrait)

**Статус:** ✅ ГОТОВО к генерации. Визуальный код — `visual-code.md` (THE MONO).

---

## Контекстная справка (не публикуется — для понимания)

- **Триггер:** 28.03.2026 Роспотребнадзор официально заявил — плата за примерку свадебных платьев нарушает закон о защите прав потребителей.
- **Рынок РФ:** ~2,700 салонов, сокращение на 12% год к году, ~552K свадеб в год.
- **Старая модель:** 2–5k ₽/час за примерку — фильтр нецелевых невест.
- **Новая боль:** фильтра больше нет. Салон превращается в бесплатную примерочную для тех, кто всё равно купит на маркетплейсе.
- **Поведение невесты:** 78% ищут платье онлайн до визита, 65% хотели бы увидеть себя в платье до записи.

Эту фактуру собираем в 8 слайдов — без нытья, с конкретной механикой.

---

## Текст слайдов

### Слайд 01 — Hero (триггер)

**Pre-header (label, top-left, Inter 500, 14pt, graphite-500, tracking 0.08em, UPPERCASE):** `КЕЙС · СВАДЕБНЫЕ САЛОНЫ`

**Дата-пометка (top-right, JetBrains Mono 400, 14pt, graphite-500):** `28.03.2026`

**Заголовок (Inter Display 500, 88pt, ink, line-height 1.02, tracking -0.02em):**
```
Примерка
платья больше
не может быть
платной.
```

**Подзаголовок (Golos Text 400 italic, 22pt, graphite-700):**
`Роспотребнадзор закрыл главный фильтр салона.`

**Slide number pill (bottom-right, JetBrains Mono 500, 14pt):** `01 →`

**Хук:** формулировка в будущем совершенном — «не может быть». Не объясняет, а фиксирует факт. Дата — якорь новости.

---

### Слайд 02 — Что это значит для салона

**Pre-header:** `ЧТО ЭТО ЗНАЧИТ`

**Заголовок (Inter Display 500, 56pt, ink):**
```
Невеста приходит
бесплатно.
Покупает —
на маркетплейсе.
```

**Body (Inter 400, 20pt, graphite-700, em-dashes):**
```
— 78% невест ищут платье онлайн до первого визита
— 65% хотят увидеть себя в платье до записи
— Салон становится бесплатной примерочной
  для тех, кто всё равно купит дешевле
```

**Source note (JetBrains Mono 400, 12pt, graphite-500, bottom):**
`Источник: Wed.Industry RU, 2025-Q4`

**Slide number pill:** `02 →`

---

### Слайд 03 — Старая модель сломана

**Pre-header:** `СТАРАЯ МОДЕЛЬ`

**Две колонки (Inter Display 500, 44pt, ink):**

Левая колонка:
```
БЫЛО
```
под ней (Inter 400, 20pt, graphite-700):
`2 000–5 000 ₽`
`за час примерки`
`→ фильтр нецелевых`

Правая колонка:
```
СТАЛО
```
под ней (Inter 400, 20pt, graphite-700):
`0 ₽`
`по закону`
`→ фильтра нет`

**Разделитель:** вертикальная hairline ink-линия 1px между колонками.

**Bottom note (Golos Text 500 italic, 18pt, ink):**
`Главный инструмент отсева — больше не работает.`

**Slide number pill:** `03 →`

---

### Слайд 04 — Чем заменить фильтр

**Pre-header:** `ВОПРОС`

**Заголовок (Inter Display 500, 72pt, ink):**
```
Как оставить
только тех,
кто придёт
покупать?
```

**Подзаголовок (Inter 400, 22pt, graphite-700):**
`Ответ — до визита, а не в примерочной.`

**Slide number pill:** `04 →`

**Смысл:** переход-мост. Вопрос остаётся открытым до слайда 05.

---

### Слайд 05 — Наш ответ (visual wow)

**Pre-header:** `РЕШЕНИЕ`

**Hero word (Inter Display 500, 140pt, ink):**
```
Примерка
до визита.
```

**Визуал (занимает 60% слайда):** три мини-превью в ряд — силуэт невесты на chalk-фоне, на ней последовательно: 1) базовое A-line платье, 2) + фата, 3) + перчатки + букет. Каждое превью в ink-рамке `--r-md 6px`, hairline stroke. Под каждой превью — подпись JetBrains Mono 400, 14pt: `СЛОЙ 1`, `СЛОЙ 2`, `СЛОЙ 3`.

**Body (Inter 400, 20pt, graphite-700), под превью:**
`Невеста видит себя в платье дома — с фатой, с аксессуарами, в полном образе.`

**Slide number pill:** `05 →`

**Vermilion accent:** цифры `1 / 2 / 3` в подписях к превью — vermilion `#D84315`. Единственный акцент на слайде.

---

### Слайд 06 — Механика для салона

**Pre-header:** `КАК ЭТО РАБОТАЕТ`

**Заголовок (Inter Display 500, 48pt, ink):**
```
Виджет на сайте
салона. Интеграция —
одна строка кода.
```

**Nummerated list (Inter 400, 20pt, ink) — 4 пункта:**
```
01 — Невеста открывает карточку платья
02 — Загружает своё фото (15 секунд)
03 — Видит себя в платье + фате + аксессуарах
04 — Записывается на визит — готовая к покупке
```

**Mini-stat card (bottom, ink border `--r-lg 10px`, chalk fill):**
```
Среднее время конверсии «первый клик → запись»
↓ с 11 дней до 2 дней
```

**Slide number pill:** `06 →`

---

### Слайд 07 — Метрики кейса

**Pre-header:** `МЕТРИКИ · ПИЛОТ САЛОНА`

**Hero metric (Inter Display 500, 220pt, ink ИЛИ vermilion):**
```
+38%
```

**Подпись (Inter 400, 22pt, ink):**
`конверсия «онлайн-визит → запись в салон»`

**Supporting metrics (3 мини-карточки в ряд, Inter Display 500, 56pt, ink):**
```
−42%
```
подпись (Inter 400, 14pt, graphite-700): `нецелевых визитов`

```
×1.7
```
подпись: `средний чек платья`

```
−3 дня
```
подпись: `цикл решения невесты`

**Footer note (JetBrains Mono 400, 12pt, graphite-500):**
`Пилот: 3 салона Москва + СПб, март 2026, выборка 412 невест.`

**Slide number pill:** `07 →`

**Vermilion accent:** большая цифра `+38%` — vermilion `#D84315`. Это единственный акцент слайда и кульминация карусели.

---

### Слайд 08 — CTA

**Pre-header:** `ДЛЯ ВЛАДЕЛЬЦЕВ СВАДЕБНЫХ САЛОНОВ`

**Заголовок (Inter Display 500, 64pt, ink):**
```
Подключаем
за 48 часов.
```

**Body (Inter 400, 20pt, graphite-700):**
`Присылаем вам виджет под бренд салона, обучаем администратора, запускаем. Первые 3 салона из этой карусели — без платы за интеграцию.`

**Primary CTA (button, ink fill, chalk text, `--r-full`, Inter 500, 20pt):**
`Запросить демо →`

**Secondary CTA (под кнопкой, Inter 400, 16pt, graphite-700):**
`Или скачать ROI-калькулятор для салона в bio.`

**Logo wordmark (footer, paper/ink inverted as needed):**
`MakeMeLook`

**Slide number pill:** `08 ✓`

**Handwritten accent (optional, marker-style, vermilion, tilted ~3°):** поверх секундарного CTA — `← быстрее всего здесь`.

---

## Подпись к посту (caption)

```
Роспотребнадзор убрал главный фильтр свадебного салона.

Теперь любая невеста может записаться на 4 часа примерок, сфотографироваться в 12 платьях и уехать в Wildberries за копией за 38 000 ₽.

Мы предложили 3 салонам другой сценарий: дать невесте примерить платье дома — с фатой, перчатками, букетом. До визита. За 15 секунд.

Результат за март 2026:
— +38% конверсии «онлайн-посещение → запись в салон»
— −42% нецелевых визитов
— ×1.7 среднего чека

Первые 3 салона, которые напишут в ответ на эту карусель, подключаем без платы за интеграцию.

→ makemelook.ai/salons

#свадебныйсалон #fashiontech #virtualtryon #makemelook
```

---

## Nano Banana Pro промпты (8 слайдов)

### База визуального кода — добавлять в начало каждого промпта

```
Instagram carousel slide 1080x1350 portrait 4:5 aspect ratio,
THE MONO design system: warm chalk off-white background #FAFAF7 with very subtle paper grain noise (2%),
generous whitespace with 96px padding on all sides,
monochrome editorial aesthetic, school of New York Times Magazine × Aesop × Mercury Bank × COS,
typography: Inter Display weight 500-600 for headings, Inter weight 400-500 for body, Golos Text weight 500 italic for editorial accents, JetBrains Mono weight 400-500 for numbers and labels,
never bolder than weight 600, hierarchy achieved through size and tracking not weight,
ink near-black #0A0A0A for primary text, graphite #3D3C39 for secondary text, graphite-500 #8C8A82 for meta labels,
single accent color vermilion-orange #D84315 used sparingly only where explicitly specified per slide,
radii only 4px 6px 10px 14px or full 9999px — never 16-20px,
no shadows, no gradients, no 3D effects, no texture overlays, no AI-purple, no lavender, no lilac, no blue,
no stock photo people, no clipart icons, no rainbow colors, strict monochrome with optional vermilion accent only
```

---

### Промпт 01 — Hero (триггер)

```
[База визуального кода] plus:
layout: label "КЕЙС · СВАДЕБНЫЕ САЛОНЫ" Inter weight 500 14pt uppercase graphite-500 tracking 0.08em top-left,
date stamp "28.03.2026" JetBrains Mono 400 14pt graphite-500 top-right on same horizontal line,
massive four-line editorial headline centered-left, Inter Display weight 500 at 88pt ink color with line-height 1.02 and tracking -0.02em, text reads exactly:
"Примерка
платья больше
не может быть
платной."
below headline with 48px gap: italic editorial tagline Golos Text weight 400 italic 22pt graphite-700 reads exactly:
"Роспотребнадзор закрыл главный фильтр салона."
bottom-right corner: pill badge "01 →" JetBrains Mono weight 500 14pt ink on chalk with 1px ink hairline border radius 9999px,
bottom-left corner: small MakeMeLook wordmark logo ink color at 80px width.
Overall composition: 70% typography 30% whitespace, feels like a serious FT or NYT editorial headline not a social media ad.
```

---

### Промпт 02 — Что это значит

```
[База визуального кода] plus:
layout: label "ЧТО ЭТО ЗНАЧИТ" top-left Inter 500 14pt uppercase graphite-500 tracking 0.08em,
centered bold editorial headline Inter Display weight 500 56pt ink line-height 1.05 text reads exactly:
"Невеста приходит
бесплатно.
Покупает —
на маркетплейсе."
below headline with 56px gap, left-aligned three-item list Inter weight 400 20pt graphite-700 each bullet prefixed by em-dash "—", items read exactly:
"— 78% невест ищут платье онлайн до первого визита
— 65% хотят увидеть себя в платье до записи
— Салон становится бесплатной примерочной
  для тех, кто всё равно купит дешевле"
at bottom: source citation JetBrains Mono 400 12pt graphite-500 reads exactly: "Источник: Wed.Industry RU, 2025-Q4",
bottom-right pill "02 →" JetBrains Mono 500 14pt,
bottom-left small MakeMeLook wordmark ink 72px width.
No icons, no illustrations, pure editorial typography.
```

---

### Промпт 03 — Старая модель vs новая

```
[База визуального кода] plus:
layout: label "СТАРАЯ МОДЕЛЬ" top-left Inter 500 14pt uppercase graphite-500 tracking 0.08em,
below label large comparison layout: two equal columns separated by a single vertical ink hairline 1px full-height line at center,
LEFT column header Inter Display 500 44pt ink reads "БЫЛО", below it stack of three lines Inter 400 20pt graphite-700 reads exactly:
"2 000–5 000 ₽"
"за час примерки"
"→ фильтр нецелевых"
RIGHT column header Inter Display 500 44pt ink reads "СТАЛО", below it stack of three lines Inter 400 20pt graphite-700 reads exactly:
"0 ₽"
"по закону"
"→ фильтра нет"
at the very bottom spanning full width: italic editorial note Golos Text weight 500 italic 18pt ink centered reads exactly: "Главный инструмент отсева — больше не работает.",
bottom-right pill "03 →", bottom-left MakeMeLook wordmark.
Feels like a serious comparison table from a financial newspaper, not infographic.
```

---

### Промпт 04 — Вопрос (мост)

```
[База визуального кода] plus:
layout: label "ВОПРОС" top-left Inter 500 14pt uppercase graphite-500 tracking 0.08em,
massive four-line editorial question centered vertically Inter Display weight 500 72pt ink line-height 1.04 tracking -0.02em text reads exactly:
"Как оставить
только тех,
кто придёт
покупать?"
below with 56px gap: single-line tagline Inter 400 22pt graphite-700 reads exactly: "Ответ — до визита, а не в примерочной.",
bottom-right pill "04 →" JetBrains Mono 500 14pt,
bottom-left MakeMeLook wordmark ink 72px width.
Heavy whitespace, poster-like typography moment, feels like the pause before revealing a solution.
```

---

### Промпт 05 — Решение (3 layer preview)

```
[База визуального кода] plus:
layout: label "РЕШЕНИЕ" top-left Inter 500 14pt uppercase graphite-500 tracking 0.08em,
hero two-word display headline top area Inter Display weight 500 140pt ink line-height 0.98 tracking -0.03em text reads exactly:
"Примерка
до визита."
below the headline: horizontal row of three equal preview frames each 280px wide by 400px tall, frames have 1px ink hairline border and 6px corner radius filled with chalk #FAFAF7,
inside frame 1: minimalist single-line silhouette illustration 6px stroke ink of a bride wearing a simple A-line wedding gown, editorial fashion line drawing style in spirit of Aesop botanical illustrations,
inside frame 2: same bride silhouette now with added bridal veil flowing from head, same 6px ink stroke,
inside frame 3: same bride silhouette with veil PLUS long opera gloves and small bouquet, same 6px ink stroke,
below each frame: small centered label JetBrains Mono 400 14pt reads "СЛОЙ 1", "СЛОЙ 2", "СЛОЙ 3" — but the digits "1", "2", "3" are rendered in vermilion-orange #D84315 while word "СЛОЙ" stays ink (this is the only accent on the slide),
below the three frames 48px gap: italic caption Inter 400 20pt graphite-700 centered reads exactly: "Невеста видит себя в платье дома — с фатой, с аксессуарами, в полном образе.",
bottom-right pill "05 →", bottom-left MakeMeLook wordmark ink.
Strict editorial fashion aesthetic, zero cheesy bride photos, all line-art.
```

---

### Промпт 06 — Механика

```
[База визуального кода] plus:
layout: label "КАК ЭТО РАБОТАЕТ" top-left Inter 500 14pt uppercase graphite-500 tracking 0.08em,
three-line headline Inter Display weight 500 48pt ink line-height 1.06 reads exactly:
"Виджет на сайте
салона. Интеграция —
одна строка кода."
below headline 48px gap: four-step numbered list each line reads in format "NN — text", numbers "01" "02" "03" "04" rendered JetBrains Mono 500 20pt graphite-500, em-dash separator, step text Inter 400 20pt ink, items read exactly:
"01 — Невеста открывает карточку платья
02 — Загружает своё фото (15 секунд)
03 — Видит себя в платье + фате + аксессуарах
04 — Записывается на визит — готовая к покупке"
at bottom: small stat card with 1px ink hairline border 10px corner radius chalk fill 640px wide centered, inside card two-line text Inter 400 18pt ink reads exactly:
"Среднее время конверсии «первый клик → запись»
↓ с 11 дней до 2 дней"
the down arrow "↓" rendered slightly larger and in ink,
bottom-right pill "06 →", bottom-left MakeMeLook wordmark.
Functional editorial layout, no icons beyond the arrow glyph.
```

---

### Промпт 07 — Метрики (кульминация)

```
[База визуального кода] plus:
layout: label "МЕТРИКИ · ПИЛОТ САЛОНА" top-left Inter 500 14pt uppercase graphite-500 tracking 0.08em,
hero number occupying top 55% of slide centered: "+38%" rendered in Inter Display weight 500 220pt line-height 0.9 tracking -0.04em — color VERMILION-ORANGE #D84315 (this is the primary accent of the slide and climax of the carousel),
directly below the big number 32px gap: single caption line Inter 400 22pt ink centered reads exactly: "конверсия «онлайн-визит → запись в салон»",
below caption 64px gap: row of three supporting stat cards evenly spaced, each card 280px wide with 1px graphite-200 hairline border 10px corner radius chalk fill internal padding 20px,
card 1: big number "−42%" Inter Display 500 56pt ink centered, below it caption Inter 400 14pt graphite-700 centered reads exactly: "нецелевых визитов",
card 2: big number "×1.7" Inter Display 500 56pt ink centered, below it caption Inter 400 14pt graphite-700 centered reads exactly: "средний чек платья",
card 3: big number "−3 дня" Inter Display 500 56pt ink centered, below it caption Inter 400 14pt graphite-700 centered reads exactly: "цикл решения невесты",
at the very bottom: source footnote JetBrains Mono 400 12pt graphite-500 centered reads exactly: "Пилот: 3 салона Москва + СПб, март 2026, выборка 412 невест.",
bottom-right pill "07 →", bottom-left MakeMeLook wordmark.
This is the climax slide — maximum editorial gravitas, vermilion hero number as the single show-stopper.
```

---

### Промпт 08 — CTA

```
[База визуального кода] plus:
layout: label "ДЛЯ ВЛАДЕЛЬЦЕВ СВАДЕБНЫХ САЛОНОВ" top-left Inter 500 14pt uppercase graphite-500 tracking 0.08em,
two-line display headline Inter Display weight 500 64pt ink line-height 1.04 tracking -0.02em text reads exactly:
"Подключаем
за 48 часов."
below headline 48px gap: two-line body text Inter 400 20pt graphite-700 max-width 720px reads exactly:
"Присылаем вам виджет под бренд салона, обучаем администратора, запускаем. Первые 3 салона из этой карусели — без платы за интеграцию.",
below body 56px gap: primary CTA button — pill shape 9999px corner radius filled solid ink #0A0A0A with chalk #FAFAF7 text Inter weight 500 20pt reads "Запросить демо →" padding 20px horizontal 14px vertical centered on slide,
below button 24px gap: secondary text Inter 400 16pt graphite-700 reads exactly: "Или скачать ROI-калькулятор для салона в bio.",
optional handwritten marker-style accent — short diagonal arrow pointing to secondary line with hand-drawn text "← быстрее всего здесь" tilted approximately 3 degrees counter-clockwise, rendered in vermilion-orange #D84315 Caveat or Kalam handwriting font 18pt, looks like a real pen note — this is the single vermilion accent on this slide,
bottom-right pill "08 ✓" (checkmark instead of arrow indicates final slide),
bottom-left MakeMeLook wordmark ink at 100px width (slightly larger than on other slides, signing-off).
Clean sales moment, no pressure, editorial confidence.
```

---

## Чеклист перед публикацией

- [ ] Все 8 слайдов сгенерированы через Nano Banana Pro в разрешении 1080×1350.
- [ ] На слайдах 02, 05, 07 vermilion появляется только в обозначенных местах.
- [ ] Нет одной ошибки в цифрах: 78%, 65%, 2 000–5 000 ₽, +38%, −42%, ×1.7, 412 невест.
- [ ] Дата на слайде 01: `28.03.2026` — проверить по ссылке на решение Роспотребнадзора.
- [ ] Подпись поста — 2200 символов лимит IG; укладываемся в 950.
- [ ] Первые 3 салона, отписавшиеся в ответ, добавлены в CRM-список «Pilot-Q2-2026».
- [ ] ROI-калькулятор для салонов — опубликован в bio (Taplink).
- [ ] Саверы (save rate) замерим через 48 часов от публикации — целевой ≥3% от охвата.

---

*Готово к генерации. Следующая карусель — `03_roi.md` (ROI-калькулятор для fashion-ритейла).*
