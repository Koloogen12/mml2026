import type { FC } from 'react';
import { t } from '@/shared/lib/i18n';
import { useLocale } from '@/shared/lib/locale';
import type { StageProps } from './types';
import { PrimaryBtn } from './PrimaryBtn';
import { StageHeading } from './StageHeading';
import { PreviewSlider } from './PreviewSlider';

const SIZES = [
  '40',
  '42',
  '44',
  '46',
  '48',
  '50',
  '52',
  '54',
  '56',
  '58',
  '60',
];

export const StageMeasurements: FC<StageProps> = ({ config, fontFamily }) => {
  const locale = useLocale();

  return (
    <div className="flex-1 flex flex-col px-5 pt-8">
      <StageHeading
        config={config}
        title={config.measurements_title}
        subtitle={config.measurements_subtitle}
      />
      <div className="space-y-3">
        <PreviewSlider
          label={t(locale, 'widgetConfig.chestCircumference')}
          value="120"
          unit="cm"
          config={config}
          progress={0.7}
        />
        <PreviewSlider
          label={t(locale, 'widgetConfig.waistCircumference')}
          value="64"
          unit="cm"
          config={config}
          progress={0.35}
        />
        <PreviewSlider
          label={t(locale, 'widgetConfig.hipCircumference')}
          value="96"
          unit="cm"
          config={config}
          progress={0.5}
        />
      </div>
      {/* Size multi-switch — shown when size stage is enabled */}
      {config.stages_enabled.size && (
        <div className="mt-4">
          <span
            className="text-[10px] font-semibold"
            style={{ color: config.text_color }}
          >
            {t(locale, 'widgetConfig.sizeEU')}
          </span>
          <div className="flex gap-0.5 mt-1.5 overflow-x-auto mml-no-scrollbar">
            {SIZES.map((size, i) => (
              <div
                key={size}
                className="flex-shrink-0 flex items-center justify-center text-[9px] font-semibold rounded-md h-6 w-6"
                style={{
                  backgroundColor: i === 0 ? config.accent_color : 'transparent',
                  color:
                    i === 0
                      ? config.accent_text_color
                      : config.secondary_text_color,
                }}
              >
                {size}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto pb-4 flex gap-2">
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
