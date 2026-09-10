import { type FC, useState, useEffect } from 'react';
import { t } from '@/i18n';
import logoSymbol from '@/assets/img/logo-symbol.svg';

// Phrases shown one at a time during a try-on wait. They rotate every
// PHRASE_INTERVAL ms with a fade-in transition (see the keyed <p> below).
//
// Order matters narratively: we open with the "doing-real-work" phrases
// ("snimaem merki", "kroim izdelie") to set expectations that something
// concrete is happening, then transition to the honest-disclaimer phrases
// ("ещё учимся...") so the customer mentally prepares for the chance of
// imperfect output. Keep the disclaimers in the back half of the list.
const PHRASE_KEYS = [
  'loading.measuring',
  'loading.cutting',
  'loading.fitting',
  'loading.adjusting',
  'loading.learning',
  'loading.almostReady',
  'loading.handCrafted',
  'loading.finishing',
] as const;

const PHRASE_INTERVAL = 3000;

/** iOS-style spinner dots */
const SpinnerDots: FC = () => (
  <div className="relative size-[20px] animate-spin" style={{ animationDuration: '1s' }}>
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
      <div
        key={deg}
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[3px] h-[5px] rounded-[900px]"
        style={{
          transform: `rotate(${deg}deg) translateY(0px)`,
          transformOrigin: '50% 10px',
          background: '#d9d9d9',
          opacity: 0.25 + (i / 8) * 0.75,
        }}
      />
    ))}
  </div>
);

export const TryOnLoader: FC = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % PHRASE_KEYS.length);
    }, PHRASE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[20px] backdrop-blur-[12px] bg-black/40 rounded-[var(--mml-radius)]">
      {/* Logo symbol */}
      <div className="size-[63px]">
        <img
          src={logoSymbol}
          alt=""
          className="size-full brightness-[10] opacity-90"
        />
      </div>

      {/* Spinner + phrase */}
      <div className="flex items-center gap-[12px]">
        <SpinnerDots />
        <p
          key={phraseIndex}
          className="font-['Inter',sans-serif] font-normal text-[13px] leading-[18px] text-[#f6f6f6] whitespace-nowrap animate-[mml-tryon-fade-in_0.4s_ease-out]"
        >
          {t(PHRASE_KEYS[phraseIndex] as any)}
        </p>
      </div>
    </div>
  );
};
