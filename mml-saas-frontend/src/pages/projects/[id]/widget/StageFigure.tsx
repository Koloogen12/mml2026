import type { FC } from 'react';
import { t } from '@/shared/lib/i18n';
import type { TranslationKey } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';
import { PrimaryBtn } from './PrimaryBtn';
import { StageHeading } from './StageHeading';

const FIGURE_CARDS: { value: string; labelKey: TranslationKey; img: string }[] = [
  {
    value: 'pear',
    labelKey: 'widgetConfig.figurePear',
    img: '/widget-preview/figure-type-female-pear.png',
  },
  {
    value: 'a-line',
    labelKey: 'widgetConfig.figureALine',
    img: '/widget-preview/figure-type-female-a-line.png',
  },
  {
    value: 'rectangle',
    labelKey: 'widgetConfig.figureRectangle',
    img: '/widget-preview/figure-type-female-rectangle.png',
  },
  {
    value: 'triangle',
    labelKey: 'widgetConfig.figureTriangle',
    img: '/widget-preview/figure-type-female-triangle.png',
  },
  {
    value: 'hourglass',
    labelKey: 'widgetConfig.figureHourglass',
    img: '/widget-preview/figure-type-female-hourglass.png',
  },
  {
    value: 'apple',
    labelKey: 'widgetConfig.figureApple',
    img: '/widget-preview/figure-type-female-apple.png',
  },
];

export const StageFigure: FC<StageProps> = ({ config, fontFamily }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col px-5 pt-4">
      <StageHeading
        config={config}
        title={config.figure_title}
        subtitle={config.figure_subtitle}
      />
      {/* CardSwitch — 6 cards in 3x2 grid */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="flex flex-wrap gap-1 w-[80%]">
          {FIGURE_CARDS.map((card, i) => (
            <div
              key={card.value}
              className="relative rounded-[8px] border transition-all"
              style={{
                width: 'calc((100% - 8px) / 3)',
                aspectRatio: '3 / 4',
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
      <div className="flex items-center justify-between mx-5 mt-1 mb-2">
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
          {t(locale, 'widgetConfig.figurePear')}
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
