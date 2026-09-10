import type { FC } from 'react';
import { t } from '@/shared/lib/i18n';
import type { TranslationKey } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';
import { PrimaryBtn } from './PrimaryBtn';
import { StageHeading } from './StageHeading';

const BELLY_CARDS: { value: string; labelKey: TranslationKey; img: string }[] = [
  {
    value: 'flat',
    labelKey: 'widgetConfig.bellyFlat',
    img: '/widget-preview/belly-shape-female-flat.svg',
  },
  {
    value: 'medium',
    labelKey: 'widgetConfig.bellyMedium',
    img: '/widget-preview/belly-shape-female-medium.svg',
  },
  {
    value: 'gross',
    labelKey: 'widgetConfig.bellyGross',
    img: '/widget-preview/belly-shape-female-gross.svg',
  },
];

export const StageBelly: FC<StageProps> = ({ config, fontFamily }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col px-5 pt-8">
      <StageHeading
        config={config}
        title={config.belly_title}
        subtitle={config.belly_subtitle}
      />
      {/* CardSwitch — 3 cards with SVG images */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1.5 w-full">
          {BELLY_CARDS.map((card, i) => (
            <div
              key={card.value}
              className="flex-1 relative rounded-[10px] border transition-all"
              style={{
                aspectRatio: '96 / 160',
                borderColor: i === 0 ? config.text_color : 'transparent',
              }}
            >
              <img
                src={card.img}
                alt={t(locale, card.labelKey)}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity"
                style={{
                  width: '77%',
                  opacity: i === 0 ? 1 : 0.4,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      {/* Controls: arrows + label */}
      <div className="flex items-center justify-between mx-5 mt-2 mb-3">
        <div
          className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]"
          style={{
            borderColor: config.secondary_text_color + '50',
            color: config.secondary_text_color,
          }}
        >
          &larr;
        </div>
        <span
          className="text-[11px] font-medium"
          style={{ color: config.text_color }}
        >
          {t(locale, 'widgetConfig.bellyFlat')}
        </span>
        <div
          className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]"
          style={{
            borderColor: config.secondary_text_color + '50',
            color: config.secondary_text_color,
          }}
        >
          &rarr;
        </div>
      </div>
      <div className="pb-4 flex gap-2">
        <button
          className="flex-[32] flex items-center justify-center h-8 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor:
              config.color_mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e9e9e9',
            color: config.secondary_text_color,
            fontFamily,
          }}
        >
          {t(locale, 'widgetConfig.back')}
        </button>
        <PrimaryBtn config={config} fontFamily={fontFamily} className="flex-[65]">
          {t(locale, 'widgetConfig.continue')}
        </PrimaryBtn>
      </div>
    </div>
  );
};
