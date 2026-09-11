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
const OUT_DIR = path.join(ROOT, 'src/app/(landing)/sections');
const OUT_CSS = path.join(ROOT, 'src/app/(landing)/landing.generated.css');

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
      // Четвёртый шаг («получает свой размер») снят отдельной карточкой: размер
      // приходит не после примерки, а вместе с ней, и отдельный шаг растягивал
      // то, что происходит за один клик. Остаётся три.
      what: 'убрать четвёртую карточку шага',
      find: /\s*\{" "\}\n\s*<div data-r="stepcard" style=\{\{ position: "sticky", top: "120px"[\s\S]*?\n      <\/div>\n    <\/section>/,
      to: () => '\n      </div>\n    </section>'
    },
    {
      what: 'счётчик шагов → из трёх',
      find: /(ШАГ 0\d \/ )04/g,
      to: (m, head) => `${head}03`
    },
    {
      what: 'заголовок блока → три шага',
      find: /Четыре шага на странице товара/,
      to: () => 'Три шага на странице товара'
    },
    {
      // Экраны шагов: в макете картинки-заглушки 4:5, у нас — записи прохода по
      // виджету, снятые с десктопа окном 1124×912. Вертикальные записи с
      // телефона отсюда убраны сознательно: в колонке карточки телефон
      // показывался в 21% натуральной величины и интерфейс не читался.
      what: 'картинки-заглушки шагов → записи экрана с десктопа',
      find: /<div style=\{\{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "#0E1014", aspectRatio: "4\/5", minHeight: "300px" \}\}>\n(\s*)<img src="\/landing\/ru\/look-\d\.jpg" alt="Экран виджета на шаге 0(\d)"[^>]*\/>\n\s*<\/div>/g,
      to: (m, ind, n) => {
        const said = {
          1: 'Запись экрана: покупатель открывает каталог и нажимает «Примерить» на карточке платья',
          2: 'Запись экрана: покупатель выбирает своё фото в полный рост и подтверждает загрузку',
          3: 'Запись экрана: платье появляется на самом покупателе, рядом — рекомендованный размер M'
        }[n];
        return `<div className="stepmedia">\n${ind}<StepMedia step={${n}} alt="${said}" />\n${ind.slice(2)}</div>`;
      },
      imports: "import { StepMedia } from '../StepMedia';"
    },
    {
      // Третий шаг закрывает историю: человек видит вещь на себе и тут же
      // получает размер. В макете это были два разных шага, поэтому описание
      // третьего говорило про слои — про них есть отдельный блок ниже.
      what: 'описание третьего шага → примерка и размер вместе',
      find: /Не на модели, похожей на него, а на нём\. Можно добавить второй и третий слой и собрать образ целиком\./,
      to: () =>
        'Не на модели, похожей на него, а на нём. Вместе с результатом сразу приходит ' +
        'рекомендованный размер — посчитанный по замерам этого изделия, а не по общей таблице.'
    },
    {
      what: 'плашка третьего шага → размер',
      find: /(<span style=\{\{ width: "8px", height: "8px", borderRadius: "50%", background: "#8FB0FF" \}\}><\/span>\n\s*)Образ собран/,
      to: (m, head) => `${head}Ваш размер — M`
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
  S03Guess: [
    {
      // Восемь кадров угадайки. В макете это семь картинок из фотобанка,
      // причём одна повторяется дважды (look-4 стоит и на четвёртом, и на
      // восьмом месте) — в блоке, где человека просят различить кадры, это
      // особенно заметно. Ставим восемь разных.
      //
      // objectPosition 22% из макета оставлен: кадры сняты в полный рост,
      // и центр композиции у них выше середины.
      what: 'кадры угадайки → восемь разных снимков',
      find: /<img src="\/landing\/ru\/look-\d\.jpg" alt="Кадр (\d) из восьми: съёмка или примерка"/g,
      to: (m, n) => `<img src="/landing/ru/guess-${n}.webp" alt="Кадр ${n} из восьми: съёмка или примерка"`
    }
  ],
  S06WhyWorks: [
    {
      // Кадры слоёв. В макете три картинки-заглушки из фотобанка, у нас — один
      // человек в одной позе, снятый в четырёх состояниях: рубашка → плюс брюки
      // и сумка → плюс жилет → плюс пальто. Вкладок становится четыре: между
      // тремя и пятью слоями лежит тот самый случай, ради которого блок и нужен
      // — четвёртый слой ложится ПОВЕРХ рубашки, а не вместо неё.
      what: 'кадры слоёв → съёмка одного образа, четыре состояния',
      find: /<img src="\/landing\/ru\/look-3\.jpg" alt="Один человек, 1 слоя[\s\S]*?opacity: v\.lo2, transition: "opacity 500ms ease" \}\} \/>/,
      to: () => {
        const shots = [
          [1, 1, 'рубашка'],
          [2, 3, 'брюки палаццо, рубашка и сумка-хобо'],
          [3, 4, 'те же три вещи плюс трикотажный жилет'],
          [4, 5, 'те же четыре вещи плюс пальто оверсайз']
        ];
        return shots
          .map(([file, n, what], i) =>
            `<img src="/landing/ru/layer-${file}.webp" alt="Один человек в одной позе, ${n} ${{ 1: 'слой', 3: 'слоя', 4: 'слоя', 5: 'слоёв' }[n]} одежды: ${what}"` +
            ` style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", opacity: v.lo${i}, transition: "opacity 500ms ease" }} />`
          )
          .join('\n          {" "}\n          ');
      }
    },
    {
      // Пропорция кадра. В макете рамка была почти квадратной (minHeight 620) —
      // под кадрированные фотографии из фотобанка. Съёмка вертикальная, 3:4, и
      // обрезать у неё низ нельзя: длина пальто на пятом слое — это ровно то,
      // что блок доказывает. Ставим кадру его собственную пропорцию.
      //
      // minHeight при этом убираем, а не оставляем: вместе с aspect-ratio он
      // начинает задавать ШИРИНУ (620 × 3/4 = 465 px), и на телефоне кадр
      // вылезал за колонку в 358 px.
      what: 'рамка слоёв → пропорция съёмки 3:4',
      find: /(<div style=\{\{ position: "relative", borderRadius: "28px", overflow: "hidden", background: "#0E1014", )minHeight: "620px"/,
      to: (m, open) => `${open}aspectRatio: "3/4", width: "100%"`
    },
    {
      // Правая колонка тянется по высоте левого кадра, а кадр стал выше (3:4
      // вместо почти квадрата). Без распределения содержимое карточки жалось
      // кверху и снизу оставалось около 300 px пустоты — читается как сбой,
      // а не как воздух. Три блока карточки расходятся по высоте.
      what: 'карточка происхождения → распределить по высоте',
      find: /(<div style=\{\{ background: "#fff", borderRadius: "28px", padding: "clamp\(22px,2\.6vw,32px\)", display: "flex", flexDirection: "column", )gap: "20px", flex: "1"/,
      to: (m, open) => `${open}justifyContent: "space-between", gap: "20px", flex: "1"`
    },
    {
      what: 'заголовок фрейма происхождения',
      find: /Это ваш артикул DR-2041, а не похожая вещь/,
      to: () => 'Это точно ваш артикул, а не похожая вещь'
    },
    {
      // Пара «каталог / рендер». Обведён один и тот же элемент — вершина
      // полосатого канта жилета, где сходятся все шесть цветов. Проценты
      // посчитаны по кадрам: в каталожном снимке вершина на 78% высоты, в
      // рендере — на 50%, круг ставится чуть выше, чтобы в него попали сами
      // полосы, а не поле под ними.
      what: 'фото из каталога и наш рендер → кант жилета',
      find: /<img src="\/landing\/ru\/look-3\.jpg" alt="Фотография изделия DR-2041 из каталога магазина"[^>]*\/>\n(\s*)<span style=\{\{ position: "absolute", left: "44%", top: "38%"/,
      to: (m, ind) =>
        `<img src="/landing/ru/prov-catalog.webp" alt="Фотография жилета из каталога магазина: полосатый V-образный кант" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%" }} />\n${ind}<span style={{ position: "absolute", left: "50%", top: "75%"`
    },
    {
      what: 'наш рендер → тот же кант на человеке',
      find: /<img src="\/landing\/ru\/look-7\.jpg" alt="Наш рендер того же изделия на покупателе"[^>]*\/>\n(\s*)<span style=\{\{ position: "absolute", left: "52%", top: "44%"/,
      to: (m, ind) =>
        `<img src="/landing/ru/prov-render.webp" alt="Наш рендер: тот же жилет на покупателе, кант с тем же порядком полос" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%" }} />\n${ind}<span style={{ position: "absolute", left: "50%", top: "47%"`
    },
    {
      // Подпись под парой. В макете она называет принт, пуговицу и шов — под
      // фотографии платья. На жилете обведён кант, и текст обязан говорить про
      // него, иначе подпись спорит с картинкой.
      what: 'подпись под парой → то, что обведено на самом деле',
      find: /Сверьте принт, пуговицу и шов: на обоих кадрах обведён один и тот же элемент вашего изделия\./,
      to: () => 'Сверьте порядок полос и переход цвета: на обоих кадрах обведён один и тот же элемент вашего изделия.'
    }
  ],
  S07WhyNow: [
    {
      // Заголовок. Типографский приём макета сохранён: последние слова —
      // курсивной антиквой, меняются только сами слова.
      //
      // nowrap на курсивной части: без него «в» цеплялось к первой строке и
      // заголовок ломался как «Примерка переехала в / логистику». Неразрывная
      // вторая половина уезжает на строку целиком — по два слова в строке.
      what: 'заголовок блока о рынке',
      find: /\{"Мерить стало "\}\n(\s*)<span style=\{\{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: "400", fontSize: "1\.15em" \}\}>\n\s*негде\n(\s*)<\/span>/,
      to: (m, i1, i2) =>
        `{"Примерка переехала "}\n${i1}<span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: "400", fontSize: "1.15em", whiteSpace: "nowrap" }}>\n${i1}  в логистику\n${i2}</span>`
    },
    {
      // Текст. Было четыре доли процента подряд — читается как справка, а не
      // как объяснение. Стало два абзаца: куда переехала примерочная и что с
      // марта 2026 за это начали ограничивать покупателей. Под ними — ссылка
      // на разбор строкой, а не кнопкой: это не целевое действие блока.
      what: 'текст блока о рынке → два абзаца и ссылка на разбор',
      find: /<p style=\{\{ margin: "22px 0 0", maxWidth: "460px", fontSize: "17px", lineHeight: "1\.55", color: "rgba\(255,255,255,\.72\)" \}\}>\n[\s\S]*?<\/p>/,
      to: () => {
        const P = 'style={{ margin: "22px 0 0", maxWidth: "460px", fontSize: "17px", lineHeight: "1.55", color: "rgba(255,255,255,.72)" }}';
        return (
          `<p ${P}>\n` +
          `              Примерочная не исчезла — она переехала в пункт выдачи. Но там примеряют после заказа: вещь уже поехала, доставка уже оплачена, и каждая неподошедшая — оплаченный рейс туда и обратно.\n` +
          `            </p>\n` +
          `            {" "}\n` +
          `            <p ${P}>\n` +
          `              С марта 2026 Wildberries и Ozon начали ограничивать покупателей с низким выкупом. Причина названа прямо: пункты выдачи используют как бесплатную примерочную, и это слишком дорого.\n` +
          `            </p>\n` +
          `            {" "}\n` +
          // Ссылка появляется только когда разбор действительно опубликован
          // (см. whyNowHref в src/app/(landing)/journal.ts). Пока статьи нет,
          // «Читать полностью» вело на «Статья не найдена» — читателю это
          // сообщает ровно одно: тут врут.
          `            {v.whyNowHref ? (\n` +
          `              <a href={v.whyNowHref} style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "18px", minHeight: "44px", fontSize: "14px", color: "rgba(255,255,255,.6)", textDecoration: "underline", textUnderlineOffset: "3px" }}>\n` +
          `                Читать полностью →\n` +
          `              </a>\n` +
          `            ) : null}`
        );
      }
    }
  ],
  S12Journal: [
    {
      // Карточки журнала. В макете их четыре, с выдуманными заголовками и
      // ссылкой href="./MakeMeLook Article.dc.html" — то есть в бою блок вёл
      // в никуда. Подставляем настоящие статьи из того же списка, который
      // показывает /blog.
      //
      // Вёрстка не переписывается: замена берёт разметку макета как есть и
      // меняет в ней только тексты, ссылки и картинки на выражения. Три
      // маленькие карточки схлопываются в .map() по первой из них — они
      // отличались только содержимым.
      //
      // Ни одной статьи не будет — большая карточка и сетка просто не
      // отрисуются: пустой блок честнее выдуманного.
      what: 'карточки журнала → настоящие статьи',
      find: /<a className="scp5" href="\.\/MakeMeLook Article\.dc\.html"[\s\S]*?\n      <\/div>\n(?=      \{" "\}\n      <div style=\{\{ marginTop: "16px", borderRadius: "28px")/,
      to: (m) => {
        const splitAt = m.indexOf('\n      {" "}\n      <div style={{ marginTop: "16px", display: "grid"');
        if (splitAt === -1) throw new Error('S12Journal: не нашёл границу между большой карточкой и сеткой');
        let lead = m.slice(0, splitAt);
        const grid = m.slice(splitAt);

        // ── большая карточка ──────────────────────────────────────────────
        const leadSubs = [
          ['<a className="scp5" href="./MakeMeLook Article.dc.html"', '<a className="scp5" href={v.jLead.href}'],
          ['src="/landing/ru/look-6.jpg" alt="Разбор: почему размер остаётся причиной возвратов"', 'src={v.jLead.cover} alt={v.jLead.alt}'],
          ['\n                РАЗБОР\n', '\n                {v.jLead.badge}\n'],
          ['\n                9 СЕНТЯБРЯ · 11 МИН\n', '\n                {v.jLead.meta}\n'],
          ['\n              Возврат стоит дороже, чем кажется: считаем полную цену чужой неуверенности\n', '\n              {v.jLead.title}\n'],
          ['\n              Обратная логистика — только первая строка счёта. Разобрали, из чего складываются 300–1500 ₽ за один возврат, и почему магазины видят в отчётах меньшую цифру, чем платят.\n', '\n              {v.jLead.excerpt}\n']
        ];
        for (const [from, into] of leadSubs) {
          if (!lead.includes(from)) throw new Error(`S12Journal: в большой карточке нет «${from.trim().slice(0, 48)}»`);
          lead = lead.replace(from, into);
        }

        // ── три карточки помельче: берём первую как образец ────────────────
        const openGrid = '<div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "16px" }}>';
        const gi = grid.indexOf(openGrid);
        const firstStart = grid.indexOf('        <a className="scp6"', gi);
        const firstEnd = grid.indexOf('\n        </a>', firstStart);
        if (gi === -1 || firstStart === -1 || firstEnd === -1) throw new Error('S12Journal: не нашёл карточку-образец');
        let card = grid.slice(firstStart, firstEnd + '\n        </a>'.length);

        const cardSubs = [
          ['<a className="scp6" href="./MakeMeLook Article.dc.html"', '<a key={a.href} className="scp6" href={a.href}'],
          ['src="/landing/ru/look-3.jpg" alt="Как собрать размерную сетку, по которой можно считать"', 'src={a.cover} alt={a.alt}'],
          ['\n                МЕТОДИКА\n', '\n                {a.badge}\n'],
          ['\n                7 мин\n', '\n                {a.meta}\n'],
          ['\n              Как собрать размерную сетку, по которой можно считать\n', '\n              {a.title}\n'],
          ['\n              Восемь замеров, которых достаточно, и три, которые чаще всего забывают внести.\n', '\n              {a.excerpt}\n']
        ];
        for (const [from, into] of cardSubs) {
          if (!card.includes(from)) throw new Error(`S12Journal: в карточке-образце нет «${from.trim().slice(0, 48)}»`);
          card = card.replace(from, into);
        }
        // Отступ внутри .map() на два пробела глубже.
        card = card.split('\n').map((l) => (l ? '  ' + l : l)).join('\n');

        return (
          `{v.jLead ? (\n` +
          `      ${lead.trimStart()}\n` +
          `      ) : null}\n` +
          `      {" "}\n` +
          `      {v.jRest.length > 0 ? (\n` +
          `      ${openGrid}\n` +
          `${card}\n` +
          `      </div>\n` +
          `      ) : null}\n`
        )
          // Внутри условия большая карточка остаётся как была, а сетку
          // разворачиваем в .map().
          .replace(`${openGrid}\n${card}`, `${openGrid}\n        {v.jRest.map((a) => (\n${card}\n        ))}`);
      }
    }
  ],
  S10Data: [
    {
      what: 'описание блока о фото покупателя',
      find: /Покупатель загружает своё фото — значит, у вашего юриста будут вопросы по 152-ФЗ\. Отвечаем на них до того, как вы их зададите\./,
      to: () =>
        'Покупатель загружает своё фото — и делает это охотнее, когда видит, зачем оно нужно. ' +
        'Согласие берётся отдельным шагом и записывается, удалить фото можно в один тап. ' +
        'Эта часть уже собрана внутри виджета.'
    }
  ],
  S08Product: [
    {
      // Экран примерки. В макете тут была фотография из фотобанка, поверх
      // которой рисовались плашки слоёв и карточка размера. Пришёл настоящий
      // макет экрана — со своей полкой вещей слева, подписью «Верхняя одежда»
      // и каруселью снизу. Накладывать поверх него наши плашки нельзя: они
      // лягут ровно на эту полку. Показываем экран как есть.
      //
      // object-fit: contain, а не cover: это макет экрана, у него свои
      // пропорции, и обрезать у него полку или карусель — значит показать
      // не тот инструмент, про который написан текст.
      what: 'экран примерки → настоящий макет экрана',
      find: /<div style=\{\{ position: "relative", flex: "1", borderRadius: "16px", overflow: "hidden", background: "#0E1014", minHeight: "520px" \}\}>\n[\s\S]*?\n(\s*)<\/div>\n\s*<\/>\n/,
      to: (m, ind) =>
        `<div style={{ position: "relative", flex: "1", borderRadius: "16px", overflow: "hidden", background: "#0E1014", minHeight: "520px" }}>\n` +
        `${ind}  <img src="/landing/ru/product-tryon.29230598.webp" alt="Экран примерки: образ из пяти слоёв, полка вещей и каталог верхней одежды" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "contain", objectPosition: "50% 50%" }} />\n` +
        `${ind}</div>\n${ind.slice(2)}</>\n`
    },
    {
      // Подсказки чат-стилиста. В макете три кадрированные фотографии из
      // фотобанка с подписью-пилюлей. Стилист предлагает вещи из каталога,
      // значит и выглядеть это должно как карточки каталога: пакшот целиком
      // на светлом поле, название, цена. Товары и цены настоящие, из
      // демо-витрины.
      //
      // «Пальто» в подписи заменено на «Куртку»: пальто с живой фотографией
      // в каталогах нет — у проекта Malina Bonita они есть, но их снимки
      // лежат битыми ссылками в MinIO. Ставить под подпись «Пальто» снимок
      // куртки — врать в витрине.
      what: 'подсказки стилиста → карточки реальных товаров',
      find: /<div style=\{\{ display: "grid", gridTemplateColumns: "repeat\(3,1fr\)", gap: "10px", marginTop: "4px" \}\}>\n[\s\S]*?Жакет\n\s*<\/span>\n\s*<\/div>\n(\s*)<\/div>/,
      to: (m, ind) => {
        const cards = [
          ['pc-dress', 'Платье-миди', '384 000 ₽', 'ZIMMERMANN'],
          ['pc-jacket', 'Куртка', '116 000 ₽', 'ROTATE'],
          ['pc-blazer', 'Жакет', '462 000 ₽', 'TOTEME']
        ];
        const i2 = ind + '  ';
        const body = cards.map(([file, name, price, brand]) =>
          `${i2}<div className="pcard">\n` +
          `${i2}  <span className="pcard__shot">\n` +
          `${i2}    <img src="/landing/ru/${file}.webp" alt="${name} ${brand} из каталога магазина" />\n` +
          `${i2}  </span>\n` +
          `${i2}  <span className="pcard__brand">${brand}</span>\n` +
          `${i2}  <span className="pcard__name">${name}</span>\n` +
          `${i2}  <span className="pcard__price">${price}</span>\n` +
          `${i2}</div>`
        ).join('\n');
        return `<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginTop: "4px" }}>\n${body}\n${ind}</div>`;
      }
    },
    {
      what: 'капсула блока продукта',
      find: /(<span style=\{\{ display: "inline-flex", height: "28px", alignItems: "center", padding: "0 12px", borderRadius: "999px", background: "rgba\(255,255,255,\.1\)", fontSize: "12px", fontWeight: "500", color: "rgba\(255,255,255,\.75\)", whiteSpace: "nowrap" \}\}>\n\s*)Состав продукта/,
      to: (m, head) => `${head}Вы получаете`
    },
    {
      // Типографский приём макета сохранён: вторая половина заголовка светлым
      // тоном, меняются только слова.
      what: 'заголовок блока продукта',
      find: /\{"Инструменты, которые ставятся "\}\n(\s*)<span style=\{\{ fontWeight: "400", color: "#C9D6E4" \}\}>\n\s*по отдельности\n/,
      to: (m, ind) =>
        `{"Инструменты, которые "}\n${ind}<span style={{ fontWeight: "400", color: "#C9D6E4" }}>\n${ind}  работают на вас\n`
    }
  ],
  S09Connect: [
    {
      // Строка над сниппетом: слева подпись «СТРАНИЦА ТОВАРА · ОДНА СТРОКА»,
      // справа плашка «скопировать», обе с white-space: nowrap. На 390 px они
      // вдвоём не помещаются, и страница уезжает вбок на 37 px. Разрешаем
      // переносить: на широком экране строка как была, на узком плашка
      // опускается под подпись.
      what: 'строка над сниппетом → перенос на узком экране',
      find: /<div style=\{\{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" \}\}>\n(\s*)<span style=\{\{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: "\.04em", color: "rgba\(255,255,255,\.45\)", whiteSpace: "nowrap" \}\}>/,
      to: (m, ind) =>
        `<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>\n${ind}` +
        `<span style={{ fontFamily: "'Martian Mono',ui-monospace,monospace", fontSize: "12px", letterSpacing: ".04em", color: "rgba(255,255,255,.45)", whiteSpace: "nowrap" }}>`
    }
  ],
  S14Cta: [
    {
      // Подсказка при наборе телефона. Обработчик вешаем на форму, а не на
      // поле: у полей в макете нет атрибутов name, и дописывать их в
      // сгенерированную разметку — значит разойтись с макетом.
      what: 'форма заявки → подсказка при наборе',
      find: /<form onSubmit=\{v\.submit\}/,
      to: () => '<form onSubmit={v.submit} onInput={v.formInput}'
    },
    {
      // Фон блока заявки. В макете фотография покупательницы — она дублирует
      // такие же кадры выше по странице. Абстрактный свет не спорит с формой
      // и не тянет внимание на себя. alt пустой и aria-hidden: это подложка,
      // читать её вслух нечего.
      what: 'фон блока заявки',
      find: /<img src="\/landing\/ru\/look-5\.jpg" alt="Покупательница в образе, собранном примеркой" style=\{\{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" \}\} \/>/,
      to: () =>
        '<img src="/landing/ru/cta-bg.f077cc44.webp" alt="" aria-hidden="true" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%" }} />'
    },
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
  path.join(ROOT, 'src/app/(landing)/jsonld.generated.json'),
  jsonLd.join('\n') + '\n'
);

console.log(`ok: ${tops.length} секций → ${path.relative(ROOT, OUT_DIR)}`);
console.log(`   псевдоклассов: ${pseudoRules.length}`);
console.log(`   css → ${path.relative(ROOT, OUT_CSS)}`);
