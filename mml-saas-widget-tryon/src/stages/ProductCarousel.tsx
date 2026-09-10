import { useCallback, useEffect, useRef, useState } from 'react';

// Horizontally-scrolling product strip with overlay left/right arrow
// buttons. Buttons appear only when they'd do something — i.e. hide
// the left arrow at scrollLeft === 0 and the right arrow at the end.

const SCROLL_STEP = 240; // roughly two 98-wide cards + their gap

export function ProductCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 2);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = ref.current;
    if (!el) return;
    // Re-check arrow visibility when the content or container resizes
    // (e.g. category switch changes the number of product cards).
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);
    return () => ro.disconnect();
  }, [children, updateArrows]);

  const scrollBy = (dx: number) => {
    ref.current?.scrollBy({ left: dx, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex gap-[8px] overflow-x-auto pb-[4px] scrollbar-hide scroll-smooth"
        onScroll={updateArrows}
        onWheel={(e) => {
          if (e.deltaY === 0) return;
          e.currentTarget.scrollLeft += e.deltaY;
        }}
      >
        {children}
      </div>

      {canLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy(-SCROLL_STEP)}
          className="absolute left-[-4px] top-1/2 -translate-y-1/2 z-[3] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] cursor-pointer hover:bg-[#f6f6f6]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollBy(SCROLL_STEP)}
          className="absolute right-[-4px] top-1/2 -translate-y-1/2 z-[3] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] cursor-pointer hover:bg-[#f6f6f6]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
