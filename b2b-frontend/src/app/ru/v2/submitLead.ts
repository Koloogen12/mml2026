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
