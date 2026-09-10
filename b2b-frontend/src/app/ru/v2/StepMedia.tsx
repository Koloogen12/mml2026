'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Экран виджета в блоке «Четыре шага» — запись реального прохода, а не картинка.
 *
 * Почему не GIF: та же запись в GIF весит в 12 раз больше при вдвое меньшей
 * частоте кадров и 128 цветах (замер на третьем шаге: 545 кБ против 44 кБ).
 * Зацикленное видео без звука ведёт себя так же, а стоит как картинка.
 *
 * Грузим лениво и по одному: src назначается только когда карточка подошла к
 * экрану. Четыре ролика в секции — это четыре запроса, и делать их на входе на
 * страницу незачем, блок лежит ниже первого экрана. Постер ждёт того же
 * момента: атрибут poster браузер качает сразу, а это ещё 77 кБ на входе за
 * блок, до которого человек может и не дойти. Пустая рамка до этого не видна —
 * фон у неё тот же, что у карточки.
 *
 * Играет тоже только видимое: ушло из вида — ставим на паузу, иначе четыре
 * decode-цикла крутятся на фоне и греют телефон.
 *
 * prefers-reduced-motion: показываем постер и не грузим видео вовсе — как в
 * первом экране.
 */
export function StepMedia({ step, alt }: { step: 1 | 2 | 3 | 4; alt: string }) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    // Зацикленное видео — это движение: кому оно выключено, остаётся постер.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = box.current;
    if (!el) return;

    // rootMargin: начинаем грузить за пол-экрана до появления, чтобы к моменту
    // прокрутки первый кадр уже был готов и не мигал постером.
    const io = new IntersectionObserver(
      ([e]) => {
        const v = video.current;
        if (e.isIntersecting) {
          setArmed(true);
          if (v?.src || v?.firstChild) void v.play().catch(() => {});
        } else {
          v?.pause();
        }
      },
      { rootMargin: '50% 0px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v || !armed) return;
    v.innerHTML = '';
    for (const [type, ext] of [
      ['video/webm', 'webm'],
      ['video/mp4', 'mp4']
    ] as const) {
      const s = document.createElement('source');
      s.type = type;
      s.src = `/landing/ru/step-${step}.${ext}`;
      v.appendChild(s);
    }
    const start = () => void v.play().catch(() => {});
    v.addEventListener('canplay', start, { once: true });
    v.load();
    return () => v.removeEventListener('canplay', start);
  }, [armed, step]);

  return (
    <div ref={box} className="stepphone">
      <video
        ref={video}
        className="stepphone__screen"
        poster={armed ? `/landing/ru/step-${step}-poster.webp` : undefined}
        muted
        loop
        playsInline
        preload="none"
        aria-label={alt}
        role="img"
      />
    </div>
  );
}
