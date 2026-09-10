import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { t } from '@/i18n';
import { assetUrl } from '@/lib/utils';

export const IntroStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);

  return (
    <div className="mml-intro">
      {/* Full-bleed hero image */}
      <img
        className="mml-intro__hero"
        src={assetUrl('intro-girl-new.webp')}
        alt=""
        draggable={false}
      />

      {/* Bottom card */}
      <div className="mml-intro__card">
        <div className="mml-intro__text">
          <h2 className="mml-intro__heading">{t('intro.heading')}</h2>
          <p className="mml-intro__desc">{t('intro.description')}</p>
        </div>
        <button
          className="mml-intro__cta"
          onClick={() => goToStage('gender')}
        >
          <span className="mml-intro__cta-text">{t('intro.start')}</span>
          <img className="mml-intro__cta-icon" src={assetUrl('ai-sparkle.svg')} alt="" />
        </button>
      </div>
    </div>
  );
};
