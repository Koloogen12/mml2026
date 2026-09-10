import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { t } from '@/i18n';
import { RangeSlider } from '@/components/RangeSlider';
import { OnboardingLayout } from '@/components/OnboardingLayout';

const letterToRu: Record<string, number> = {
  XXS: 38, XS: 40, S: 42, M: 44, L: 46, XL: 48, XXL: 50, XXXL: 52,
};
const ruToLetter: Record<number, string> = Object.fromEntries(
  Object.entries(letterToRu).map(([k, v]) => [v, k]),
);

function euSizeToNumeric(size: string | null): number {
  if (!size) return 44;
  const upper = size.toUpperCase();
  if (letterToRu[upper] !== undefined) return letterToRu[upper];
  const n = parseInt(size, 10);
  return isNaN(n) ? 44 : n;
}

function numericToEuSize(n: number): string {
  return ruToLetter[n] ?? String(n);
}

export const MeasurementsStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const goNext = useWidgetStore((s) => s.goNext);
  const backTo = useWidgetStore((s) => s.backTo);
  const bodyParams = useWidgetStore((s) => s.bodyParams);
  const updateBodyParams = useWidgetStore((s) => s.updateBodyParams);

  const isSettings = backTo === 'settings';

  return (
    <OnboardingLayout
      step={{ current: 2, total: 4 }}
      heading={t('measurements.heading')}
      subheading={t('measurements.subheading')}
      ctaLabel={t('measurements.nextCta')}
      onCtaClick={() => isSettings ? goToStage('settings') : goToStage('bellyShape')}
      showSkip={!isSettings}
      onSkip={goNext}
    >
      <div className="mml-measurements-sliders">
        <RangeSlider
          label={t('measurements.chest')}
          unitLabel={t('common.cm')}
          min={50}
          max={150}
          value={bodyParams.chest}
          onChange={(chest) => updateBodyParams({ chest })}
        />

        <RangeSlider
          label={t('measurements.waist')}
          unitLabel={t('common.cm')}
          min={20}
          max={100}
          value={bodyParams.waist}
          onChange={(waist) => updateBodyParams({ waist })}
        />

        <RangeSlider
          label={t('measurements.hip')}
          unitLabel={t('common.cm')}
          min={50}
          max={200}
          value={bodyParams.hip}
          onChange={(hip) => updateBodyParams({ hip })}
        />

        <RangeSlider
          label={t('measurements.clothingSize')}
          unitLabel="RU"
          min={36}
          max={60}
          step={2}
          value={euSizeToNumeric(bodyParams.euSize)}
          onChange={(v) => updateBodyParams({ euSize: numericToEuSize(v) })}
        />
      </div>
    </OnboardingLayout>
  );
};
