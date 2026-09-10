import type { FC } from 'react';
import { Shirt, Heart } from 'lucide-react';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';

export const StageTryonResult: FC<StageProps> = ({ config }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Result with "generated" look */}
      <div className="flex-1 relative bg-[#e6e6e6]">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Simulated person with outfit */}
          <div className="relative">
            {/* Head */}
            <div className="w-8 h-8 rounded-full mx-auto mb-0.5 bg-[#d4b896]" />
            {/* Top garment */}
            <div
              className="w-16 h-12 rounded-t-lg mx-auto"
              style={{ backgroundColor: config.accent_color + '60' }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <Shirt
                  className="w-5 h-5"
                  style={{ color: config.accent_text_color + '80' }}
                />
              </div>
            </div>
            {/* Bottom garment */}
            <div className="w-14 h-14 rounded-b-lg mx-auto -mt-0.5 bg-[#4a5568]" />
            {/* Legs */}
            <div className="flex justify-center gap-1">
              <div className="w-3 h-8 rounded-b bg-[#d4b896]" />
              <div className="w-3 h-8 rounded-b bg-[#d4b896]" />
            </div>
          </div>
        </div>

        {/* "AI Generated" badge */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[7px] font-semibold"
          style={{
            backgroundColor: config.accent_color,
            color: config.accent_text_color,
          }}
        >
          {t(locale, 'widgetConfig.aiTryOn')}
        </div>

        {/* Favorite button */}
        {config.elements_enabled.favorites && (
          <div
            className="absolute right-2 bottom-3.5 w-[26px] h-[26px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex items-center justify-center"
            style={{ backgroundColor: config.bg_color }}
          >
            <Heart className="w-3 h-3 text-[#e74c3c] fill-[#e74c3c]" />
          </div>
        )}

        {/* Cloth type selectors */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {['OW', 'T', 'B'].map((label, i) => (
            <div
              key={label}
              className="w-8 h-8 rounded-md flex items-center justify-center text-[8px] font-semibold"
              style={{
                backgroundColor: config.bg_color,
                color: i < 2 ? config.text_color : config.secondary_text_color,
                border:
                  i < 2
                    ? `1px solid ${config.accent_color}`
                    : '1px solid transparent',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div
        className="flex items-center justify-between px-3 gap-2 h-9"
        style={{
          backgroundColor: config.bg_color,
          borderTop: `1px solid ${config.secondary_text_color}15`,
        }}
      >
        <button
          type="button"
          className="h-[22px] px-2.5 rounded-[11px] text-[8px] font-medium border-none cursor-pointer"
          style={{
            backgroundColor: config.secondary_text_color + '15',
            color: config.secondary_text_color,
          }}
        >
          {t(locale, 'widgetConfig.newOutfit')}
        </button>
        <button
          type="button"
          className="h-[22px] px-3.5 rounded-[11px] text-[8px] font-medium border-none cursor-pointer"
          style={{
            backgroundColor: config.accent_color,
            color: config.accent_text_color,
          }}
        >
          {t(locale, 'widgetConfig.addToCart')}
        </button>
      </div>
    </div>
  );
};
