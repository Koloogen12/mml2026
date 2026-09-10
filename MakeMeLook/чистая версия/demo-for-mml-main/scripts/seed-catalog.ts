/**
 * Seed script — наполняет каталог шоукейса через SaaS API.
 *
 * Использование:
 *   1. Зайди в admin.makemeelook.ai → создай проект "ATELIER Showcase"
 *   2. Скопируй JWT токен из DevTools (Authorization header в любом запросе)
 *   3. Скопируй числовой ID проекта из URL
 *   4. Запусти:
 *        npx tsx scripts/seed-catalog.ts \
 *          --api https://api.makemeelook.ai \
 *          --token eyJ... \
 *          --project 42
 */

const args = process.argv.slice(2);
function getArg(name: string): string {
  const i = args.indexOf(`--${name}`);
  if (i === -1 || !args[i + 1]) {
    console.error(`Missing --${name}`);
    process.exit(1);
  }
  return args[i + 1];
}

const API_BASE = getArg('api');
const TOKEN = getArg('token');
const PROJECT_ID = getArg('project');

const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

// --- Catalog data (25 SKU, Unsplash editorial photos) ---

const PRODUCTS = [
  // === ПЛАТЬЯ (6) ===
  {
    name: "Платье макси из шёлка с V-образным вырезом",
    brand: "VALENTINO",
    category: "tops",
    subcategory: "dresses",
    gender: "female",
    price: 87500,
    currency: "RUB",
    color: "red",
    material: "silk",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Элегантное платье макси из натурального шёлка с V-образным вырезом. Изысканный силуэт, идеально для особых случаев.",
    season: ["spring", "summer"],
    photos: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
    ],
  },
  {
    name: "Вечернее платье из атласа",
    brand: "ELIE SAAB",
    category: "tops",
    subcategory: "dresses",
    gender: "female",
    price: 215000,
    currency: "RUB",
    color: "gold",
    material: "satin",
    sizes: ["XS", "S", "M", "L"],
    description: "Роскошное вечернее платье из золотистого атласа. Идеально для торжественных мероприятий.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
    ],
  },
  {
    name: "Платье-миди из джерси",
    brand: "THE ROW",
    category: "tops",
    subcategory: "dresses",
    gender: "female",
    price: 68000,
    currency: "RUB",
    color: "black",
    material: "jersey",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Минималистичное платье-миди из мягкого джерси. Универсальная вещь для офиса и ресторана.",
    season: ["all-season"],
    photos: [
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
    ],
  },
  {
    name: "Платье-рубашка из хлопка",
    brand: "LORO PIANA",
    category: "tops",
    subcategory: "dresses",
    gender: "female",
    price: 54000,
    currency: "RUB",
    color: "beige",
    material: "cotton",
    sizes: ["S", "M", "L", "XL"],
    description: "Лёгкое платье-рубашка из тонкого хлопка. Идеально для тёплых дней.",
    season: ["spring", "summer"],
    photos: [
      "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=800&q=80",
      "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&q=80",
    ],
  },
  {
    name: "Коктейльное платье из кружева",
    brand: "VALENTINO",
    category: "tops",
    subcategory: "dresses",
    gender: "female",
    price: 142000,
    currency: "RUB",
    color: "white",
    material: "lace",
    sizes: ["XS", "S", "M"],
    description: "Изысканное коктейльное платье из французского кружева. Длина выше колена.",
    season: ["spring", "summer"],
    photos: [
      "https://images.unsplash.com/photo-1566479179817-f57bdb4ef87d?w=800&q=80",
      "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&q=80",
    ],
  },
  {
    name: "Платье-свитер из мериноса",
    brand: "THE ROW",
    category: "tops",
    subcategory: "dresses",
    gender: "female",
    price: 76500,
    currency: "RUB",
    color: "camel",
    material: "merino wool",
    sizes: ["XS", "S", "M", "L"],
    description: "Тёплое платье-свитер из 100% мериносовой шерсти. Мягкая текстура, длина миди.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
    ],
  },

  // === БЛУЗЫ / ТОПЫ (4) ===
  {
    name: "Шёлковая блуза с манжетами",
    brand: "THE ROW",
    category: "tops",
    subcategory: "blouses",
    gender: "female",
    price: 52300,
    currency: "RUB",
    color: "white",
    material: "silk",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Классическая шёлковая блуза с французскими манжетами. Сочетается с любым силуэтом.",
    season: ["all-season"],
    photos: [
      "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&q=80",
      "https://images.unsplash.com/photo-1551803091-e20673f15770?w=800&q=80",
    ],
  },
  {
    name: "Топ из кашемира с вырезом",
    brand: "LORO PIANA",
    category: "tops",
    subcategory: "tops",
    gender: "female",
    price: 38900,
    currency: "RUB",
    color: "cream",
    material: "cashmere",
    sizes: ["XS", "S", "M", "L"],
    description: "Мягкий кашемировый топ с V-образным вырезом. Базовая вещь для капсульного гардероба.",
    season: ["all-season"],
    photos: [
      "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&q=80",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
    ],
  },
  {
    name: "Блуза с драпировкой из вискозы",
    brand: "THE ROW",
    category: "tops",
    subcategory: "blouses",
    gender: "female",
    price: 44600,
    currency: "RUB",
    color: "black",
    material: "viscose",
    sizes: ["XS", "S", "M", "L"],
    description: "Элегантная блуза с асимметричной драпировкой. Мягкая вискоза, свободный крой.",
    season: ["spring", "summer", "autumn"],
    photos: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80",
      "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&q=80",
    ],
  },
  {
    name: "Рубашка оверсайз из поплина",
    brand: "RALPH LAUREN",
    category: "tops",
    subcategory: "shirts",
    gender: "female",
    price: 29500,
    currency: "RUB",
    color: "blue",
    material: "poplin",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Классическая рубашка оверсайз из хлопкового поплина. Носится навыпуск или в брюки.",
    season: ["spring", "summer"],
    photos: [
      "https://images.unsplash.com/photo-1551803091-e20673f15770?w=800&q=80",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80",
    ],
  },

  // === ПИДЖАКИ (3) ===
  {
    name: "Блейзер оверсайз из шерсти",
    brand: "BALENCIAGA",
    category: "outerwear",
    subcategory: "blazers",
    gender: "female",
    price: 124900,
    currency: "RUB",
    color: "black",
    material: "wool",
    sizes: ["XS", "S", "M", "L"],
    description: "Оверсайз блейзер из плотной шерсти. Широкие плечи, длина до бедра.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1580651315530-69c8e0026377?w=800&q=80",
      "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&q=80",
    ],
  },
  {
    name: "Пиджак двубортный из твида",
    brand: "RALPH LAUREN",
    category: "outerwear",
    subcategory: "blazers",
    gender: "female",
    price: 89000,
    currency: "RUB",
    color: "beige",
    material: "tweed",
    sizes: ["S", "M", "L", "XL"],
    description: "Классический двубортный пиджак из твида. Структурированный силуэт, золотистые пуговицы.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&q=80",
      "https://images.unsplash.com/photo-1580651315530-69c8e0026377?w=800&q=80",
    ],
  },
  {
    name: "Жакет из велюра",
    brand: "BALENCIAGA",
    category: "outerwear",
    subcategory: "blazers",
    gender: "female",
    price: 96500,
    currency: "RUB",
    color: "burgundy",
    material: "velvet",
    sizes: ["XS", "S", "M", "L"],
    description: "Роскошный жакет из мягкого велюра бордового цвета. Идеален для вечерних образов.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1503342452485-86fc71513323?w=800&q=80",
      "https://images.unsplash.com/photo-1580651315530-69c8e0026377?w=800&q=80",
    ],
  },

  // === БРЮКИ / ЮБКИ (3) ===
  {
    name: "Брюки классические из шерсти",
    brand: "RALPH LAUREN",
    category: "bottoms",
    subcategory: "trousers",
    gender: "female",
    price: 78900,
    currency: "RUB",
    color: "grey",
    material: "wool",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Классические широкие брюки из тонкой шерсти. Высокая посадка, прямой крой.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
      "https://images.unsplash.com/photo-1594938298603-c8148c4b5f03?w=800&q=80",
    ],
  },
  {
    name: "Юбка плиссе миди",
    brand: "PRADA",
    category: "bottoms",
    subcategory: "skirts",
    gender: "female",
    price: 92500,
    currency: "RUB",
    color: "black",
    material: "polyester",
    sizes: ["XS", "S", "M", "L"],
    description: "Юбка-плиссе миди из лёгкой ткани. Тонкий пояс на резинке, плавное движение.",
    season: ["spring", "summer", "autumn"],
    photos: [
      "https://images.unsplash.com/photo-1594938298603-c8148c4b5f03?w=800&q=80",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80",
    ],
  },
  {
    name: "Широкие брюки из шёлка",
    brand: "PRADA",
    category: "bottoms",
    subcategory: "trousers",
    gender: "female",
    price: 83000,
    currency: "RUB",
    color: "cream",
    material: "silk",
    sizes: ["XS", "S", "M", "L"],
    description: "Широкие брюки палаццо из натурального шёлка. Высокая посадка, плавный силуэт.",
    season: ["spring", "summer"],
    photos: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80",
    ],
  },

  // === ВЕРХНЯЯ ОДЕЖДА (3) ===
  {
    name: "Пальто из шерсти двубортное",
    brand: "MAX MARA",
    category: "outerwear",
    subcategory: "coats",
    gender: "female",
    price: 189500,
    currency: "RUB",
    color: "camel",
    material: "wool",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Iconic верблюжье пальто Max Mara. Двубортный крой, широкие лацканы, пояс в комплекте.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80",
      "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&q=80",
    ],
  },
  {
    name: "Кожаный тренч",
    brand: "BALENCIAGA",
    category: "outerwear",
    subcategory: "coats",
    gender: "female",
    price: 245000,
    currency: "RUB",
    color: "black",
    material: "leather",
    sizes: ["XS", "S", "M", "L"],
    description: "Тренч из матовой кожи. Пояс, клапаны на карманах, классический силуэт.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&q=80",
      "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80",
    ],
  },
  {
    name: "Пуховик укороченный",
    brand: "MAX MARA",
    category: "outerwear",
    subcategory: "coats",
    gender: "female",
    price: 112000,
    currency: "RUB",
    color: "white",
    material: "nylon",
    sizes: ["XS", "S", "M", "L"],
    description: "Лёгкий укороченный пуховик из водоотталкивающего нейлона. Белый цвет, золотая молния.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80",
      "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80",
    ],
  },

  // === ТРИКОТАЖ (3) ===
  {
    name: "Свитер из кашемира с горлом",
    brand: "LORO PIANA",
    category: "tops",
    subcategory: "knitwear",
    gender: "female",
    price: 68000,
    currency: "RUB",
    color: "beige",
    material: "cashmere",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Классический свитер с высоким горлом из 100% кашемира. Мягкий и тёплый.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
    ],
  },
  {
    name: "Кардиган оверсайз из мохера",
    brand: "THE ROW",
    category: "tops",
    subcategory: "knitwear",
    gender: "female",
    price: 58500,
    currency: "RUB",
    color: "grey",
    material: "mohair",
    sizes: ["XS", "S", "M", "L"],
    description: "Пушистый оверсайз кардиган из мохера. Длина до колена, объёмные карманы.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80",
    ],
  },
  {
    name: "Джемпер из мериносовой шерсти",
    brand: "LORO PIANA",
    category: "tops",
    subcategory: "knitwear",
    gender: "female",
    price: 42000,
    currency: "RUB",
    color: "navy",
    material: "merino wool",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Тонкий джемпер из мериносовой шерсти. Базовый крой, V-образный вырез.",
    season: ["autumn", "winter"],
    photos: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80",
      "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&q=80",
    ],
  },

  // === АКСЕССУАРЫ (3) ===
  {
    name: "Сумка Arco из кожи",
    brand: "BOTTEGA VENETA",
    category: "accessories",
    subcategory: "bags",
    gender: "female",
    price: 245000,
    currency: "RUB",
    color: "brown",
    material: "leather",
    sizes: [],
    description: "Культовая сумка Arco из плетёной кожи. Ручная работа, вместительный формат.",
    season: ["all-season"],
    photos: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
    ],
  },
  {
    name: "Ремень из кожи крокодила",
    brand: "VALENTINO",
    category: "accessories",
    subcategory: "belts",
    gender: "female",
    price: 38500,
    currency: "RUB",
    color: "black",
    material: "leather",
    sizes: ["S", "M", "L"],
    description: "Тонкий ремень из тиснёной кожи под крокодила. Золотая пряжка V-logo.",
    season: ["all-season"],
    photos: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    ],
  },
  {
    name: "Шёлковый платок",
    brand: "VALENTINO",
    category: "accessories",
    subcategory: "scarves",
    gender: "female",
    price: 24900,
    currency: "RUB",
    color: "multicolor",
    material: "silk",
    sizes: [],
    description: "Шёлковый платок с принтом. 90×90 см, можно носить на шее или в волосах.",
    season: ["all-season"],
    photos: [
      "https://images.unsplash.com/photo-1601924638867-3a6de6b7a500?w=800&q=80",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    ],
  },
];

// --- API helpers ---

async function createProduct(product: typeof PRODUCTS[number]) {
  const { photos, ...body } = product;
  const res = await fetch(`${API_BASE}/api/v1/projects/${PROJECT_ID}/products`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create "${product.name}": ${res.status} ${err}`);
  }
  return res.json() as Promise<{ id: number; public_id: string }>;
}

async function attachPhotoByURL(productId: number, url: string, sortOrder: number) {
  // Use external_url approach: create a photo record pointing to the Unsplash URL
  // by uploading a 1x1 placeholder and then updating the external_url.
  // Simpler: use the product URL as photo_url via CSV import approach.
  // For seed script simplicity, we skip direct upload and note photos are external URLs.
  // In production, photos should be uploaded to Minio.
  console.log(`  [photo ${sortOrder + 1}] ${url} (external — upload manually if needed)`);
}

// --- Main ---

async function main() {
  console.log(`\n🌱 Seeding catalog for project ${PROJECT_ID} at ${API_BASE}\n`);

  let created = 0;
  let failed = 0;

  for (const product of PRODUCTS) {
    try {
      const result = await createProduct(product);
      console.log(`✓ ${product.brand} — ${product.name} (id: ${result.id}, public_id: ${result.public_id})`);
      for (let i = 0; i < product.photos.length; i++) {
        await attachPhotoByURL(result.id, product.photos[i], i);
      }
      created++;
    } catch (e) {
      console.error(`✗ ${product.name}: ${e}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\n✅ Done: ${created} created, ${failed} failed`);
  console.log('\nNext steps:');
  console.log('  1. Upload product photos via admin or API (photos are external Unsplash URLs for now)');
  console.log('  2. Copy the project public_id from admin settings');
  console.log(`  3. Add to .env: VITE_PROJECT_ID=<your-project-uuid>`);
  console.log('  4. Test: GET /api/storefront/v1/<uuid>/products');
}

main().catch(console.error);
