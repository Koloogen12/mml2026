import type { FC } from 'react';
import { Shirt } from 'lucide-react';
import { t } from '@/shared/lib/i18n';
import type { TranslationKey } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';

const CATALOG_TAGS: TranslationKey[] = [
  'widgetConfig.all',
  'widgetConfig.shirts',
  'widgetConfig.dresses',
  'widgetConfig.jackets',
];

export const StageShowroom: FC<StageProps> = ({ config }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col relative">
      <div className="flex-1 relative bg-[#e6e6e6]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-28 rounded-xl bg-gray-300 opacity-40" />
        </div>
        {/* Cloth type selectors */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {['OW', 'T', 'B', 'S'].map((label, i) => (
            <div
              key={label}
              className="w-8 h-8 rounded-md flex items-center justify-center text-[8px] font-semibold"
              style={{
                backgroundColor: config.bg_color,
                color: i === 1 ? config.text_color : config.secondary_text_color,
                border:
                  i === 1
                    ? `1px solid ${config.accent_color}`
                    : '1px solid transparent',
                opacity:
                  config.cloth_types_enabled[
                    (['outerwear', 'tops', 'bottoms', 'shoes'] as const)[i]
                  ] || i === 1
                    ? 1
                    : 0.3,
              }}
            >
              {label}
            </div>
          ))}
        </div>
        {config.elements_enabled.favorites && (
          <div
            className="absolute right-2 bottom-[50px] w-[26px] h-[26px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex items-center justify-center"
            style={{ backgroundColor: config.bg_color }}
          >
            <span
              className="text-xs"
              style={{ color: config.secondary_text_color }}
            >
              ♡
            </span>
          </div>
        )}
      </div>
      {/* Catalog */}
      <div
        className="px-3 pt-2 pb-1 rounded-t-xl shadow-[0_-4px_16px_rgba(0,0,0,0.07)]"
        style={{ backgroundColor: config.bg_color }}
      >
        <div className="flex gap-1 mb-2 overflow-hidden">
          {CATALOG_TAGS.map((tagKey, i) => (
            <span
              key={tagKey}
              className="shrink-0 flex items-center justify-center text-[8px] font-medium h-[18px] px-2 rounded-full"
              style={{
                backgroundColor: i === 0 ? config.accent_color : 'transparent',
                color:
                  i === 0
                    ? config.accent_text_color
                    : config.secondary_text_color,
              }}
            >
              {t(locale, tagKey)}
            </span>
          ))}
        </div>
        <div className="flex gap-1 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-12 h-16 rounded-md bg-[#f8f8f8]"
              style={{
                border:
                  i === 1
                    ? `1px solid ${config.accent_color}`
                    : '1px solid #eaeaea',
              }}
            >
              <div className="w-full h-full flex items-center justify-center opacity-30">
                <Shirt
                  className="w-4 h-4"
                  style={{ color: config.secondary_text_color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        className="flex items-center justify-between px-3 h-7"
        style={{
          backgroundColor: config.bg_color,
          borderTop: `1px solid ${config.secondary_text_color}15`,
        }}
      >
        {config.elements_enabled.settings && (
          <span
            className="text-[8px] font-medium"
            style={{ color: config.secondary_text_color }}
          >
            {t(locale, 'widgetConfig.settings')}
          </span>
        )}
        <button
          type="button"
          className="h-5 px-3 rounded-[10px] text-[8px] font-medium border-none cursor-pointer ml-auto"
          style={{
            backgroundColor: config.accent_color,
            color: config.accent_text_color,
          }}
        >
          {t(locale, 'widgetConfig.tryOn')}
        </button>
      </div>
    </div>
  );
};
