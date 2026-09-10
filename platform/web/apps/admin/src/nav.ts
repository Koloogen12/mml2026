import type { NavKey } from "./store";

// NAV из эталона (класс Component). Иконки — inline-SVG строками, рендерятся
// через dangerouslySetInnerHTML (innerHTML в dc-разметке). star=true → золотая
// иконка «Стол стилиста». count у desk/rate вычисляется из реальных данных.
export interface NavDef {
  key: NavKey;
  label: string;
  star?: boolean;
  ico: string;
}

export const NAV: NavDef[] = [
  {
    key: "desk",
    label: "Стол стилиста",
    star: true,
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1l2.5 5.5L18 7l-4.2 4 1 6L10 14l-4.8 3 1-6L2 7l5.5-.5z"></path></svg>',
  },
  {
    key: "rate",
    label: "Разметка",
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 3h12v14l-6-3-6 3z"/></svg>',
  },
  {
    key: "sitehome",
    label: "Главная",
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8.5L10 3l7 5.5V17H3z"/><path d="M8 17v-5h4v5"/></svg>',
  },
  {
    key: "blog",
    label: "Блог",
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 3h9l3 3v11H4z"/><path d="M7 8h6M7 11h6M7 14h4"/></svg>',
  },
  {
    key: "users",
    label: "Пользователи",
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="6.5" r="3"/><path d="M4 17c0-3.3 2.7-5 6-5s6 1.7 6 5"/></svg>',
  },
  {
    key: "partners",
    label: "Партнёры",
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h14v10H3zM7 7V4h6v3"/></svg>',
  },
  {
    key: "products",
    label: "Товары",
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6l7-3 7 3-7 3zM3 6v8l7 3 7-3V6M10 9v8"/></svg>',
  },
  {
    key: "tryons",
    label: "Примерки",
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 3l3 2 3-2 4 4-2.5 2V17H5.5V9L3 7z"/></svg>',
  },
  {
    key: "consents",
    label: "Согласия",
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2l6 2.5V9c0 4.5-3 7.5-6 9-3-1.5-6-4.5-6-9V4.5z"/></svg>',
  },
  {
    key: "funnel",
    label: "Воронка",
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h14l-5 6v6l-4 2v-8z"/></svg>',
  },
  {
    key: "flags",
    label: "Флаги",
    ico: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3v14M5 4h10l-2 3 2 3H5"/></svg>',
  },
];
