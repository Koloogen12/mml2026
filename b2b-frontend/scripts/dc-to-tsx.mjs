#!/usr/bin/env node
/**
 * dc-to-tsx — одноразовый детерминированный конвертер макетов Claude Design
 * (.dc.html) в TSX для Next.js.
 *
 * Что делает:
 *   • разбирает разметку внутри <x-dc>, вынимает <helmet> (шрифты, <style>, JSON-LD);
 *   • class→className, for→htmlFor, самозакрывающиеся теги, SVG-атрибуты;
 *   • style="a:b;c:d" → style={{ a: 'b', c: 'd' }} (значения — строки, clamp/calc целы);
 *   • {{ expr }} в атрибуте → JSX-выражение, в тексте → {expr};
 *   • <sc-for list="{{ xs }}" as="x"> → {xs.map((x, i) => <>…</>)};
 *   • <sc-if value="{{ cond }}"> → {cond ? <>…</> : null};
 *   • style-hover / style-focus → сгенерированные классы .scpN:hover{…!important}
 *     (та же семантика, что у рантайма макета — см. createPseudoSheet в support.js);
 *   • ./looks/* и ./assets/* → /landing/ru/*.
 *
 * Идентификаторы, не объявленные в scope цикла, префиксуются `v.` — это объект,
 * который отдаёт хук useLandingVals (ручной порт класса DCLogic).
 *
 * Запуск:  node scripts/dc-to-tsx.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'design-handoff/ru-landing/MakeMeLook Landing.dc.html');
const OUT_DIR = path.join(ROOT, 'src/app/ru/v2/sections');
const OUT_CSS = path.join(ROOT, 'src/app/ru/v2/landing.generated.css');

/* ─────────────────────────── парсер ─────────────────────────── */

const VOID = new Set([
  'area','base','br','col','embed','hr','img','input','link','meta',
  'param','source','track','wbr'
]);

function parse(html) {
  const root = { tag: '#root', attrs: [], children: [] };
  const stack = [root];
  let i = 0;
  const push = (n) => stack[stack.length - 1].children.push(n);

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { pushText(html.slice(i)); break; }
    if (lt > i) pushText(html.slice(i, lt));

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith('<!', lt)) {
      const end = html.indexOf('>', lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    if (html.startsWith('</', lt)) {
      const end = html.indexOf('>', lt);
      const name = html.slice(lt + 2, end).trim().toLowerCase();
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].tag.toLowerCase() === name) { stack.length = k; break; }
      }
      i = end + 1;
      continue;
    }

    // открывающий тег: сканируем посимвольно, чтобы не споткнуться о '>' в значении
    let j = lt + 1;
    let q = null;
    while (j < html.length) {
      const c = html[j];
      if (q) { if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === '>') break;
      j++;
    }
    const raw = html.slice(lt + 1, j);
    const selfClose = raw.endsWith('/');
    const inner = selfClose ? raw.slice(0, -1) : raw;
    const m = /^([a-zA-Z][a-zA-Z0-9:-]*)/.exec(inner);
    const tag = m ? m[1] : 'div';
    const attrs = parseAttrs(inner.slice(tag.length));
    const node = { tag, attrs, children: [] };
    push(node);
    if (!selfClose && !VOID.has(tag.toLowerCase())) stack.push(node);

    // <script>/<style>: тело — сырой текст
    const lower = tag.toLowerCase();
    if (!selfClose && (lower === 'script' || lower === 'style')) {
      const close = html.toLowerCase().indexOf(`</${lower}`, j);
      const end = close === -1 ? html.length : close;
      node.children.push({ tag: '#raw', text: html.slice(j + 1, end) });
      stack.pop();
      const gt = html.indexOf('>', end);
      i = gt === -1 ? html.length : gt + 1;
      continue;
    }
    i = j + 1;
  }
  return root;

  function pushText(t) {
    if (t === '') return;
    push({ tag: '#text', text: t });
  }
}

function parseAttrs(s) {
  const out = [];
  const re = /([a-zA-Z_@:][a-zA-Z0-9_:.-]*)(\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g;
  let m;
  while ((m = re.exec(s))) {
    const name = m[1];
    const value = m[2] === undefined ? null : (m[4] ?? m[5] ?? m[6] ?? '');
    out.push([name, value]);
  }
  return out;
}

/* ───────────────────── псевдоклассы (style-hover) ───────────────────── */

const pseudoCache = new Map();
const pseudoRules = [];
function pseudoClass(pseudo, css) {
  const key = `${pseudo}|${css}`;
  if (pseudoCache.has(key)) return pseudoCache.get(key);
  const cls = 'scp' + pseudoCache.size.toString(36);
  const isElement = pseudo === 'before' || pseudo === 'after';
  const sel = isElement ? `.${cls}::${pseudo}` : `.${cls}:${pseudo}`;
  pseudoRules.push(`${sel}{${isElement ? css : importantify(css)}}`);
  pseudoCache.set(key, cls);
  return cls;
}
function importantify(css) {
  return splitDecls(css)
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => (/!\s*important$/i.test(d) ? d : d + ' !important'))
    .join(';');
}

/** делит CSS по ';' вне скобок и кавычек */
function splitDecls(css) {
  const out = [];
  let depth = 0, q = null, start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) { out.push(css.slice(start, i)); start = i + 1; }
  }
  out.push(css.slice(start));
  return out;
}

/* ─────────────────────────── выражения ─────────────────────────── */

const RESERVED = new Set(['true', 'false', 'null', 'undefined', '$index']);

/** префиксует корневой идентификатор `v.`, если он не из scope цикла */
function expr(src, scope) {
  const e = src.trim();
  if (e === '') return 'undefined';
  if (/^-?\d+(\.\d+)?$/.test(e)) return e;
  if (/^['"]/.test(e)) return e;
  const m = /^([A-Za-z_$][A-Za-z0-9_$]*)/.exec(e);
  if (!m) return e;
  const rootId = m[1];
  if (RESERVED.has(rootId) || scope.has(rootId)) return e;
  return 'v.' + e;
}

const HOLE = /\{\{([\s\S]+?)\}\}/g;
const hasHole = (s) => s != null && s.includes('{{');

/** строка с {{ }} → JS-выражение (строка-литерал / голое выражение / шаблон) */
function interpolate(str, scope) {
  const only = /^\s*\{\{([\s\S]+?)\}\}\s*$/.exec(str);
  if (only && str.trim().startsWith('{{') && str.trim().endsWith('}}')) {
    return expr(only[1], scope);
  }
  if (!hasHole(str)) return JSON.stringify(str);
  let out = '`';
  let last = 0;
  HOLE.lastIndex = 0;
  let m;
  while ((m = HOLE.exec(str))) {
    out += tpl(str.slice(last, m.index)) + '${' + expr(m[1], scope) + '}';
    last = m.index + m[0].length;
  }
  out += tpl(str.slice(last)) + '`';
  return out;
}
const tpl = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

/* ─────────────────────────── style ─────────────────────────── */

function cssProp(p) {
  const prop = p.trim();
  if (prop.startsWith('--')) return JSON.stringify(prop);
  const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(camel) ? camel : JSON.stringify(camel);
}

function styleObject(css, scope) {
  const parts = [];
  for (const decl of splitDecls(css)) {
    const d = decl.trim();
    if (!d) continue;
    const c = d.indexOf(':');
    if (c === -1) continue;
    const prop = d.slice(0, c);
    const value = d.slice(c + 1).trim();
    parts.push(`${cssProp(prop)}: ${interpolate(value, scope)}`);
  }
  return `{ ${parts.join(', ')} }`;
}

/* ─────────────────────────── атрибуты ─────────────────────────── */

const DROP = new Set(['hint-placeholder-count', 'hint-placeholder-val', 'data-dc-tpl', 'data-om-slide-id']);
const RENAME = {
  class: 'className',
  for: 'htmlFor',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  'font-size': 'fontSize',
  'font-style': 'fontStyle',
  'text-anchor': 'textAnchor',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'stop-color': 'stopColor',
  'letter-spacing': 'letterSpacing',
  'dominant-baseline': 'dominantBaseline',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  autocomplete: 'autoComplete',
  srcset: 'srcSet',
  colspan: 'colSpan',
  rowspan: 'rowSpan'
};
const BOOLEAN = new Set(['required', 'disabled', 'checked', 'readonly', 'autofocus', 'multiple', 'selected', 'muted', 'loop', 'playsinline', 'controls', 'autoplay']);

const rewritePaths = (s) =>
  s.replace(/\.\/looks\//g, '/landing/ru/').replace(/\.\/assets\//g, '/landing/ru/');

function emitAttrs(node, scope) {
  const out = [];
  const classes = [];
  let className = null;

  for (const [rawName, rawValue] of node.attrs) {
    const name = rawName;
    const lower = name.toLowerCase();
    if (DROP.has(lower)) continue;

    if (lower === 'style-hover' || lower === 'style-focus' || lower === 'style-active' ||
        lower === 'style-before' || lower === 'style-after') {
      classes.push(pseudoClass(lower.slice(6), rawValue ?? ''));
      continue;
    }
    if (lower === 'class') { className = rawValue ?? ''; continue; }
    if (lower === 'style') {
      out.push(`style={${styleObject(rewritePaths(rawValue ?? ''), scope)}}`);
      continue;
    }
    if (rawValue === null) {
      out.push(RENAME[lower] ?? name);
      continue;
    }
    const value = rewritePaths(rawValue);
    const jsxName = RENAME[lower] ?? name;

    if (BOOLEAN.has(lower) && (value === '' || value === lower)) {
      out.push(jsxName);
      continue;
    }
    if (hasHole(value)) out.push(`${jsxName}={${interpolate(value, scope)}}`);
    else out.push(`${jsxName}=${JSON.stringify(value)}`);
  }

  if (classes.length || className != null) {
    const all = [className, ...classes].filter((x) => x != null && x !== '').join(' ');
    out.unshift(`className=${JSON.stringify(all)}`);
  }
  return out;
}

/* ─────────────────────────── эмиттер ─────────────────────────── */

const SELF_CLOSE = VOID;
let loopDepth = 0;

function isBlank(n) {
  return n.tag === '#text' && n.text.trim() === '';
}

function emitChildren(node, scope, indent) {
  const kids = node.children;
  const out = [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (isBlank(k)) {
      // рантайм макета сохраняет пробельные узлы (walkText), JSX бы их выбросил —
      // возвращаем пробел между соседями, чтобы инлайн-раскладка совпадала
      const prev = kids.slice(0, i).some((n) => !isBlank(n));
      const next = kids.slice(i + 1).some((n) => !isBlank(n));
      if (prev && next && /\s/.test(k.text)) out.push(indent + '{" "}');
      continue;
    }
    const s = emit(k, scope, indent);
    if (s) out.push(s);
  }
  return out;
}

function escapeText(t) {
  const chunks = [];
  let last = 0, m;
  HOLE.lastIndex = 0;
  while ((m = HOLE.exec(t))) {
    chunks.push(['lit', t.slice(last, m.index)]);
    chunks.push(['expr', m[1]]);
    last = m.index + m[0].length;
  }
  chunks.push(['lit', t.slice(last)]);
  return chunks;
}

function emit(node, scope, indent) {
  if (node.tag === '#raw') return null;

  if (node.tag === '#text') {
    // схлопываем перевод строки+отступ в один пробел, как это делает браузер
    const raw = node.text.replace(/\s*\n\s*/g, ' ');
    if (raw.trim() === '') return null; // пустые узлы обрабатывает emitChildren

    // Литеральный текст с краевым пробелом отдаём одной строкой-выражением:
    // JSX иначе съел бы пробел, а разбиение на два узла чуть меняет шейпинг
    // строки (соседние текстовые узлы кернятся не так, как один).
    if (!hasHole(raw) && /^\s|\s$/.test(raw)) return indent + '{' + JSON.stringify(raw) + '}';

    const lead = /^\s/.test(raw) ? '{" "}' : '';
    const trail = /\s$/.test(raw) ? '{" "}' : '';
    const chunks = escapeText(raw.trim());
    let s = '';
    for (const [kind, val] of chunks) {
      if (kind === 'expr') { s += '{' + expr(val, scope) + '}'; continue; }
      if (val === '') continue;
      // JSX + правило react/no-unescaped-entities: спецсимволы уходят в сущности,
      // фигурные скобки — в строковые выражения. Рендер при этом не меняется.
      s += val.replace(/[{}<>"']/g, (c) => {
        if (c === '{' || c === '}') return `{'${c}'}`;
        return { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    return indent + lead + s + trail;
  }

  const tag = node.tag.toLowerCase();

  if (tag === 'sc-for') {
    const listRaw = node.attrs.find(([n]) => n.toLowerCase() === 'list')?.[1] ?? '';
    const asName = node.attrs.find(([n]) => n.toLowerCase() === 'as')?.[1] ?? 'item';
    const listExpr = interpolate(listRaw, scope);
    const idx = `i${loopDepth}`;
    loopDepth++;
    const sub = new Set(scope);
    sub.add(asName);
    const body = emitChildren(node, sub, indent + '    ');
    loopDepth--;
    return (
      `${indent}{(${listExpr} ?? []).map((${asName}, ${idx}) => (\n` +
      `${indent}  <Fragment key={${idx}}>\n` +
      body.join('\n') + '\n' +
      `${indent}  </Fragment>\n` +
      `${indent}))}`
    );
  }

  if (tag === 'sc-if') {
    const valRaw = node.attrs.find(([n]) => n.toLowerCase() === 'value')?.[1] ?? '';
    const cond = interpolate(valRaw, scope);
    const body = emitChildren(node, scope, indent + '    ');
    return (
      `${indent}{(${cond}) ? (\n` +
      `${indent}  <>\n` +
      body.join('\n') + '\n' +
      `${indent}  </>\n` +
      `${indent}) : null}`
    );
  }

  if (tag === 'script' || tag === 'style' || tag === 'helmet' || tag === 'sc-helmet') return null;

  const attrs = emitAttrs(node, scope);
  const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
  const kids = emitChildren(node, scope, indent + '  ');

  if (SELF_CLOSE.has(tag) || kids.length === 0) {
    if (SELF_CLOSE.has(tag)) return `${indent}<${node.tag}${attrStr} />`;
    return `${indent}<${node.tag}${attrStr}></${node.tag}>`;
  }
  return `${indent}<${node.tag}${attrStr}>\n${kids.join('\n')}\n${indent}</${node.tag}>`;
}

/* ─────────────────────────── прогон ─────────────────────────── */

const html = fs.readFileSync(SRC, 'utf8');
const doc = parse(html);

function find(node, pred, acc = []) {
  if (pred(node)) acc.push(node);
  for (const c of node.children ?? []) find(c, pred, acc);
  return acc;
}

const xdc = find(doc, (n) => n.tag.toLowerCase() === 'x-dc')[0];
if (!xdc) throw new Error('<x-dc> не найден');
const helmet = find(xdc, (n) => n.tag.toLowerCase() === 'helmet')[0];

// helmet → ссылки на шрифты, <style> и JSON-LD
const fontImports = find(helmet, (n) => n.tag.toLowerCase() === 'link')
  .map((n) => Object.fromEntries(n.attrs))
  .filter((a) => (a.rel || '') === 'stylesheet' && /fonts\.googleapis\.com/.test(a.href || ''))
  .map((a) => `@import url('${a.href}');`);

const helmetStyle = find(helmet, (n) => n.tag.toLowerCase() === 'style')
  .map((n) => n.children.map((c) => c.text).join(''))
  .join('\n')
  .trim();
const jsonLd = find(helmet, (n) =>
  n.tag.toLowerCase() === 'script' &&
  (n.attrs.find(([a]) => a.toLowerCase() === 'type')?.[1] ?? '') === 'application/ld+json'
).map((n) => n.children.map((c) => c.text).join('').trim());

const SECTIONS = [
  'S01Hero', 'S01bCompat', 'S01cBridge', 'S02Steps', 'S03Guess', 'S04Situations',
  'S05Calc', 'S06WhyWorks', 'S07WhyNow', 'S08Product', 'S09Connect', 'S10Data',
  'S11Alternatives', 'S12Journal', 'S13Faq', 'S14Cta', 'S15Footer'
];

const tops = xdc.children.filter(
  (n) => n.tag !== '#text' && n.tag !== '#raw' &&
         !['helmet', 'sc-helmet', 'script', 'style'].includes(n.tag.toLowerCase())
);
if (tops.length !== SECTIONS.length) {
  throw new Error(`Ожидалось ${SECTIONS.length} секций, найдено ${tops.length}: ` +
    tops.map((t) => t.tag).join(', '));
}

// Точечные замены поверх сгенерированного JSX.
//
// Зачем: разметку макета мы переносим один в один, но подложка первого экрана
// в макете — картинка-заглушка, а в продакшне там видео. Держать это правкой
// руками нельзя: файлы секций генерируются, и следующий запуск конвертера её
// затрёт. Поэтому замена живёт здесь и переживает регенерацию.
//
// Если совпадений не найдено — падаем. Значит макет изменился, и замену надо
// пересмотреть, а не молча получить страницу без видео.
const OVERRIDES = {
  S01Hero: [
    {
      what: 'подложка героя: картинка-заглушка → видео',
      find: /<img src="\/landing\/ru\/hero-shot-3\.jpg"[^>]*?style=(\{\{[^}]*\}\}) \/>/,
      // objectPosition переопределяем: в макете 26% подобраны под фотографию,
      // а в видео модель стоит выше в кадре и на широком экране ей срезало
      // голову. 12% оставляют её целиком на всех пропорциях.
      to: (m, style) =>
        `<HeroMedia style={${style.slice(1, -1).replace(/objectPosition: "[^"]*"/, 'objectPosition: "50% 12%"')}} />`,
      imports: "import { HeroMedia } from '../HeroMedia';"
    },
    {
      // Карточка с интерфейсом виджета поверх первого экрана — остаток макета,
      // где подложкой была фотография. Поверх видео она закрывает половину
      // кадра, а сам виджет показан ниже по странице отдельным блоком.
      what: 'убрать карточку интерфейса поверх видео в герое',
      find: /\s*\{" "\}\n\s*<div data-r="herophone"[\s\S]*?<\/div>\n/,
      to: () => '\n'
    }
  ],
  S02Steps: [
    {
      // Экраны шагов: в макете четыре картинки-заглушки 4:5, у нас — четыре
      // записи реального прохода по виджету с телефона. Пропорции у записи
      // свои (1080×2046 после обрезки строки состояния и адресной строки),
      // поэтому меняется и рамка вокруг: см. .stepphone в landing.css.
      what: 'картинки-заглушки шагов → записи экрана',
      find: /<div style=\{\{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "#0E1014", aspectRatio: "4\/5", minHeight: "300px" \}\}>\n(\s*)<img src="\/landing\/ru\/look-\d\.jpg" alt="(Экран виджета на шаге 0(\d))"[^>]*\/>\n\s*<\/div>/g,
      to: (m, ind, alt, n) => {
        // Подпись describe-, а не «Экран виджета на шаге 03»: озвучка такой
        // строки не сообщает ничего, а запись показывает конкретное действие.
        const said = {
          1: 'Запись экрана: покупатель листает каталог и нажимает «Примерить» на карточке платья',
          2: 'Запись экрана: покупатель выбирает своё фото в полный рост и подтверждает загрузку',
          3: 'Запись экрана: виджет снимает мерки и показывает платье на самом покупателе',
          4: 'Запись экрана: виджет подсвечивает рекомендованный размер M среди размеров товара'
        }[n];
        return `<div className="stepmedia">\n${ind}<StepMedia step={${n}} alt="${said}" />\n${ind.slice(2)}</div>`;
      },
      imports: "import { StepMedia } from '../StepMedia';"
    }
  ],
  S01bCompat: [
    {
      // Настоящие логотипы платформ вместо набранных названий: строка
      // «работает на» должна читаться как факт совместимости, а текст
      // выглядит как заявление. Марки берутся официальные, с сайтов
      // самих платформ, и не перерисовываются.
      //
      // Плюс шестой пункт — самописные сайты. У них логотипа нет по
      // определению, поэтому обозначены знаком кода: виджет ставится
      // скриптом и от движка не зависит.
      what: 'названия платформ → официальные логотипы',
      find: /(\s*)<span>\n\s*Tilda\n\s*<\/span>[\s\S]*?<span>\n\s*OpenCart\n\s*<\/span>/,
      to: (m, ind) => {
        const logos = [
          ['tilda.svg', 'Tilda', 26],
          ['insales.svg', 'InSales', 22],
          ['bitrix.svg', '1С-Битрикс', 20],
          ['cscart.png', 'CS-Cart', 22],
          ['opencart.png', 'OpenCart', 20]
        ];
        const items = logos.map(([file, alt, h]) =>
          `${ind}<img src="/landing/ru/logos/${file}" alt="${alt}" height={${h}}` +
          ` style={{ height: "${h}px", width: "auto", display: "block", opacity: .78 }} />`
        ).join('');
        const custom =
          `${ind}<span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>` +
          `${ind}  <span aria-hidden="true" style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "15px", color: "#8B93A0" }}>&lt;/&gt;</span>` +
          `${ind}  самописные сайты` +
          `${ind}</span>`;
        return items + custom;
      }
    }
  ],
  S14Cta: [
    {
      // Состояние отправки. В макете подпись кнопки статична, потому что там
      // форма ничего не отправляет. У нас отправляет — и человек должен
      // видеть, что запрос ушёл, иначе он жмёт кнопку второй раз.
      what: 'подпись кнопки заявки → состояние отправки',
      find: /(<button className="scp8" type="submit"[^>]*>)\n(\s*)Показать на моих товарах\n/,
      to: (m, open, ind) => `${open}\n${ind}{v.submitLabel}\n`
    },
    {
      // Строка ошибки. AUDIT.md прямо требует состояние ошибки на вёрстке;
      // в макете его нет, потому что там нет и отправки. Появляется только
      // когда есть что показать, поэтому вёрстку в обычном состоянии не двигает.
      what: 'строка ошибки под кнопкой заявки',
      find: /(<span style=\{\{ fontSize: "12px", color: "#6B7380", textAlign: "center" \}\}>)/,
      to: (m, open) =>
        `{v.formError ? (\n` +
        `                  <span role="alert" style={{ fontSize: "13px", color: "#B3261E", textAlign: "center" }}>\n` +
        `                    {v.formError}\n` +
        `                  </span>\n` +
        `                ) : null}\n                ${open}`
    }
  ]
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const header = `/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Источник: design-handoff/ru-landing/MakeMeLook Landing.dc.html */\n`;

tops.forEach((node, k) => {
  const name = SECTIONS[k];
  const scope = new Set();
  let body = emit(node, scope, '    ');
  const extraImports = [];
  for (const rule of OVERRIDES[name] ?? []) {
    if (!rule.find.test(body)) {
      throw new Error(`Замена не сработала в ${name} (${rule.what}) — макет изменился?`);
    }
    body = body.replace(rule.find, rule.to);
    if (rule.imports) extraImports.push(rule.imports);
  }
  const usesFragment = body.includes('<Fragment');
  const imports = usesFragment
    ? `import { Fragment } from 'react';\n\nimport type { LandingVals } from '../useLandingVals';\n`
    : `import type { LandingVals } from '../useLandingVals';\n`;
  // noUnusedParameters: секции без единой привязки принимают проп под именем _props
  const usesVals = /\bv\./.test(body);
  const signature = usesVals ? '{ v }: { v: LandingVals }' : '_props: { v: LandingVals }';
  const src =
    header + '\n' + imports + (extraImports.length ? extraImports.join('\n') + '\n' : '') + '\n' +
    `export function ${name}(${signature}) {\n` +
    `  return (\n${body}\n  );\n}\n`;
  fs.writeFileSync(path.join(OUT_DIR, `${name}.tsx`), src);
});

// индекс секций
fs.writeFileSync(
  path.join(OUT_DIR, 'index.ts'),
  header + '\n' + SECTIONS.map((s) => `export { ${s} } from './${s}';`).join('\n') + '\n'
);

// CSS: блок из <helmet> + сгенерированные псевдоклассы
const css =
  // @import обязан стоять первым в файле, иначе браузер его игнорирует:
  // webpack инлайнит локальные @import выше удалённых, поэтому шрифты живут здесь,
  // а не в landing.css
  fontImports.join('\n') + '\n\n' +
  `/* СГЕНЕРИРОВАНО scripts/dc-to-tsx.mjs — не править руками.
   Шрифты — те же, что в <helmet> макета. */\n\n` +
  `/* <style> из <helmet> макета, один в один */\n` +
  helmetStyle + '\n\n' +
  `/* style-hover / style-focus: та же схема, что у рантайма макета */\n` +
  pseudoRules.join('\n') + '\n';
fs.writeFileSync(OUT_CSS, css);

// JSON-LD для страницы
fs.writeFileSync(
  path.join(ROOT, 'src/app/ru/v2/jsonld.generated.json'),
  jsonLd.join('\n') + '\n'
);

console.log(`ok: ${tops.length} секций → ${path.relative(ROOT, OUT_DIR)}`);
console.log(`   псевдоклассов: ${pseudoRules.length}`);
console.log(`   css → ${path.relative(ROOT, OUT_CSS)}`);
