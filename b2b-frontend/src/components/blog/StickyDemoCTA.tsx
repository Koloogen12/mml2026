import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";

export const StickyDemoCTA = () => {
  const [show, setShow] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const ratio = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      setShow(ratio > 0.25 && ratio < 0.95);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (closed || !show) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 hidden md:block">
      <div className="pointer-events-auto flex items-center gap-3 rounded-[100px] bg-brand-cta py-2 pl-5 pr-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
        <span className="text-[13px] font-medium text-white">Хотите такие же результаты?</span>
        <a
          href="/#cta"
          className="inline-flex h-[36px] items-center gap-1.5 rounded-[100px] bg-white px-4 text-[13px] font-medium text-brand-cta transition-colors duration-200 hover:bg-brand-accent hover:text-white"
        >
          Демо <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          aria-label="Закрыть"
          onClick={() => setClosed(true)}
          className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
