# Упаковка профиля @makemelook.ai

**Дата:** 2026-04-19
**Назначение:** готовая «копипаста» для настройки профиля Instagram. Всё, что нужно вставить в настройки аккаунта.

---

## 1. Основы профиля

| Поле | Значение |
|---|---|
| **Категория профиля** | Software · Technology · AI Solutions |
| **Тип аккаунта** | Business |
| **Имя пользователя** | `makemelook.ai` (проверить доступность; запасные: `makemelook_ai`, `makemelook.official`) |
| **Имя (Name, 30 симв)** | `MakeMeLook · Virtual Try-On` |
| **Ссылка** | `makemelook.ai/b2b?utm_source=instagram&utm_medium=bio` (через Taplink/Beacons — 3-4 ссылки: демо, ROI-калькулятор, WhatsApp, Telegram) |
| **Кнопки контакта** | Email (`sales@makemelook.ai`), WhatsApp, Telegram |

---

## 2. Шапка профиля (Bio, лимит 150 символов)

### Вариант A — экспертный, для C-level (Recommended)

```
Виртуальная примерка до 5 слоёв одежды
Снижаем возвраты на 25%, растим AOV на 30%
Для CMO и C-level fashion-ритейла
↓ Запросить демо
```

**Символов:** 139. Влезает.

### Вариант B — цифровая провокация

```
30% возвратов сжирают маржу fashion-ритейла
Виджет виртуальной примерки — встраиваем за час
5 слоёв одновременно. Так не умеет никто.
↓ Демо за 15 мин
```

**Символов:** 141. Влезает.

### Вариант C — минималистичный (под визуальный wow)

```
Виртуальная примерка нового поколения
До 5 слоёв · 25% меньше возвратов
B2B для fashion-ритейла РФ/СНГ
↓
```

**Символов:** 118. Влезает. Рекомендую как backup, если после 2 недель A/B тестов A и B не зайдут.

---

## 3. Имя (name) — почему именно так

`MakeMeLook · Virtual Try-On` — ключевое слово `Virtual Try-On` попадает в алгоритм поиска. Это усиливает органику, когда ритейлеры ищут «virtual try on», «виртуальная примерка», «виджет примерки» в Instagram.

**Альтернативы:**
- `MakeMeLook · AI-примерка для ритейла` — для русскоязычного поиска.
- `MakeMeLook · Fit & Stylist AI` — если захотим подчеркнуть AI-stylist.

Тестируем A через 2 недели, меряем приход органики через «Explore» vs прямые ссылки.

---

## 4. Аватар профиля

**ИСПОЛЬЗУЕМ ГОТОВЫЙ ЛОГОТИП** — есть `logo-monogram.svg` в `Instagram/assets/brand/`. Это стилизованная монограмма M (белый линейный контур на чёрном фоне). Генерировать новый аватар не нужно — экспортируем из SVG.

### Инструкция по экспорту

1. Открыть `Instagram/assets/brand/logo-monogram.svg` в Figma / Illustrator / Inkscape.
2. Экспортировать в PNG 1080×1080px с фоном `#0A0A0A` ink (не чистый `#000`).
3. Проверить читаемость на 32×32px preview — символ должен оставаться распознаваемым (он линейный, не теряется при downscale).
4. Загрузить как profile picture в Instagram.

**Цветовая логика:**
- Фон аватара: `#0A0A0A` ink.
- Логотип: paper `#FFFFFF`.
- Никаких градиентов, никаких шейпов вокруг, никакого rounded corner — IG сам обрежет в круг.

### Альтернатива для A/B-теста

Inverted вариант: логотип ink `#0A0A0A` на фоне chalk `#FAFAF7`. Читается мягче, более editorial. Но primary вариант (белый на ink) — сильнее в ленте, быстрее узнаётся.

---

## 5. Хайлайты (5 постоянных)

Лимит Instagram по обложкам — круг 101×101 с safe zone ~75×75. Все обложки — в едином визуальном коде согласно `visual-code.md`: chalk фон `#FAFAF7` + ink иконка `#0A0A0A` (2px stroke) + lowercase подпись Inter 12pt ниже. Один vermilion акцент — на одной из обложек (рекомендация: `кейсы`, чтобы выделить в карусели highlights).

| # | Название | Что внутри | Обложка — концепт |
|---|---|---|---|
| 1 | `продукт` | 5–8 сторис: как работает виджет, интеграция за 1 строку, интерфейс try-on, AI-stylist | Иконка «окно примерки» (рамка с силуэтом платья внутри) |
| 2 | `кейсы` | кейсы свадебных салонов, до/после, метрики | Иконка «график вверх» (restrained line) |
| 3 | `салоны` | прицельно для свадебных — проблема Роспотребнадзора, выгоды, cost-per-try-on | Иконка «платье» (минималистичный контур свадебного платья) |
| 4 | `ритейл` | для fashion-ритейла — сравнение с конкурентами, ROI, интеграция | Иконка «вешалка» или стилизованная буква «R» |
| 5 | `FAQ` | как внедрить, безопасность данных, поддержка, pricing | Иконка «?» в ink-круге |

### Порядок хайлайтов

1. `продукт` → 2. `кейсы` → 3. `салоны` → 4. `ритейл` → 5. `FAQ`

Логика: сначала продукт и кейсы (доверие), потом сегменты (навигация), FAQ в конце (удержание).

### Промпты Nano Banana Pro для 5 обложек

**База визуального кода:** `visual-code.md` (chalk `#FAFAF7` + ink `#0A0A0A` + vermilion `#D84315` редкий акцент + Inter / Golos Text).

**Общий стиль (добавлять к каждому промпту):**
```
Instagram story highlight cover 1080x1920, THE MONO design system,
warm chalk off-white background #FAFAF7 with very subtle paper grain,
centered composition with line-icon occupying middle 50%, safe zone 300px all sides (IG crops to circle 101x101),
ink near-black #0A0A0A flat line icon, 6px stroke, no fill, no gradient,
monochrome editorial aesthetic, NYT × Aesop × Mercury Bank school,
lowercase label "[НАЗВАНИЕ]" below icon in Golos Text 500 weight cyrillic, 56pt, centered, ink #0A0A0A,
generous whitespace, flat design, no shadows, no 3D, no texture overlays,
no purple, no blue, no rainbow, strictly monochrome with optional single vermilion #D84315 accent
```

---

**Обложка 1 — `продукт`**
```
[Общий стиль] + centered minimalist line icon: smartphone outline (rounded rectangle 6px stroke ink #0A0A0A), inside the phone frame a delicate single-line silhouette of a woman wearing a dress, both elements ink color 6px stroke, editorial fashion icon style, lowercase Golos Text cyrillic label "продукт" underneath
```

**Обложка 2 — `кейсы`** (с акцентом vermilion)
```
[Общий стиль] + centered minimalist icon of an upward trending line chart, 3 dots connected by ascending line, main line in ink #0A0A0A 6px stroke, final data point rendered as solid vermilion #D84315 circle 24px diameter (the single accent), no axes, no labels, pure editorial geometry, lowercase Golos Text cyrillic label "кейсы" underneath in ink
```

**Обложка 3 — `салоны`**
```
[Общий стиль] + centered minimalist single-line silhouette of a wedding A-line gown, elegant continuous contour, ink #0A0A0A 6px stroke, no fill, no details, editorial fashion iconography in the spirit of Aesop botanical illustrations, lowercase Golos Text cyrillic label "салоны" underneath
```

**Обложка 4 — `ритейл`**
```
[Общий стиль] + centered minimalist line icon of a classic clothes hanger with a long coat silhouette hanging below, ink #0A0A0A 6px stroke, no fill, editorial retail iconography, lowercase Golos Text cyrillic label "ритейл" underneath
```

**Обложка 5 — `FAQ`**
```
[Общий стиль] + centered bold question mark "?" in Inter Display 600 weight, ink #0A0A0A, inside a thin 6px ink circle frame, editorial minimalist style, lowercase Golos Text cyrillic label "FAQ" underneath
```

---

## 6. Закреплённые посты (3 пина — лимит Instagram)

Порядок в пинах:
1. **Манифест** — зачем MakeMeLook и почему сейчас (см. `../carousels/01_manifest.md`)
2. **Кейс/демо свадебного платья** (см. `../carousels/02_wedding-case.md`)
3. **ROI-калькулятор для салона/ритейлера** (см. `../carousels/03_roi.md`)

Пост «Кто мы — команда, продукт, стадия» публикуется 4-м, БЕЗ закрепа. Причина: IG даёт только 3 пина, и 4-й пост на равных основаниях по приоритету ниже остальных трёх. «Кто мы» — это доверительный пост для уже заинтересованных.

---

## 7. Чеклист перед запуском профиля

- [ ] Аккаунт создан, категория Business, привязан к странице Facebook.
- [ ] Имя пользователя: `makemelook.ai` (или альтернатива).
- [ ] Name в профиле: `MakeMeLook · Virtual Try-On`.
- [ ] Bio — вариант A, 139 симв.
- [ ] Ссылка в bio через Taplink с 3–4 CTA.
- [ ] Кнопки контакта: email + WhatsApp + Telegram.
- [ ] Аватар — сгенерирован через Nano Banana, загружен.
- [ ] 5 обложек хайлайтов — сгенерированы, загружены.
- [ ] 5 хайлайтов — собраны из минимум 5 сторис каждый.
- [ ] 3 карусели в пинах (в порядке: манифест → кейс → ROI).
- [ ] 4-й пост «Кто мы» — опубликован без пина.
- [ ] Первый Reel — опубликован (5-слойная примерка как hero).
- [ ] Business Tools активированы (Insights, Lead Ads ready).

---

*Готово к публикации после согласования шапки и обложек.*
