import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { t, type TranslationKey } from '@/i18n';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { assetUrl } from '@/lib/utils';

/* Dashed geometric shape overlays matching Figma */
const GeometryPear: FC = () => (
  <svg className="mml-shape-card__geometry" viewBox="0 0 68 89" fill="none">
    <polygon points="14,10 54,10 64,79 4,79" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4 3" fill="none" />
  </svg>
);
const GeometryTriangle: FC = () => (
  <svg className="mml-shape-card__geometry" viewBox="0 0 68 89" fill="none">
    <polygon points="4,10 64,10 54,79 14,79" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4 3" fill="none" />
  </svg>
);
const GeometryRectangle: FC = () => (
  <svg className="mml-shape-card__geometry" viewBox="0 0 68 89" fill="none">
    <rect x="8" y="10" width="52" height="69" rx="0" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4 3" fill="none" />
  </svg>
);
const GeometryHourglass: FC = () => (
  <svg className="mml-shape-card__geometry" viewBox="0 0 68 89" fill="none">
    <path d="M8,10 L60,10 L34,49 L60,79 L8,79 L34,49 Z" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4 3" fill="none" />
  </svg>
);
const GeometryApple: FC = () => (
  <svg className="mml-shape-card__geometry" viewBox="0 0 68 89" fill="none">
    <ellipse cx="34" cy="45" rx="28" ry="32" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4 3" fill="none" />
  </svg>
);

interface FigureOption {
  value: string;
  labelKey: TranslationKey;
  imageFemale: string;
  imageMale: string;
  Geometry: FC;
}

const FIGURE_TYPES: FigureOption[] = [
  { value: 'pear', labelKey: 'figureType.pear', imageFemale: assetUrl('figure-type-female-pear.png'), imageMale: assetUrl('figure-type-male-pear.png'), Geometry: GeometryPear },
  { value: 'triangle', labelKey: 'figureType.triangle', imageFemale: assetUrl('figure-type-female-triangle.png'), imageMale: assetUrl('figure-type-male-triangle.png'), Geometry: GeometryTriangle },
  { value: 'rectangle', labelKey: 'figureType.rectangle', imageFemale: assetUrl('figure-type-female-rectangle.png'), imageMale: assetUrl('figure-type-male-rectangle.png'), Geometry: GeometryRectangle },
  { value: 'hourglass', labelKey: 'figureType.hourglass', imageFemale: assetUrl('figure-type-female-hourglass.png'), imageMale: assetUrl('figure-type-male-hourglass.png'), Geometry: GeometryHourglass },
  { value: 'apple', labelKey: 'figureType.apple', imageFemale: assetUrl('figure-type-female-apple.png'), imageMale: assetUrl('figure-type-male-apple.png'), Geometry: GeometryApple },
];

export const FigureTypeStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const goNext = useWidgetStore((s) => s.goNext);
  const backTo = useWidgetStore((s) => s.backTo);
  const bodyParams = useWidgetStore((s) => s.bodyParams);
  const updateBodyParams = useWidgetStore((s) => s.updateBodyParams);

  const selected = bodyParams.figureType ?? 'pear';
  const gender = bodyParams.gender ?? 'female';
  const isSettings = backTo === 'settings';

  return (
    <OnboardingLayout
      step={{ current: 4, total: 4 }}
      heading={t('figureType.heading')}
      subheading={t('figureType.subheading')}
      ctaLabel={t('figureType.nextCta')}
      onCtaClick={() => isSettings ? goToStage('settings') : goToStage('privacyPolicy')}
      showSkip={!isSettings}
      onSkip={goNext}
    >
      <div className="mml-shape-grid mml-shape-grid--wrap">
        {FIGURE_TYPES.map((fig) => {
          const isActive = selected === fig.value;
          return (
            <div
              key={fig.value}
              className={`mml-shape-card ${isActive ? 'mml-shape-card--active' : ''}`}
              onClick={() => updateBodyParams({ figureType: fig.value })}
            >
              <div className="mml-shape-card__img">
                <img
                  src={gender === 'male' ? fig.imageMale : fig.imageFemale}
                  alt={t(fig.labelKey)}
                  draggable={false}
                />
                <fig.Geometry />
              </div>
              <span className="mml-shape-card__label">{t(fig.labelKey)}</span>
            </div>
          );
        })}
      </div>
    </OnboardingLayout>
  );
};
