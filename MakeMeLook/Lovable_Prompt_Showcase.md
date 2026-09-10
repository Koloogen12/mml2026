# Промпт для Lovable — Шоукейс магазин MakeMeLook

## Вставь этот промпт в Lovable:

---

Build a modern, minimal luxury fashion e-commerce website inspired by Farfetch. This is a demo showcase for a B2B SaaS virtual try-on widget called MakeMeLook. The site should look and feel like a real online clothing store.

## Design Style
- Clean white background, minimal UI, luxury fashion aesthetic
- Typography: Inter or similar clean sans-serif. Headings in uppercase or semi-bold
- Color palette: white (#FFFFFF) background, black (#000000) text, subtle grey (#F5F5F5) for cards, blue (#3B82F6) for accents
- Inspired by Farfetch.com — product grid layout, thin navigation, elegant spacing
- Mobile-responsive

## Header / Navigation
- Top announcement bar: "Бесплатная доставка от 5 000 ₽ | Возврат 14 дней" (dark background, white text, small font)
- Logo: "ATELIER" (or placeholder store name) — centered or left-aligned, bold uppercase
- Navigation menu items: Новинки, Одежда, Обувь, Аксессуары, Свадебная коллекция, Распродажа
- Right side: search icon, heart/wishlist icon, shopping bag icon with counter
- Sticky header on scroll

## Hero Section
- Large banner image (use a high-quality fashion/editorial placeholder)
- Overlay text: "Свадебная коллекция 2026" (large heading)
- Subtext: "Откройте для себя идеальный образ"
- CTA button: "Смотреть коллекцию" (white button with border)

## Product Sections

### Section 1: "Новинки" (horizontal scroll carousel)
Show 6 product cards in a horizontal scrollable row:
- Product card: image (tall aspect ratio ~3:4), brand name (uppercase, small), product name, price in ₽
- Heart/favorite icon on hover
- Use placeholder fashion images (dresses, tops, pants)
- Products should have Russian names and ₽ prices (e.g., "VALENTINO", "Платье макси из шёлка", "87 500 ₽")

### Section 2: "Свадебная коллекция" (full-width feature)
- Full-width background image (bridal/wedding theme)
- Overlay: "Что надеть на свадьбу?" heading
- "От свадебных платьев до аксессуаров для гостей"
- CTA: "Начать шопинг"

### Section 3: Product Grid (main catalog)
- 4-column grid (3 on tablet, 2 on mobile)
- 12-16 product cards with:
  - Product image (placeholder)
  - "Новый сезон" badge on some items
  - Brand name (uppercase, small, grey)
  - Product title
  - Price: "XX XXX ₽"
  - Wishlist heart icon
- Filter bar above the grid: Категория, Размер, Цвет, Бренд, Цена, Сортировка

### Section 4: "Тренды сезона" (editorial grid)
- 4 cards in a row, each with:
  - Square image
  - Title overlay: "Тёплые оттенки", "Модели из кожи", "Свадебный стиль", "Минимализм"
  - Hover effect: slight zoom

## Product Detail Page (create one as example)
- Large product image (left side, ~60% width)
- Right side:
  - Brand: "VALENTINO" (uppercase, linked)
  - Title: "Платье макси из шёлка с V-образным вырезом"
  - Price: "87 500 ₽"
  - Size selector: XS, S, M, L, XL
  - Color swatches: 3 colors
  - "Добавить в корзину" button (black, full-width)
  - "Добавить в избранное" button (outlined)
  - **IMPORTANT: Add a prominent button "✨ Виртуальная примерка" (blue background #3B82F6, white text, full-width, with sparkle icon) — this is the MakeMeLook widget trigger button. Place it between the size selector and "Добавить в корзину"**
  - Accordion sections: "Описание", "Размерная сетка", "Доставка и возврат"
- Below: "Вам также может понравиться" — 4 related products

## MakeMeLook Widget Integration
Add this script tag before closing </body>:
```html
<script src="https://cdn.makemeelook.ai/widget/loader.js" data-project="PROJECT_ID" async></script>
```
The widget will appear as a floating button. Additionally, the "✨ Виртуальная примерка" button on the product page should trigger the widget opening.

## Footer
- 4 columns: О нас, Помощь, Доставка и оплата, Контакты
- Newsletter signup: "Подпишитесь на новинки" with email input
- Social icons: Instagram, Telegram, VK
- Copyright: "© 2026 ATELIER. Все права защищены."
- Small text: "Powered by MakeMeLook.ai" with link

## Technical Notes
- Use React + Tailwind CSS
- Use React Router for product detail page navigation
- Use placeholder images from picsum.photos or similar
- All text in Russian
- Currency: Russian Rubles (₽)
- Make it feel premium and real — not like a template

---

## Дополнительный промпт для доработки (после первой генерации):

```
Now add the following improvements:
1. Add a "✨ Примерить на себе" floating button in the bottom-right corner (fixed position, blue gradient background, white text, pulse animation) — this represents the MakeMeLook virtual try-on widget trigger
2. On the product detail page, add a section below the product image showing "Как это работает:" with 3 steps: "1. Загрузите фото → 2. Выберите размер → 3. Увидьте результат" with small icons
3. Add a banner between product sections: "Попробуйте виртуальную примерку — увидьте, как одежда будет выглядеть на вас" with a "Попробовать" button
4. Make the product images use aspect-ratio 3:4 consistently
5. Add hover effects on product cards: slight scale transform and shadow
```
