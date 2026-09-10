export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

// ⚠️ ЗДЕСЬ ОБЯЗАН БЫТЬ РАБОЧИЙ АДРЕС, а не пустая строка.
//
// Часть вызовов assetUrl() стоит на УРОВНЕ МОДУЛЯ — например список вариантов
// фигуры в stages/FigureTypeStage.tsx. Они вычисляются при импорте, то есть
// ДО того, как загрузчик успевает вызвать setAssetsBase. С пустым значением
// такие ссылки навсегда останутся пустыми, даже когда база проставится позже.
// Проверено на живой странице: пустой дефолт положил картинки экрана выбора
// фигуры, а в консоль ушла ошибка ещё до initWidget.
//
// Хост тот же, что и раньше: он живой и с него же отдаются widget-assets.
// Загрузчик всё равно перетрёт значение адресом из data-assets / data-api.
let _assetsBase = 'https://admin.makemelook.tech';

export function setAssetsBase(apiBaseUrl: string): void {
  _assetsBase = apiBaseUrl.replace(/\/+$/, '');
}

export function assetUrl(path: string): string {
  return `${_assetsBase}/s3/widget-assets/${path}`;
}
