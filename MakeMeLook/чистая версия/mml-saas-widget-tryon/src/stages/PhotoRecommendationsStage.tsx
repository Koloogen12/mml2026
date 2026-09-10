import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { t } from '@/i18n';
import { assetUrl } from '@/lib/utils';

const CheckBadge: FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect width="20" height="20" rx="4" fill="#22c55e" />
    <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XBadge: FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect width="20" height="20" rx="4" fill="#ef4444" />
    <path d="M7 7l6 6M13 7l-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

interface Example {
  src: string;
  good: boolean;
}

interface Tip {
  titleKey: string;
  descKey: string;
  examples: Example[];
}

const TIPS: Tip[] = [
  {
    titleKey: 'photoRec.tip1Title',
    descKey: 'photoRec.tip1Desc',
    examples: [
      { src: assetUrl('photo-rec-1-good-1.jpg'), good: true },
      { src: assetUrl('photo-rec-1-good-2.jpg'), good: true },
      { src: assetUrl('photo-rec-1-bad-1.jpg'), good: false },
      { src: assetUrl('photo-rec-1-bad-2.jpg'), good: false },
    ],
  },
  {
    titleKey: 'photoRec.tip2Title',
    descKey: 'photoRec.tip2Desc',
    examples: [
      { src: assetUrl('photo-rec-2-good-1.jpg'), good: true },
      { src: assetUrl('photo-rec-2-good-2.jpg'), good: true },
      { src: assetUrl('photo-rec-2-bad-1.jpg'), good: false },
      { src: assetUrl('photo-rec-1-bad-2.jpg'), good: false },
    ],
  },
  {
    titleKey: 'photoRec.tip3Title',
    descKey: 'photoRec.tip3Desc',
    examples: [
      { src: assetUrl('photo-rec-3-good-1.jpg'), good: true },
      { src: assetUrl('photo-rec-2-good-2.jpg'), good: true },
      { src: assetUrl('photo-rec-2-bad-1.jpg'), good: false },
      { src: assetUrl('photo-rec-3-bad-1.jpg'), good: false },
    ],
  },
  {
    titleKey: 'photoRec.tip4Title',
    descKey: 'photoRec.tip4Desc',
    examples: [
      { src: assetUrl('photo-rec-4-good-1.jpg'), good: true },
      { src: assetUrl('photo-rec-4-good-2.jpg'), good: true },
      { src: assetUrl('photo-rec-4-bad-1.jpg'), good: false },
      { src: assetUrl('photo-rec-4-bad-2.jpg'), good: false },
    ],
  },
];

export const PhotoRecommendationsStage: FC = () => {
  const goBack = useWidgetStore((s) => s.goBack);

  return (
    <div className="mml-photo-rec">
      <button className="mml-photo-rec__back" onClick={goBack}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 5L7.5 10L12.5 15" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="mml-photo-rec__content">
        <h2 className="mml-photo-rec__title">{t('photoRec.heading')}</h2>

        {TIPS.map((tip, i) => (
          <div key={i} className="mml-photo-rec__section">
            <div className="mml-photo-rec__section-header">
              <h3 className="mml-photo-rec__section-title">
                {i + 1}. {t(tip.titleKey as any)}
              </h3>
              <p className="mml-photo-rec__section-desc">{t(tip.descKey as any)}</p>
            </div>
            <div className="mml-photo-rec__grid">
              {tip.examples.map((ex, j) => (
                <div key={j} className="mml-photo-rec__example">
                  <img className="mml-photo-rec__example-img" src={ex.src} alt="" draggable={false} />
                  <div className="mml-photo-rec__badge">
                    {ex.good ? <CheckBadge /> : <XBadge />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
