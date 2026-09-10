import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { t, type TranslationKey } from '@/i18n';
import { OnboardingLayout } from '@/components/OnboardingLayout';

import bellyFemaleFlatImg from '@/assets/img/belly-shape-female-flat.svg';
import bellyFemaleMediumImg from '@/assets/img/belly-shape-female-medium.svg';
import bellyFemaleGrossImg from '@/assets/img/belly-shape-female-gross.svg';
import bellyMaleFlatImg from '@/assets/img/belly-shape-male-flat.svg';
import bellyMaleMediumImg from '@/assets/img/belly-shape-male-medium.svg';
import bellyMaleGrossImg from '@/assets/img/belly-shape-male-gross.svg';

interface BellyOption {
  value: string;
  labelKey: TranslationKey;
  imageFemale: string;
  imageMale: string;
}

const BELLY_SHAPES: BellyOption[] = [
  { value: 'flat', labelKey: 'bellyShape.flat', imageFemale: bellyFemaleFlatImg, imageMale: bellyMaleFlatImg },
  { value: 'medium', labelKey: 'bellyShape.medium', imageFemale: bellyFemaleMediumImg, imageMale: bellyMaleMediumImg },
  { value: 'gross', labelKey: 'bellyShape.gross', imageFemale: bellyFemaleGrossImg, imageMale: bellyMaleGrossImg },
];

export const BellyShapeStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const goNext = useWidgetStore((s) => s.goNext);
  const backTo = useWidgetStore((s) => s.backTo);
  const bodyParams = useWidgetStore((s) => s.bodyParams);
  const updateBodyParams = useWidgetStore((s) => s.updateBodyParams);

  const selected = bodyParams.bellyShape ?? 'flat';
  const gender = bodyParams.gender ?? 'female';
  const isSettings = backTo === 'settings';
  const config = useWidgetStore((s) => s.config);

  return (
    <OnboardingLayout
      step={{ current: 3, total: 4 }}
      heading={config?.bellyTitle || t('bellyShape.heading')}
      subheading={config?.bellySubtitle || t('bellyShape.subheading')}
      ctaLabel={t('bellyShape.nextCta')}
      onCtaClick={() => isSettings ? goToStage('settings') : goNext()}
      showSkip={!isSettings}
      onSkip={goNext}
    >
      <div className="mml-shape-grid">
        {BELLY_SHAPES.map((shape) => {
          const isActive = selected === shape.value;
          return (
            <div
              key={shape.value}
              className={`mml-shape-card ${isActive ? 'mml-shape-card--active' : ''}`}
              onClick={() => updateBodyParams({ bellyShape: shape.value })}
            >
              <div className="mml-shape-card__img">
                <img
                  src={gender === 'male' ? shape.imageMale : shape.imageFemale}
                  alt={t(shape.labelKey)}
                  draggable={false}
                />
              </div>
              <span className="mml-shape-card__label">{t(shape.labelKey)}</span>
            </div>
          );
        })}
      </div>
    </OnboardingLayout>
  );
};
