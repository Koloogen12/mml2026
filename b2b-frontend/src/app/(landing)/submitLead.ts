/** Отправка заявки на существующий эндпоинт лидов (`POST /api`).
 *
 * Тот же приёмник, что у текущего лендинга: пишет в таблицу lead_requests и
 * шлёт уведомление в Telegram. Поле `site` (ссылка на каталог) добавлено ради
 * этой формы — без каталога заявку нечем обработать, по нему мы собираем
 * примерку на вещах клиента.
 */
export type LeadType = 'email' | 'tg' | 'tel';

/** Определяем тип контакта по тому, что человек ввёл в одно поле. */
export function detectContact(raw: string): { type: LeadType; data: string } {
  const v = raw.trim();
  if (v.includes('@') && v.includes('.') && !v.startsWith('@')) return { type: 'email', data: v };
  if (v.startsWith('@') || /t\.me\//i.test(v)) return { type: 'tg', data: v };
  if (/^[+\d][\d\s()\-.]{6,}$/.test(v)) return { type: 'tel', data: v.replace(/\s/g, '') };
  // Ни на что не похоже — отправляем как Telegram: оператор разберётся,
  // потерять заявку хуже, чем неверно её пометить.
  return { type: 'tg', data: v };
}


/* ───────────── Разбор и нормализация того, что ввёл человек ─────────────
 *
 * Правило одно: отклонять только то, что и правда нельзя обработать.
 * Отсутствие «https://» — не повод терять заявку: владелец магазина пишет
 * адрес так, как называет его вслух («themono.ru»), и получал в ответ
 * «Похоже, это не ссылка». Серверная проверка требует полного URL, поэтому
 * схему дописываем здесь, до отправки.
 */

/** Домен без схемы: латиница и кириллица, точка, зона от двух букв. */
const DOMAIN = /^[a-zа-яё0-9][a-zа-яё0-9-]*(\.[a-zа-яё0-9-]+)*\.[a-zа-яё]{2,}$/i;

export type FieldError = { field: 'site' | 'contact' | 'name'; message: string };

/** Приводит адрес каталога к виду, который примет сервер. */
export function normalizeSite(raw: string): { value: string } | FieldError {
  let v = raw.trim().replace(/\s+/g, '');
  if (!v) return { field: 'site', message: 'Укажите адрес каталога или сайта' };
  // Человек мог скопировать адрес вместе с «https://» — тогда ничего не делаем.
  if (!/^https?:\/\//i.test(v)) {
    // Частый случай: скопировали из адресной строки без схемы, но с путём.
    const host = v.split(/[/?#]/)[0];
    if (!DOMAIN.test(host)) {
      return { field: 'site', message: 'Похоже, это не адрес сайта. Пример: themono.ru' };
    }
    v = 'https://' + v;
  }
  try {
    const u = new URL(v);
    if (!DOMAIN.test(u.hostname)) {
      return { field: 'site', message: 'Похоже, это не адрес сайта. Пример: themono.ru' };
    }
    return { value: u.toString() };
  } catch {
    return { field: 'site', message: 'Похоже, это не адрес сайта. Пример: themono.ru' };
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-zа-яё]{2,}$/i;
const TG = /^@[a-z0-9_]{4,32}$/i;
const TG_LINK = /^(https?:\/\/)?t\.me\/[a-z0-9_]{4,32}$/i;

/** Одно поле на три вида контакта, поэтому проверяем по тому, на что похоже. */
export function validateContact(raw: string): { value: string } | FieldError {
  const v = raw.trim();
  if (!v) return { field: 'contact', message: 'Оставьте телефон, почту или Telegram' };
  if (v.startsWith('@') || /t\.me\//i.test(v)) {
    if (TG.test(v) || TG_LINK.test(v)) return { value: v };
    return { field: 'contact', message: 'Ник в Telegram выглядит так: @username' };
  }
  if (v.includes('@')) {
    if (EMAIL.test(v)) return { value: v };
    return { field: 'contact', message: 'Похоже, в почте опечатка. Пример: name@shop.ru' };
  }
  const digits = v.replace(/\D/g, '');
  if (/^[+\d]/.test(v)) {
    // Российский номер: 10 цифр без кода страны, 11 с ним.
    if (digits.length === 11 && /^[78]/.test(digits)) return { value: '+7' + digits.slice(1) };
    if (digits.length === 10) return { value: '+7' + digits };
    // Иностранный номер трогать не будем — лишь бы длина была правдоподобной.
    if (v.startsWith('+') && digits.length >= 8 && digits.length <= 15) return { value: '+' + digits };
    return { field: 'contact', message: 'Номер должен быть из 11 цифр. Пример: +7 999 123-45-67' };
  }
  return { field: 'contact', message: 'Телефон, почта или ник в Telegram — что вам удобнее' };
}

export function validateName(raw: string): { value: string } | FieldError {
  const v = raw.trim().replace(/\s+/g, ' ');
  if (v.length < 2) return { field: 'name', message: 'Как к вам обращаться?' };
  if (/^[\d\s+()-]+$/.test(v)) return { field: 'name', message: 'Здесь нужно имя, а не номер' };
  return { value: v };
}

/** Подсказка при наборе: телефон разбиваем по мере ввода, остальное не трогаем.
 *
 * Жёсткой маски здесь быть не может: в одно поле кладут и телефон, и почту, и
 * ник. Поэтому форматируем только то, что уже однозначно похоже на номер.
 */
export function formatContactInput(raw: string): string {
  if (!/^[+78]/.test(raw.trim()) || /[a-zа-яё@]/i.test(raw)) return raw;
  const d = raw.replace(/\D/g, '');
  if (d.length < 2) return raw;
  const body = (d[0] === '8' ? '7' + d.slice(1) : d).slice(0, 11);
  const p = body.slice(1);
  let out = '+7';
  if (p.length) out += ' (' + p.slice(0, 3);
  if (p.length >= 3) out += ') ' + p.slice(3, 6);
  if (p.length >= 6) out += '-' + p.slice(6, 8);
  if (p.length >= 8) out += '-' + p.slice(8, 10);
  return out;
}

export async function submitLead(input: { name: string; contact: string; site?: string }) {
  const { type, data } = detectContact(input.contact);
  const res = await fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name.trim(),
      type,
      data,
      ...(input.site?.trim() ? { site: input.site.trim() } : {})
    })
  });
  if (!res.ok) {
    let msg = 'Не удалось отправить. Попробуйте ещё раз или напишите на ceo@themono.ru';
    try {
      const body = await res.json();
      const first = Array.isArray(body?.errors) ? body.errors[0] : body?.message;
      if (typeof first === 'string') msg = first;
      else if (first?.ru) msg = first.ru;
    } catch {
      /* тело не разобралось — остаётся текст по умолчанию */
    }
    throw new Error(msg);
  }
  return res.json();
}

/** Читает поля формы по порядку следования в разметке.
 *
 * Атрибутов `name` в макете нет, а дописывать их в сгенерированную разметку —
 * значит разойтись с макетом. Порядок полей задан макетом и стабилен; если он
 * изменится, счётчик не сойдётся и мы это увидим, а не отправим мусор.
 */
export function readForm(form: HTMLFormElement, expected: number): string[] {
  const inputs = Array.from(form.querySelectorAll('input'));
  if (inputs.length !== expected) {
    throw new Error(
      `Форма изменилась: ожидалось ${expected} полей, найдено ${inputs.length}. ` +
        'Проверьте разметку макета и порядок чтения в useLandingVals.'
    );
  }
  return inputs.map((i) => i.value);
}
