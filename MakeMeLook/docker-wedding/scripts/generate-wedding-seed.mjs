#!/usr/bin/env node
// ============================================================================
// generate-wedding-seed.mjs
//
// Multi-source CSV → SQL seed generator. Produces seeds/christi-wedding.sql
// containing:
//   1. owner user
//   2. project with fixed public_id (must match VITE_PROJECT_ID in shop build)
//   3. widget_configs row (language='ru', rest defaults)
//   4. products from several CSVs (christiwedding, farfetch, noconcept)
//      with normalised category/subcategory/gender/brand/description fields
//   5. product_photos with external_url (no MinIO upload)
//
// Run: node scripts/generate-wedding-seed.mjs
// ============================================================================
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_PATH = path.join(ROOT, 'seeds', 'christi-wedding.sql');

// Fixed UUID — must match VITE_PROJECT_ID baked into shop build
const PROJECT_UUID = '11111111-1111-1111-1111-111111111111';

// ---------- tiny CSV parser (handles quoted fields with commas + CRLF) ------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === '"') { inQuotes = true; i += 1; continue; }
    if (ch === ',') { row.push(field); field = ''; i += 1; continue; }
    if (ch === '\r') { i += 1; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 1; continue; }
    field += ch; i += 1;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function loadCSV(filename) {
  const full = path.join(ROOT, 'demo-for-mml-main', filename);
  if (!fs.existsSync(full)) {
    console.warn(`⚠️  skipped ${filename} — file not found`);
    return [];
  }
  const txt = fs.readFileSync(full, 'utf-8');
  const rows = parseCSV(txt);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  const records = rows
    .slice(1)
    .filter((r) => r.length >= 2 && r.some((c) => c.trim() !== ''))
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
      return obj;
    });
  return records;
}

// ---------- SQL escaping ----------------------------------------------------
function dollarQuote(str, tag = 'q') {
  if (str === null || str === undefined || str === '') return 'NULL';
  let t = tag;
  let idx = 0;
  while (String(str).includes(`$${t}$`)) { t = tag + (++idx); }
  return `$${t}$${str}$${t}$`;
}

function numOrNull(v) {
  if (v === null || v === undefined || v === '' || v === 'NaN') return 'NULL';
  const n = Number(v);
  if (!Number.isFinite(n)) return 'NULL';
  return String(n);
}

function textOrNull(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return dollarQuote(String(v));
}

function clip(str, max) {
  if (!str) return str;
  const s = String(str);
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function parsePrice(v) {
  if (!v) return null;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : null;
}

// ---------- Source adapters -------------------------------------------------
// Each adapter turns one CSV row into a canonical product record:
//   { external_id, name, brand, sku, category, subcategory, gender, price,
//     currency, color, material, description, product_url, photos[] }

function adaptChristi(p, idx) {
  // All Christi rows are wedding dresses. Mark category='wedding' so the
  // shop can split them into their own "Свадебная коллекция" section, and
  // still keep them visible to gender=female users via client-side fallback.
  const urls = (p.photo_urls || '').split('|').map((s) => s.trim()).filter(Boolean);
  if (!urls.length && p.photo_url) urls.push(p.photo_url.trim());

  const facts = [];
  if (p.silhouette) facts.push(`Силуэт: ${p.silhouette}`);
  if (p.fabric)     facts.push(`Ткань: ${p.fabric}`);
  if (p.length)     facts.push(`Длина: ${p.length}`);
  if (p.neckline)   facts.push(`Вырез: ${p.neckline}`);
  if (p.sleeve)     facts.push(`Рукав: ${p.sleeve}`);

  const descParts = [];
  if (p.description) descParts.push(p.description.trim());
  if (facts.length)  descParts.push(facts.join(' · '));

  return {
    external_id: `christi-${p.uid || idx}`,
    name:        p.name?.trim() || `Christi ${p.uid}`,
    brand:       p.brand?.trim() || 'Christi Couture',
    sku:         p.sku?.trim() || null,
    category:    'wedding',
    // Use silhouette (А-силуэт / Прямой) as subcategory so the widget's
    // subcategory popup has something meaningful to filter by.
    subcategory: p.silhouette?.trim() || null,
    gender:      'female',
    price:       parsePrice(p.price),
    currency:    p.currency?.trim() || 'RUB',
    // Storefront GetFiltersAgg SELECT DISTINCT color scans into []string
    // and errors on NULL — default to "off-white" for bridal.
    color:       p.color?.trim() || 'off-white',
    material:    clip(p.fabric?.trim() || '', 255) || null,
    description: clip(descParts.filter(Boolean).join('\n\n'), 1900),
    product_url: p.product_url?.trim() || null,
    photos:      urls,
  };
}

function adaptNoconcept(p, idx) {
  // category/subcategory/gender already canonical in parser output.
  const inStock = (p.in_stock || '').toLowerCase();
  if (inStock === 'false') return null; // skip out-of-stock men's items

  return {
    external_id: `noconcept-${p.sku || idx}`,
    name:        p.name?.trim() || `NOCONCEPT ${idx}`,
    brand:       p.brand?.trim() || 'NOCONCEPT',
    sku:         p.sku?.trim() || null,
    category:    p.category?.trim() || 'tops',
    subcategory: p.subcategory?.trim() || null,
    gender:      p.gender?.trim() || 'male',
    price:       parsePrice(p.price),
    currency:    p.currency?.trim() || 'RUB',
    color:       p.color?.trim() || 'чёрный',
    material:    clip(p.composition?.trim() || '', 255) || null,
    description: clip(p.description?.trim() || '', 1900),
    product_url: p.product_url?.trim() || null,
    photos:      p.photo_url ? [p.photo_url.trim()] : [],
  };
}

function adaptBruler(p, idx) {
  // Brûler is a single streetwear brand — we ignore the CSV's Russian
  // subcategory names and flatten everything into a dedicated "Bruler" tag
  // so the widget subcategory popup shows one clean entry.
  // Gender is 'unisex' → we store it as-is; the storefront repo now treats
  // unisex as matching both male and female shop filters.
  return {
    external_id: `bruler-${idx}`,
    name:        p.name?.trim() || `Brûler ${idx}`,
    brand:       p.brand?.trim() || 'Brûler',
    sku:         null,
    category:    p.category?.trim() || 'tops',
    subcategory: 'Bruler',
    gender:      'unisex',
    price:       parsePrice(p.price),
    currency:    p.currency?.trim() || 'RUB',
    color:       p.color?.trim() || 'multi',
    material:    clip(p.material?.trim() || '', 255) || null,
    description: clip(p.description?.trim() || '', 1900),
    product_url: p.product_url?.trim() || null,
    photos:      p.photo_url ? [p.photo_url.trim()] : [],
  };
}

// Farfetch CSV has every row marked category='tops' regardless of actual type.
// Reclassify by keywords in the product name so jackets end up in outerwear,
// jeans in bottoms, bags in accessories, etc. Falls back to 'tops'.
function classifyByName(name) {
  const n = (name || '').toLowerCase();

  // accessories
  if (/\b(bag|backpack|tote|clutch|purse|wallet|belt|scarf|hat|cap|beanie|beret|glove|sunglasses|bracelet|necklace|ring|earring|watch|tie|pocket\s*square|keychain)\b/.test(n))
    return { category: 'accessories', subcategory: null };

  // shoes
  if (/\b(boot|sneaker|trainer|loafer|pump|sandal|heel|mule|slide|flat|oxford|derby)\b/.test(n))
    return { category: 'shoes', subcategory: null };

  // outerwear
  if (/\b(jacket|coat|parka|trench|bomber|puffer|anorak|windbreaker|overcoat|blazer|cardigan|vest|waistcoat)\b/.test(n))
    return { category: 'outerwear', subcategory: null };

  // bottoms
  if (/\b(jeans|trouser|pant|short|skirt|legging|jogger|cargo|culotte|chino|sweatpant)\b/.test(n))
    return { category: 'bottoms', subcategory: null };

  // dresses, tops (default tops bucket) — dresses count as wedding-like tops
  if (/\bdress\b/.test(n))
    return { category: 'tops', subcategory: 'Платья' };

  return { category: 'tops', subcategory: null };
}

function adaptFarfetch(p, idx) {
  const cls = classifyByName(p.name);
  return {
    external_id: `farfetch-${idx}`,
    name:        p.name?.trim() || `Item ${idx}`,
    brand:       p.brand?.trim() || 'Unknown',
    sku:         null,
    // Use classified category/subcategory (from name), not the dumb 'tops'
    // that the farfetch parser put on every row.
    category:    cls.category,
    subcategory: cls.subcategory,
    gender:      p.gender?.trim() || 'unisex',
    price:       parsePrice(p.price),
    currency:    p.currency?.trim() || 'RUB',
    color:       p.color?.trim() || 'multi',
    material:    clip(p.material?.trim() || '', 255) || null,
    description: clip(p.description?.trim() || '', 1900),
    product_url: p.product_url?.trim() || null,
    photos:      p.photo_url ? [p.photo_url.trim()] : [],
  };
}

// ---------- main ------------------------------------------------------------
console.log('📥 Reading CSVs');
const christi   = loadCSV('christiwedding-products.csv').map(adaptChristi).filter(Boolean);
const noconcept = loadCSV('noconcept-products.csv').map(adaptNoconcept).filter(Boolean);
const farfetch  = loadCSV('farfetch-products.csv').map(adaptFarfetch).filter(Boolean);
const bruler    = loadCSV('bruler-products.csv').map(adaptBruler).filter(Boolean);

const products = [...christi, ...noconcept, ...farfetch, ...bruler]
  // de-dupe by external_id in case of accidental duplicates
  .filter((p, i, arr) => arr.findIndex((q) => q.external_id === p.external_id) === i)
  // drop products with no photos at all — the shop card will look broken
  .filter((p) => p.photos.length > 0);

console.log(`  christi:   ${christi.length} products`);
console.log(`  noconcept: ${noconcept.length} products`);
console.log(`  farfetch:  ${farfetch.length} products`);
console.log(`  bruler:    ${bruler.length} products`);
console.log(`  TOTAL:     ${products.length} (after dedupe + photo filter)`);

// ---------- SQL generation --------------------------------------------------
let sql = '';
sql += `-- ${'='.repeat(76)}\n`;
sql += `-- christi-wedding.sql — auto-generated, do not edit by hand.\n`;
sql += `-- Source: christiwedding (${christi.length}) + noconcept (${noconcept.length}) + farfetch (${farfetch.length})\n`;
sql += `-- Total products: ${products.length}\n`;
sql += `-- ${'='.repeat(76)}\n\n`;
sql += `BEGIN;\n\n`;

// 1) owner user
sql += `-- 1) Demo owner user\n`;
sql += `INSERT INTO users (email, name, last_name, password_hash, status)\n`;
sql += `VALUES (\n`;
sql += `  'admin@local.makemelook',\n`;
sql += `  'Local', 'Admin',\n`;
sql += `  '$2a$10$DoNotUseThisHashItIsOnlyAnOwnerStubForLocalDemoXXX',\n`;
sql += `  'active'\n`;
sql += `)\n`;
sql += `ON CONFLICT (email) DO UPDATE SET updated_at = NOW();\n\n`;

// 2) project
sql += `-- 2) Project (fixed public_id = VITE_PROJECT_ID)\n`;
sql += `INSERT INTO projects (\n`;
sql += `  public_id, owner_id, name, site_url, category, target_audience, description, status, onboarding_completed\n`;
sql += `)\n`;
sql += `SELECT\n`;
sql += `  '${PROJECT_UUID}'::uuid,\n`;
sql += `  u.id,\n`;
sql += `  'MakeMeLook — демо-коллекция',\n`;
sql += `  'http://localhost:8080',\n`;
sql += `  'multi',\n`;
sql += `  ARRAY['female','male']::text[],\n`;
sql += `  'Демо-витрина MakeMeLook: свадебная коллекция Christi + мужской NOCONCEPT + Farfetch luxury.',\n`;
sql += `  'active', true\n`;
sql += `FROM users u WHERE u.email = 'admin@local.makemelook'\n`;
sql += `ON CONFLICT (public_id) DO UPDATE SET\n`;
sql += `  name = EXCLUDED.name,\n`;
sql += `  site_url = EXCLUDED.site_url,\n`;
sql += `  status = EXCLUDED.status,\n`;
sql += `  updated_at = NOW();\n\n`;

// 3) widget config with language=ru + clear English text overrides
// Migration defaults have English strings in intro_title, params_title etc.
// Setting them to '' makes the widget fall through to i18n/locales/ru.ts.
sql += `-- 3) Widget config (language=ru, no English overrides)\n`;
sql += `INSERT INTO widget_configs (project_id, language, monthly_tryon_limit,\n`;
sql += `  stages_enabled,\n`;
sql += `  intro_title, intro_description,\n`;
sql += `  params_title, params_subtitle, measurements_title, measurements_subtitle,\n`;
sql += `  belly_title, belly_subtitle, figure_title, figure_subtitle)\n`;
sql += `SELECT id, 'ru', 3,\n`;
sql += `  '{"intro":true,"height_weight":true,"measurements":true,"size":true,"belly":true,"figure":true}'::jsonb,\n`;
sql += `  '', '', '', '', '', '', '', '', '', ''\n`;
sql += `FROM projects WHERE public_id = '${PROJECT_UUID}'::uuid\n`;
sql += `ON CONFLICT (project_id) DO UPDATE SET\n`;
sql += `  language = 'ru',\n`;
sql += `  monthly_tryon_limit = 3,\n`;
sql += `  stages_enabled = '{"intro":true,"height_weight":true,"measurements":true,"size":true,"belly":true,"figure":true}'::jsonb,\n`;
sql += `  intro_title = '', intro_description = '',\n`;
sql += `  params_title = '', params_subtitle = '',\n`;
sql += `  measurements_title = '', measurements_subtitle = '',\n`;
sql += `  belly_title = '', belly_subtitle = '',\n`;
sql += `  figure_title = '', figure_subtitle = '',\n`;
sql += `  updated_at = NOW();\n\n`;

// 3.1) Allowed domains — in production mode backend checks Origin/Referer
// against project_domains. Add both local demo and the deployed hostname.
sql += `-- 3.1) Allowed domains (for production domain-verification middleware)\n`;
sql += `INSERT INTO project_domains (project_id, domain, is_verified, verified_at)\n`;
sql += `SELECT p.id, v.domain, true, NOW()\n`;
sql += `FROM projects p\n`;
sql += `CROSS JOIN (VALUES\n`;
sql += `  ('localhost:8080'),\n`;
sql += `  ('localhost'),\n`;
sql += `  ('b2b.makemelook.ai'),\n`;
sql += `  ('makemelook.ai')\n`;
sql += `) AS v(domain)\n`;
sql += `WHERE p.public_id = '${PROJECT_UUID}'::uuid\n`;
sql += `ON CONFLICT DO NOTHING;\n\n`;

// 4) wipe existing products
sql += `-- 4) Idempotent re-seed: wipe existing products of this project\n`;
sql += `DELETE FROM product_photos WHERE product_id IN (\n`;
sql += `  SELECT id FROM products WHERE project_id = (\n`;
sql += `    SELECT id FROM projects WHERE public_id = '${PROJECT_UUID}'::uuid\n`;
sql += `  )\n`;
sql += `);\n`;
sql += `DELETE FROM products WHERE project_id = (\n`;
sql += `  SELECT id FROM projects WHERE public_id = '${PROJECT_UUID}'::uuid\n`;
sql += `);\n\n`;

// 5) products
sql += `-- 5) Products (${products.length} rows)\n`;
sql += `INSERT INTO products (\n`;
sql += `  project_id, name, sku, category, subcategory, gender, price, currency,\n`;
sql += `  color, material, brand, description, product_url, external_id,\n`;
sql += `  source, is_active\n`;
sql += `)\n`;
sql += `SELECT\n`;
sql += `  (SELECT id FROM projects WHERE public_id = '${PROJECT_UUID}'::uuid),\n`;
sql += `  v.name, v.sku, v.category, v.subcategory, v.gender, v.price, v.currency,\n`;
sql += `  v.color, v.material, v.brand, v.description, v.product_url, v.external_id,\n`;
sql += `  'manual', true\n`;
sql += `FROM (VALUES\n`;

const productValues = products.map((p) => (
  `  (` +
  `${dollarQuote(p.name)}, ` +
  `${textOrNull(p.sku)}, ` +
  `${dollarQuote(p.category)}, ` +
  `${textOrNull(p.subcategory)}, ` +
  `${dollarQuote(p.gender)}, ` +
  `${numOrNull(p.price)}::numeric(10,2), ` +
  `${dollarQuote(p.currency)}, ` +
  `${textOrNull(p.color)}, ` +
  `${textOrNull(p.material)}, ` +
  `${dollarQuote(p.brand)}, ` +
  `${textOrNull(p.description)}, ` +
  `${textOrNull(p.product_url)}, ` +
  `${dollarQuote(p.external_id)}` +
  `)`
));

sql += productValues.join(',\n');
sql += `\n) AS v(name, sku, category, subcategory, gender, price, currency, color, material, brand, description, product_url, external_id);\n\n`;

// 6) photos
const photoRows = [];
for (const p of products) {
  p.photos.forEach((url, idx) => {
    photoRows.push({ externalId: p.external_id, url, sortOrder: idx });
  });
}

sql += `-- 6) Photos (external_url — no MinIO upload, ${photoRows.length} rows)\n`;
sql += `INSERT INTO product_photos (product_id, external_url, sort_order)\n`;
sql += `SELECT p.id, v.url, v.sort_order\n`;
sql += `FROM (VALUES\n`;
sql += photoRows.map((ph) => (
  `  (${dollarQuote(ph.externalId)}, ${dollarQuote(ph.url)}, ${ph.sortOrder})`
)).join(',\n');
sql += `\n) AS v(external_id, url, sort_order)\n`;
sql += `JOIN products p\n`;
sql += `  ON p.external_id = v.external_id\n`;
sql += ` AND p.project_id = (SELECT id FROM projects WHERE public_id = '${PROJECT_UUID}'::uuid);\n\n`;

// 7) summary
sql += `-- 7) Summary\n`;
sql += `DO $body$\nDECLARE pc int; phc int;\nBEGIN\n`;
sql += `  SELECT count(*) INTO pc  FROM products\n`;
sql += `    WHERE project_id = (SELECT id FROM projects WHERE public_id = '${PROJECT_UUID}'::uuid);\n`;
sql += `  SELECT count(*) INTO phc FROM product_photos ph\n`;
sql += `    JOIN products p ON p.id = ph.product_id\n`;
sql += `    WHERE p.project_id = (SELECT id FROM projects WHERE public_id = '${PROJECT_UUID}'::uuid);\n`;
sql += `  RAISE NOTICE 'Seed complete: % products, % photos', pc, phc;\nEND $body$;\n\n`;

sql += `COMMIT;\n`;

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, sql, 'utf-8');

console.log(`\n✅ Generated ${OUT_PATH}`);
console.log(`   Products: ${productValues.length}`);
console.log(`   Photos:   ${photoRows.length}`);
console.log(`   Size:     ${(sql.length / 1024).toFixed(1)} KB`);

// Stats breakdown
const byCategory = {}, byGender = {}, byBrand = {};
for (const p of products) {
  byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  byGender[p.gender] = (byGender[p.gender] || 0) + 1;
  byBrand[p.brand] = (byBrand[p.brand] || 0) + 1;
}
console.log('\nBy category:', byCategory);
console.log('By gender:  ', byGender);
console.log('Top brands: ', Object.entries(byBrand).sort((a,b)=>b[1]-a[1]).slice(0,10));
