# MakeMeLook.ai — Instagram Pipeline

**Назначение:** единая рабочая папка для Instagram-канала MakeMeLook.ai. Всё, что нужно для упаковки профиля, генерации каруселей через Nano Banana Pro, видео через Seedance 2.0 и публикации — лежит здесь.

**Дата старта:** 2026-04-19
**Аккаунт:** @makemelook.ai (создаётся)
**Язык:** русский
**Аудитория приоритета:** CMO брендов одежды, C-level торговых сетей, средний и крупный fashion-retail в РФ/СНГ
**Ключевое УТП:** виртуальная примерка до 5 слоёв одежды одновременно — качество выше текущих решений на рынке (3DLOOK, YesPlz, True Fit, Zero10)

---

## Структура папки

```
Instagram/
├── knowledge-base/                  # источник правды — читается перед каждой задачей
│   ├── brand-profile-instagram.md   # позиционирование аккаунта, tone of voice, визуальный код
│   ├── audience-b2b.md              # ICP: CMO/CEO/Head of Digital fashion-retail + boли
│   ├── content-pillars.md           # 4 столпа контента + пропорции воронки
│   ├── hook-library.md              # 10 формул хуков под B2B fashion
│   ├── visual-code.md               # цвета, шрифты, сетка, эталонные промпты Nano Banana
│   ├── competitors.md               # 3DLOOK, YesPlz, True Fit, Zero10 — что у них плохо/хорошо
│   └── product-marketing-context.md # базовый контекст продукта (шэрится со всеми маркетинг-скиллами)
│
├── content-plans/                   # промежуточные артефакты контент-производства
│   ├── highlights/                  # шапка профиля + 5 хайлайтов (текст, обложки, порядок)
│   ├── carousels/                   # карусели: текст слайдов + промпты Nano Banana + captions
│   ├── reels/                       # сценарии Reels
│   ├── video-briefs/                # брифы на Seedance 2.0 (shot-by-shot)
│   ├── captions/                    # банк подписей/CTA/хэштегов
│   └── shot-bank/                   # каталог сгенерированных визуалов (что уже есть)
│
├── references/                      # банк референсов — копилка что работает у других
│   ├── competitors/                 # посты 3DLOOK, YesPlz, True Fit, Zero10, Zeekit
│   ├── b2b-saas/                    # как упакованы Stripe, Intercom, Notion, Figma, Anthropic
│   ├── fashion-visual/              # визуальные референсы премиум-fashion (Zara, COS, Everlane)
│   ├── carousels-inspiration/       # эталонные карусели (скрины + заметки что работает)
│   └── reels-inspiration/           # эталонные Reels/короткие видео
│
├── assets/                          # сырьё и готовые визуалы
│   ├── nano-banana/                 # выгрузки из Nano Banana Pro (по слайдам)
│   ├── seedance/                    # клипы из Seedance 2.0
│   └── final/                       # готовые к публикации файлы (jpg/png/mp4)
│
└── output/                          # готовый финальный контент с копипастой
    ├── posts/                       # финальные карусели + caption
    ├── reels/                       # финальные Reels + caption
    └── stories/                     # сторис на первые 2 недели
```

---

## Пайплайн: как рождается пост

### Карусель (Nano Banana Pro)

```
1. Идея/тезис (из content-pillars + competitors + новости индустрии)
        ↓
2. content-plans/carousels/<slug>.md — текст слайдов + caption + CTA
        ↓
3. Для каждого слайда — промпт в Nano Banana Pro (по skill nano-banana-prompter)
        ↓
4. Ручная генерация 5–10 вариантов каждого слайда, отбор лучшего → assets/nano-banana/<slug>/
        ↓
5. Ручная сборка (Figma/Canva): текст поверх визуала по visual-code.md
        ↓
6. Экспорт в output/posts/<slug>/ → публикация
```

### Reels (Seedance 2.0)

```
1. Тезис + hook (hook-creator)
        ↓
2. Сценарий 15–30 сек с таймкодами (голос + текст на экране) → content-plans/reels/<slug>.md
        ↓
3. Shot-by-shot бриф для Seedance (video-prompt-builder) → content-plans/video-briefs/<slug>.md
        ↓
4. Генерация клипов в Seedance 2.0 → assets/seedance/<slug>/
        ↓
5. Монтаж в CapCut/Premiere, наложение голоса/текста
        ↓
6. Экспорт в output/reels/<slug>.mp4 → публикация
```

---

## Правила работы

1. **knowledge-base — только 7 файлов.** Не размножать. Любая новая информация — либо дополняет существующий файл, либо идёт в `content-plans/` как артефакт.
2. **Все карусели — в едином визуальном коде.** Промпт Nano Banana = `visual-code.md` (эталонный шаблон) + контекст слайда.
3. **Один пост = одна мысль.** Если хочется два — это два поста.
4. **Воронка 60 / 30 / 10:** 60% TOFU (провокация/insight), 30% MOFU (кейсы/механика), 10% BOFU (demo request). Ниже, чем у личного блога — потому что B2B-аудитория меньшая и каждый пост должен двигать к демо.
5. **Референсы пополняются постоянно.** Раз в неделю — сессия просмотра FashionTech-конкурентов (30 мин) + 10–20 скринов в `references/`.
6. **Готовые ассеты — всегда с caption.** Каждый пост в `output/` содержит jpg/png + `caption.md` с финальным текстом и хэштегами.

---

## Связь с основной папкой MakeMeLook

- **Источники правды** (PRD, Sales Kit, КП для свадебных салонов) — в корне `/sessions/.../MakeMeLook/`. При обновлении продукта сначала правится документ в корне → потом обновляется `knowledge-base/product-marketing-context.md`.
- **Визуалы продукта** (скриншоты виджета, демо try-on) — сырьё для каруселей «Кейс/демо». Добавляются в `assets/nano-banana/` как референс.

---

## Приоритет первой недели (2026-04-19 → 2026-04-26)

1. **Упаковка профиля** — шапка, 5 хайлайтов, обложки хайлайтов. См. `content-plans/highlights/`.
2. **3 карусели в закреп** — манифест, кейс свадебного платья, ROI-калькулятор. См. `content-plans/carousels/`.
3. **1-й пост в ленту «Кто мы»** — команда, продукт, стадия. Не в пин.
4. **Пилотная партия Reels (3 штуки)** — через Seedance: demo 5-слойной примерки, проблема свадебного сегмента, манифест от лица Данила.
5. **Банк референсов** — 30 скринов (карусели + Reels из FashionTech/B2B SaaS/fashion-visual).

---

*Документ — живой. Обновляется по мере работы.*
