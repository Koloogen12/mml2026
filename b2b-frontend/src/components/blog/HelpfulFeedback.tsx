import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";

export const HelpfulFeedback = () => {
  const [v, setV] = useState<null | "up" | "down">(null);
  return (
    <div className="mt-12 flex flex-col items-center gap-3 rounded-[24px] bg-white p-6 text-center">
      <div className="text-[14px] font-medium text-brand-ink">Было полезно?</div>
      {v ? (
        <div className="inline-flex items-center gap-2 text-[13px] text-brand-muted">
          <Check className="h-4 w-4 text-emerald-600" /> Спасибо за фидбек!
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setV("up")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-ink transition-colors duration-200 hover:bg-brand-accent hover:text-white"
            aria-label="Полезно"
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setV("down")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-ink transition-colors duration-200 hover:bg-brand-accent hover:text-white"
            aria-label="Не полезно"
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
