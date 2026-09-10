/**
 * Ручной порт класса `Component extends DCLogic` из макета
 * design-handoff/ru-landing/MakeMeLook Landing.dc.html (блок <script type="text/x-dc">).
 *
 * Единственная часть хендоффа, которую нельзя конвертировать механически.
 * Значения и формулы перенесены один в один; изменены только пути к картинкам
 * (./looks/* → /landing/ru/*).
 *
 * Из состояния макета намеренно не перенесено то, на что в разметке нет ни одной
 * привязки (карусель образов `i`/`looks`, `revealed`, ценовые пакеты `pack`,
 * сплит-слайдер `split`, подсветка активного шага `step`) — см. отчёт.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { readForm, submitLead } from './submitLead';
import { track } from './track';

// Ползунок дёргает обработчик на каждый пиксель. Метрике важен факт «человек
// начал считать», а не тысяча событий, поэтому цель на ползунок одна.
const fired = new Set<string>();
function trackOnce(goal: string) {
  if (fired.has(goal)) return;
  fired.add(goal);
  track(goal);
}

type Kind = 'shoot' | 'tryon';

const KINDS: Kind[] = ['tryon', 'shoot', 'tryon', 'shoot', 'shoot', 'tryon', 'shoot', 'tryon'];

const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');

// Слои образа в блоке «Один человек, одна поза». Каждая вещь описана один раз:
// вкладки отличаются только тем, сколько из них надето, — в этом весь смысл
// демонстрации, вещи не подменяются от кадра к кадру. Точка — цвет самой вещи
// на снимке, чтобы плашку можно было сопоставить с картинкой глазами.
const SHIRT = { name: 'Рубашка белая с вышивкой на манжетах', dot: '#F2F0EB' };
const TROUSERS = { name: 'Брюки палаццо', dot: '#A28D6C' };
const BAG = { name: 'Сумка-хобо', dot: '#4E5236' };
const VEST = { name: 'Жилет трикотажный', dot: '#CE3A2B' };
const COAT = { name: 'Пальто оверсайз', dot: '#4B4F57' };

export type GuessCell = {
  betShoot: () => void;
  betTryon: () => void;
  betOpacity: number;
  betEvents: React.CSSProperties['pointerEvents'];
  plateOpacity: number;
  plateBg: string;
  verdict: string;
  verdictColor: string;
  seen: boolean;
};

export function useLandingVals() {
  const [bets, setBets] = useState<Record<number, Kind>>({});
  const [seen, setSeen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [pulse, setPulse] = useState(1);
  const [orders, setOrders] = useState(1000);
  const [rate, setRate] = useState(30);
  const [cost, setCost] = useState(700);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [subState, setSubState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [barsIn, setBarsIn] = useState(false);
  const [tab, setTab] = useState(0);
  const [accent, setAccent] = useState('#2F5AE6');
  const [radius, setRadius] = useState('999px');
  const [layer, setLayer] = useState(1);

  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // tick(): импульс числа при движении ползунка
  const tick = useCallback((apply: () => void) => {
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    apply();
    setPulse(1.035);
    pulseTimer.current = setTimeout(() => setPulse(1), 200);
  }, []);

  // componentDidMount(): IntersectionObserver на [data-anim] + запасной таймер
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const key = (e.target as HTMLElement).dataset.anim;
          if (key === 'chart') setBarsIn(true);
          if (key === 'guess') setSeen(true);
          io.unobserve(e.target);
        });
      },
      { rootMargin: '-10% 0px -10% 0px' }
    );
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll('[data-anim]').forEach((el) => io.observe(el));
    });
    const t = setTimeout(() => setBarsIn(true), 1200);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(t);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, []);

  const bet = useCallback((k: number, value: Kind) => {
    setBets((s) => {
      // Цель шлём один раз на карточку: повторное нажатие по той же карточке
      // не должно раздувать счётчик.
      if (s[k] === undefined) track('guess_bet', { card: k, bet: value });
      return { ...s, [k]: value };
    });
  }, []);

  return useMemo(() => {
    const month = (orders * rate) / 100 * cost;
    const year = month * 12;

    const g = (k: number): GuessCell => {
      const b = bets[k];
      const right = !!b && b === KINDS[k];
      return {
        betShoot: () => bet(k, 'shoot'),
        betTryon: () => bet(k, 'tryon'),
        betOpacity: b ? 0 : 1,
        betEvents: (b ? 'none' : 'auto') as React.CSSProperties['pointerEvents'],
        plateOpacity: b ? 1 : 0,
        plateBg: b
          ? right
            ? 'linear-gradient(180deg,rgba(14,16,20,.25) 0%,rgba(14,16,20,.92) 100%)'
            : 'linear-gradient(180deg,rgba(47,90,230,.35) 0%,rgba(23,36,58,.94) 100%)'
          : 'transparent',
        verdict: b ? (right ? 'ВЫ УГАДАЛИ' : 'НЕ УГАДАЛИ') : '',
        verdictColor: right ? '#8FB0FF' : '#fff',
        seen
      };
    };

    const barsDef: [string, string, number][] = [
      ['32%', '2023', 0.32],
      ['36%', '2024', 0.36],
      ['48%', '2026', 0.48]
    ];

    return {
      betCount: Object.keys(bets).length,
      correctCount: Object.keys(bets).filter((k) => bets[+k] === KINDS[+k]).length,
      allBet: Object.keys(bets).length === 8,
      hasBets: Object.keys(bets).length > 0,
      g0: g(0), g1: g(1), g2: g(2), g3: g(3), g4: g(4), g5: g(5), g6: g(6), g7: g(7),

      monthFmt: fmt(month),
      yearFmt: fmt(year),
      payback: Math.round(cost / 8),

      bars: barsDef.map(([label, yr, val], k) => ({
        label,
        year: yr,
        w: barsIn ? (val / 0.48) * 100 + '%' : '0%',
        thickness: k === 2 ? '28px' : '20px',
        color: k === 2 ? 'linear-gradient(90deg,#8FB0FF 0%,#2F5AE6 100%)' : 'rgba(255,255,255,.28)',
        labelColor: k === 2 ? '#8FB0FF' : '#fff',
        labelSize: k === 2 ? '26px' : '20px',
        delay: k * 140 + 'ms'
      })),

      dials: [
        {
          name: 'Заказов в месяц',
          value: fmt(orders),
          unit: '',
          raw: orders,
          min: 100,
          max: 20000,
          step: 100,
          pct: ((orders - 100) / 19900) * 100 + '%',
          minLabel: '100',
          maxLabel: '20 000',
          set: (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = +e.target.value;
            trackOnce('calc_slider_orders');
            tick(() => setOrders(value));
          }
        },
        {
          name: 'Доля возвратов',
          value: rate + '%',
          unit: '',
          raw: rate,
          min: 5,
          max: 60,
          step: 1,
          pct: ((rate - 5) / 55) * 100 + '%',
          minLabel: '5%',
          maxLabel: '60%',
          set: (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = +e.target.value;
            trackOnce('calc_slider_rate');
            tick(() => setRate(value));
          }
        },
        {
          name: 'Стоимость одного возврата',
          value: fmt(cost),
          unit: '₽',
          raw: cost,
          min: 200,
          max: 2000,
          step: 50,
          pct: ((cost - 200) / 1800) * 100 + '%',
          minLabel: '200 ₽',
          maxLabel: '2 000 ₽',
          set: (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = +e.target.value;
            trackOnce('calc_slider_cost');
            tick(() => setCost(value));
          }
        }
      ],

      lo0: layer === 0 ? 1 : 0,
      lo1: layer === 1 ? 1 : 0,
      lo2: layer === 2 ? 1 : 0,
      lo3: layer === 3 ? 1 : 0,
      layerTabs: ['1 слой', '3 слоя', '4 слоя', '5 слоёв'].map((label, k) => ({
        label,
        pick: () => {
          track('layers_switch', { layers: k });
          setLayer(k);
        },
        bg: k === layer ? '#fff' : 'rgba(18,20,23,.35)',
        color: k === layer ? '#121417' : '#fff',
        border: k === layer ? '#fff' : 'rgba(255,255,255,.3)'
      })),
      activeLayerChips: [
        [SHIRT],
        [TROUSERS, SHIRT, BAG],
        [TROUSERS, SHIRT, BAG, VEST],
        [TROUSERS, SHIRT, BAG, VEST, COAT]
      ][layer],
      layerCount: [1, 3, 4, 5][layer],
      layerNote: [
        'Одна вещь на человеке — это всё, что умеет примерка маркетплейсов',
        'Низ, верх и сумка — образ читается целиком',
        'Жилет лёг поверх рубашки, а не вместо неё — манжеты остались на месте',
        'Пять слоёв в одном образе: от базы до верхней одежды'
      ][layer],

      returnsCount: fmt((orders * rate) / 100),
      tryonYearFmt: fmt(orders * 12 * 8),
      tryonShare: Math.min(100, Math.round(((orders * 12 * 8) / Math.max(year, 1)) * 100)) + '%',
      tryonShareLabel: Math.round(((orders * 12 * 8) / Math.max(year, 1)) * 100) + '%',
      breakEven: fmt(Math.ceil((orders * 8) / Math.max(cost, 1))),
      pulse,

      situations: [
        {
          n: '01',
          title: 'Возвраты съедают то, что заработали продажи',
          quote:
            '«Продажи идут, а прибыли нет. Считаем — половина маржи уходит в обратную логистику. Вещь ездит туда-сюда, приходит помятой, часть уже нельзя продать как новую».',
          change:
            'Покупатель принимает решение до заказа, а не после получения. Возврат не происходит, потому что ошибки не было.',
          metrics: [
            { value: '30–45%', label: 'заказов возвращают в одежде', color: '#121417' },
            { value: '×2', label: 'платите за доставку туда и обратно', color: '#2F5AE6' }
          ]
        },
        {
          n: '02',
          title: 'Магазины закрылись, а онлайн не вытянул',
          quote:
            '«Сократили розницу — экономика не сходилась. Думали, покупатели перейдут на сайт. Часть перешла, но конверсия там втрое ниже. Люди привыкли мерить, а теперь негде».',
          change:
            'Сайт получает то, ради чего люди приходили в магазин, — возможность увидеть вещь на себе.',
          metrics: [
            { value: '48%', label: 'сетей сократили офлайн за год', color: '#121417' },
            { value: '57%', label: 'хотели купить и не нашли офлайн', color: '#2F5AE6' }
          ]
        },
        {
          n: '03',
          title: 'Товар дорогой, и ошибиться нельзя',
          quote:
            '«У нас платья по цене, при которой человек не станет заказывать наугад три размера. Он либо едет в салон, либо не покупает. А салон — это город, запись и время».',
          change:
            'Дорогая покупка перестаёт требовать поездки. Человек видит вещь на себе и решает дома.',
          metrics: [
            { value: '51%', label: 'не находят одежду под свою фигуру', color: '#121417' },
            { value: '1 фото', label: 'вместо поездки в салон', color: '#2F5AE6' }
          ]
        }
      ],

      compare: [
        {
          title: 'MAKEMELOOK',
          bg: '#121417',
          color: '#fff',
          mutedColor: 'rgba(255,255,255,.5)',
          line: 'rgba(255,255,255,.14)',
          rows: [
            { k: 'Слоёв одежды', v: 'до пяти' },
            { k: 'Подсказка размера', v: 'по вашей сетке' },
            { k: 'Где работает', v: 'ваш сайт' },
            { k: 'Чей товар', v: 'ваш артикул' }
          ]
        },
        {
          title: 'ПРИМЕРКА У МАРКЕТПЛЕЙСОВ',
          bg: '#fff',
          color: '#121417',
          mutedColor: '#6B7380',
          line: 'rgba(18,20,23,.08)',
          rows: [
            { k: 'Слоёв одежды', v: 'один' },
            { k: 'Подсказка размера', v: 'нет' },
            { k: 'Где работает', v: 'только их площадка' },
            { k: 'Чей товар', v: 'их каталог' }
          ]
        },
        {
          title: 'ГЕНЕРАТОРЫ КАРТИНОК',
          bg: '#fff',
          color: '#121417',
          mutedColor: '#6B7380',
          line: 'rgba(18,20,23,.08)',
          rows: [
            { k: 'Слоёв одежды', v: 'один' },
            { k: 'Подсказка размера', v: 'нет' },
            { k: 'Где работает', v: 'отдельный сервис' },
            { k: 'Чей товар', v: 'похожая вещь' }
          ]
        },
        {
          title: 'ВИДЖЕТ НА ЗАКАЗ',
          bg: '#fff',
          color: '#121417',
          mutedColor: '#6B7380',
          line: 'rgba(18,20,23,.08)',
          rows: [
            { k: 'Слоёв одежды', v: 'как сделают' },
            { k: 'Подсказка размера', v: 'своя разработка' },
            { k: 'Где работает', v: 'ваш сайт' },
            { k: 'Чей товар', v: 'ваш артикул' }
          ]
        }
      ],

      tabs: [
        'Виртуальная примерка',
        'Подсказка размера',
        'Чат-стилист',
        'Настройка под магазин',
        'Статистика'
      ].map((label, k) => ({
        label,
        n: '0' + (k + 1),
        pick: () => {
          track('product_tab', { tab: k });
          setTab(k);
        },
        bg: k === tab ? '#fff' : 'rgba(255,255,255,.08)',
        color: k === tab ? '#121417' : 'rgba(255,255,255,.72)'
      })),
      tabNum: '0' + (tab + 1),
      tabMeta: ['ДО ПЯТИ СЛОЁВ', 'ПО ВАШЕЙ СЕТКЕ', 'ПОДКЛЮЧАЕТСЯ ОТДЕЛЬНО', 'ПОД ВАШ ДИЗАЙН', 'ВАШИ ДАННЫЕ'][tab],
      tabText: [
        'Покупатель видит ваши вещи на себе. До пяти слоёв в одном образе: низ, верх, третий слой. Работает по фотографиям товара, которые у вас уже есть.',
        'Расчёт по замерам конкретного изделия и параметрам человека, с пояснением посадки: где будет свободнее, а где по фигуре.',
        'Покупатель описывает повод или задачу и получает собранный образ из вашего каталога. Подключается отдельно, если нужен.',
        'Цвета, форма и положение кнопки, тексты шагов. Виджет выглядит частью вашего сайта, а не вставкой.',
        'Сколько примерок, какие товары мерили чаще, что после примерки положили в корзину и что выкупили. Видно, окупается ли инструмент.'
      ][tab],
      isTryon: tab === 0,
      isSize: tab === 1,
      isStylist: tab === 2,
      isCustom: tab === 3,
      isStats: tab === 4,

      tryonLayers: [
        { name: 'Пальто оверсайз', dot: '#DDE3EA' },
        { name: 'Брюки прямые', dot: '#2B3340' },
        { name: 'Лоферы', dot: '#6B5A44' }
      ],
      fitRows: [
        { name: 'Плечи', value: '42 см', w: '58%', mark: '56%', color: '#2F5AE6', note: 'По фигуре — как задумано в этой модели' },
        { name: 'Грудь', value: '96 см', w: '62%', mark: '60%', color: '#2F5AE6', note: 'По фигуре, без натяжения' },
        { name: 'Талия', value: '74 см', w: '48%', mark: '56%', color: '#8FB0FF', note: 'Свободнее на 2 см' },
        { name: 'Длина', value: '118 см', w: '72%', mark: '72%', color: '#2F5AE6', note: 'До середины икры при вашем росте' }
      ],
      chat: ([
        { text: 'Нужен образ на встречу с клиентом, чтобы не выглядеть скучно', align: 'flex-end', bg: '#121417', color: '#fff', radius: '16px 16px 4px 16px' },
        { text: 'Собрала три варианта из наличия. Первый — жакет и прямые брюки, второй — платье-миди с ремнём.', align: 'flex-start', bg: '#F6F7F9', color: '#121417', radius: '16px 16px 16px 4px' },
        { text: 'Второй. Примерь на мне', align: 'flex-end', bg: '#121417', color: '#fff', radius: '16px 16px 4px 16px' },
        { text: 'Готово — на вас размер M. Показываю на трёх позициях из каталога.', align: 'flex-start', bg: '#F6F7F9', color: '#121417', radius: '16px 16px 16px 4px' }
      ] as { text: string; align: React.CSSProperties['alignSelf']; bg: string; color: string; radius: string }[]),

      swatches: ['#121417', '#3B6BFF', '#8B5E3C', '#2F6B4F', '#B03A48'].map((color) => ({
        color,
        ring: color === accent ? '#121417' : 'transparent',
        pick: () => setAccent(color)
      })),
      shapes: ([['Пилюля', '999px'], ['Скругление 10', '10px'], ['Прямой угол', '2px']] as [string, string][]).map(
        ([label, r]) => ({
          label,
          pick: () => setRadius(r),
          border: r === radius ? '#121417' : 'rgba(18,20,23,.14)',
          bg: r === radius ? '#121417' : '#fff',
          color: r === radius ? '#fff' : '#121417'
        })
      ),
      accent,
      btnRadius: radius,
      btnLabel: 'Примерить на себе',

      kpis: [
        { value: '4 812', label: 'примерок за месяц', color: '#121417' },
        { value: '38%', label: 'после примерки — в корзину', color: '#2F5AE6' },
        { value: '2 630', label: 'уникальных покупателей', color: '#121417' },
        { value: '7,4 с', label: 'среднее время результата', color: '#121417' }
      ],
      topItems: [
        { name: 'Платье-миди из плотной шерсти', tryons: '612 примерок', cart: '241 в корзину' },
        { name: 'Пальто оверсайз, белое', tryons: '474 примерки', cart: '166 в корзину' },
        { name: 'Жакет прямого кроя', tryons: '358 примерок', cart: '119 в корзину' }
      ],
      statBars: [34, 52, 41, 68, 60, 78, 72, 90, 84, 96, 88, 100].map((val, k) => ({
        h: val + '%',
        color: k > 8 ? '#2F5AE6' : 'rgba(18,20,23,.14)'
      })),

      connectSteps: [
        { n: '01', title: 'Присылаете ссылку на каталог', text: 'Мы собираем примерку на ваших товарах и показываем результат. До интеграции и без оплаты.' },
        { n: '02', title: 'Смотрите на своих вещах', text: 'Вы видите, как это выглядит на вашем ассортименте, и решаете, идём ли дальше.' },
        { n: '03', title: 'Ставим скрипт на сайт', text: 'Одна строка на страницу товара. Работает на любой платформе и на самописных сайтах.' },
        { n: '04', title: 'Загружаем размерные сетки', text: 'Ваши таблицы замеров — чтобы подсказка размера считала по вашим изделиям.' },
        { n: '05', title: 'Настраиваем вид', text: 'Подгоняем под ваш дизайн, чтобы виджет не выглядел чужим.' }
      ].map((c, k) => ({
        n: c.n,
        title: c.title,
        text: c.text,
        dot: k < 3 ? '#2F5AE6' : 'rgba(18,20,23,.2)',
        line: k < 2 ? '#2F5AE6' : 'rgba(18,20,23,.12)'
      })),
      platforms: [
        { name: 'Tilda', note: 'блок HTML' },
        { name: 'InSales', note: 'шаблон товара' },
        { name: '1С-Битрикс', note: 'компонент' },
        { name: 'CS-Cart', note: 'хук' },
        { name: 'OpenCart', note: 'модуль' },
        { name: 'Самописный', note: 'любой шаблон' }
      ],

      legal: [
        { title: 'Данные остаются вашими', text: 'Мы выступаем обработчиком по вашему поручению. Права на данные принадлежат вам и вашему покупателю, не нам.' },
        { title: 'Хранение в России', text: 'Персональные данные российских покупателей размещаются на серверах в РФ, как требует 152-ФЗ.' },
        { title: 'Фото не уходит в рекламу', text: 'Мы не передаём изображения третьим лицам и не используем их вне сервиса примерки.' },
        { title: 'Удаление по запросу', text: 'Покупатель может удалить своё фото, вы — все данные проекта. Типовой текст согласия передаём при подключении.' }
      ],

      alternatives: [
        { q: '«Сделаем подробную размерную таблицу»', answer: 'Она у вас, скорее всего, уже есть — и треть покупателей всё равно жалуется, что сетки не совпадают между брендами. Таблица требует, чтобы человек взял сантиметр и измерил себя. Почти никто этого не делает. Примерка не требует ничего, кроме фото.' },
        { q: '«Добавим больше фотографий и видео на модели»', answer: 'Фотографии показывают вещь на чужом теле. Ровно из этого и рождается «на модели сидит, на мне нет» — вторая по массовости причина возвратов после размера.' },
        { q: '«Закажем такой виджет на разработку»', answer: 'Это не вёрстка, а работа с моделями: многослойная примерка, сохранение личности человека и позы, расчёт по размерным сеткам. Дорого, долго, и результат придётся поддерживать самим. Мы этим занимаемся как продуктом.' },
        { q: '«Подождём, пока это появится у всех»', answer: 'У крупных площадок примерка уже есть — внутри их экосистем. На вашем сайте её нет ни у кого. Пока это так, она работает как отличие, а не как гигиена.' },
        { q: '«Возьмём зарубежное решение»', answer: 'Хорошие есть. Они продаются корпоративными контрактами с ценой по запросу, оплата и договор идут через иностранное юрлицо, поддержка живёт в другом часовом поясе. И ни одно из них не считает размер по вашей размерной сетке.' }
      ],

      faq: [
        { q: 'Как выглядит примерка на моём товаре?', a: 'Пришлите ссылку на каталог — соберём примерку на ваших вещах и покажем результат. Бесплатно и без интеграции: вы увидите качество на своём ассортименте, а не на подобранных примерах.' },
        { q: 'Сколько времени занимает подключение?', a: 'Скрипт ставится на страницу товара за десять минут. Загрузка размерных сеток и настройка внешнего вида — обычно один-два рабочих дня. Если своего разработчика нет, подключаем сами.' },
        { q: 'Работает ли на моей платформе?', a: 'Да — Tilda, InSales, 1С-Битрикс, CS-Cart, OpenCart и самописные сайты. Виджет подключается скриптом и не зависит от движка.' },
        { q: 'Нужно ли переснимать товар?', a: 'Нет. Работаем по фотографиям, которые у вас уже есть. Если какие-то снимки не подойдут по качеству, скажем об этом заранее и покажем, на каких позициях результат уверенный.' },
        { q: 'Что покупатель делает со своим фото?', a: 'Загружает одно фото в полный рост прямо на странице товара. Регистрация не нужна. Фото сохраняется для его следующих примерок, чтобы не загружать заново.' },
        { q: 'Насколько это снизит возвраты?', a: 'Честно: у вашего магазина это покажет только ваш магазин. Главной причиной возвратов во всех исследованиях остаётся размер — мы даём инструмент и считаем результат вместе с вами по вашей статистике.' },
        { q: 'У нас маленький магазин, это не слишком дорого?', a: 'Оплата за примерки, а не за подписку. Пока покупатели не мерили — вы не платите. Порог входа — минимальный пакет, и он окупается несколькими предотвращёнными возвратами.' },
        { q: 'Чем вы отличаетесь от примерки на маркетплейсах и зарубежных сервисов?', a: 'У маркетплейсов примерка однослойная, без расчёта размера, и работает только внутри их площадки. Зарубежные решения показывают, как вещь смотрится, но на вопрос «какой размер заказать» не отвечают. Мы считаем размер по вашей размерной сетке и работаем с магазинами без своей команды разработки.' }
      ],

      footerCols: [
        {
          title: 'ПРОДУКТ',
          links: [
            { label: 'Примерка', href: '#steps' },
            { label: 'Подсказка размера', href: '#steps' },
            { label: 'Чат-стилист', href: '#steps' },
            { label: 'Демонстрация', href: '#form' }
          ]
        },
        {
          title: 'ИНТЕГРАЦИИ',
          links: [
            { label: 'Tilda', href: '#' },
            { label: 'InSales', href: '#' },
            { label: '1С-Битрикс', href: '#' },
            { label: 'CS-Cart · OpenCart', href: '#' },
            { label: 'Документация', href: '#' }
          ]
        },
        {
          title: 'КОМПАНИЯ',
          links: [
            { label: 'Журнал', href: '#journal' },
            { label: 'О нас', href: '#' },
            { label: 'Контакты', href: '#form' },
            { label: 'Политика данных', href: '#' }
          ]
        }
      ],

      subLabel:
        subState === 'sending' ? 'Отправляем…'
        : subState === 'done' ? 'Готово'
        : subState === 'error' ? 'Ещё раз'
        : 'Подписаться',
      subscribe: async (e: React.FormEvent) => {
        e.preventDefault();
        if (subState === 'sending' || subState === 'done') return;
        const form = e.currentTarget as HTMLFormElement;
        setSubState('sending');
        try {
          const [email] = readForm(form, 1);
          // Подписка на журнал — тот же приёмник лидов. Имя обязательно на
          // стороне API, поэтому подставляем понятную оператору метку.
          await submitLead({ name: 'Подписка на журнал', contact: email });
          track('journal_subscribed');
          setSubscribed(true);
          setSubState('done');
          form.reset();
        } catch {
          setSubState('error');
        }
      },
      notSent: !sent,
      sent,
      formError,
      submitLabel: sending ? 'Отправляем…' : 'Показать на моих товарах',
      submit: async (e: React.FormEvent) => {
        e.preventDefault();
        if (sending) return;
        const form = e.currentTarget as HTMLFormElement;
        setSending(true);
        setFormError('');
        try {
          // Порядок полей задан макетом: каталог, контакт, имя.
          const [site, contact, person] = readForm(form, 3);
          await submitLead({ name: person, contact, site });
          track('lead_form_sent');
          setSent(true);
          form.reset();
        } catch (err) {
          setFormError(err instanceof Error ? err.message : 'Не удалось отправить');
        } finally {
          setSending(false);
        }
      }
    };
  }, [bets, seen, subscribed, subState, pulse, orders, rate, cost, sent, sending, formError, barsIn, tab, accent, radius, layer, bet, tick]);
}

export type LandingVals = ReturnType<typeof useLandingVals>;
