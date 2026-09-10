import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { t } from '@/i18n';
import { RangeSlider } from '@/components/RangeSlider';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { assetUrl } from '@/lib/utils';

export const BasicParametersStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const goNext = useWidgetStore((s) => s.goNext);
  const backTo = useWidgetStore((s) => s.backTo);
  const bodyParams = useWidgetStore((s) => s.bodyParams);
  const updateBodyParams = useWidgetStore((s) => s.updateBodyParams);

  const gender = bodyParams.gender ?? 'female';
  const isSettings = backTo === 'settings';

  return (
    <OnboardingLayout
      step={{ current: 1, total: 4 }}
      heading={t('basicParams.heading')}
      subheading={t('basicParams.subheading')}
      ctaLabel={t('basicParams.nextCta')}
      onCtaClick={() => isSettings ? goToStage('settings') : goToStage('measurements')}
      showSkip={!isSettings}
      onSkip={goNext}
    >
      {/* Gender cards */}
      <div className="mml-gender-cards">
        <div
          className={`mml-gender-card ${gender === 'female' ? 'mml-gender-card--active' : ''}`}
          onClick={() => updateBodyParams({ gender: 'female' })}
        >
          <div className="mml-gender-card__img">
            <img src={assetUrl('mannequin-female.png')} alt="" draggable={false} />
          </div>
          <span className="mml-gender-card__label">
            {t('basicParams.female')}
          </span>
        </div>
        <div
          className={`mml-gender-card ${gender === 'male' ? 'mml-gender-card--active' : ''}`}
          onClick={() => updateBodyParams({ gender: 'male' })}
        >
          <div className="mml-gender-card__img">
            <img src={assetUrl('mannequin-male.png')} alt="" draggable={false} />
          </div>
          <span className="mml-gender-card__label">
            {t('basicParams.male')}
          </span>
        </div>
      </div>

      {/* Height slider */}
      <RangeSlider
        label={t('basicParams.height')}
        unitLabel={t('common.cm')}
        min={120}
        max={210}
        value={bodyParams.height}
        onChange={(height) => updateBodyParams({ height })}
      />

      {/* Weight slider */}
      <RangeSlider
        label={t('basicParams.weight')}
        unitLabel={t('common.kg')}
        min={30}
        max={150}
        value={bodyParams.weight}
        onChange={(weight) => updateBodyParams({ weight })}
      />
    </OnboardingLayout>
  );
};
