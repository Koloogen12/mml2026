'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Подложка первого экрана.
 *
 * Почему не просто <video> с двумя <source media="...">: атрибут media у
 * <source> внутри <video> браузеры игнорируют — спецификация его оттуда убрала.
 * Поэтому кадрирование выбираем в JS до того, как назначен src, и грузим
 * ровно один файл: телефон не тянет десктопный кадр и наоборот.
 *
 * Постер рисуется мгновенно, видео (около мегабайта) подгружается следом.
 * preload="auto" здесь осознанно: это первый экран, и без предзагрузки
 * браузер не подхватывает autoPlay — вместо движения человек видит постер
 * с кнопкой воспроизведения поверх.
 *
 * prefers-reduced-motion: зацикленное видео — это движение. Пользователю,
 * который просил его выключить, показываем только постер и ничего не грузим.
 * Остальная страница уже уважает эту настройку, первый экран не исключение.
 */
export function HeroMedia({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [crop, setCrop] = useState<'16x9' | '9x16' | null>(null);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotionOk(!reduce.matches);
    if (reduce.matches) return;

    const narrow = window.matchMedia('(max-width: 900px)');
    setCrop(narrow.matches ? '9x16' : '16x9');
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !crop) return;
    // Назначаем источники только после выбора кадрирования — до этого момента
    // у элемента нет src, и лишний файл не скачивается.
    v.innerHTML = '';
    for (const [type, ext] of [['video/webm', 'webm'], ['video/mp4', 'mp4']] as const) {
      const s = document.createElement('source');
      s.type = type;
      s.src = `/landing/ru/hero-${crop}.${ext}`;
      v.appendChild(s);
    }
    // Запуск. Одной попытки мало: Safari отклоняет play(), если данных ещё
    // нет или вкладка не в фокусе, и тогда рисует поверх постера свою кнопку
    // воспроизведения — на первом экране это выглядит как сломанное видео.
    // Поэтому пробуем на каждом событии, после которого запуск имеет смысл,
    // и ещё раз, когда вкладка становится видимой.
    const start = () => {
      if (!v.paused) return;
      void v.play().catch(() => {});
    };
    const events = ['loadeddata', 'canplay', 'canplaythrough'] as const;
    events.forEach((e) => v.addEventListener(e, start));
    document.addEventListener('visibilitychange', start);
    // Последняя страховка: браузер мог отклонить все попытки молча.
    const retry = setInterval(start, 1200);
    const stopRetry = setTimeout(() => clearInterval(retry), 12000);
    v.load();
    return () => {
      events.forEach((e) => v.removeEventListener(e, start));
      document.removeEventListener('visibilitychange', start);
      clearInterval(retry);
      clearTimeout(stopRetry);
    };
  }, [crop]);

  // Пока кадрирование не выбрано — постера нет. Иначе на телефоне браузер
  // успевает скачать десктопный постер, а следом нужный: 22 лишних килобайта
  // на каждом заходе с телефона.
  const poster = crop ? `/landing/ru/hero-poster-${crop}.webp` : undefined;

  return (
    <video
      ref={ref}
      poster={poster}
      autoPlay={motionOk}
      muted
      loop
      playsInline
      // Для первого экрана preload="auto": без данных браузер не подхватывает
      // autoPlay и показывает свою кнопку воспроизведения.
      preload="auto"
      aria-hidden="true"
      className={className}
      style={style}
    />
  );
}
