import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { t } from '@/i18n';
import { assetUrl } from '@/lib/utils';

export const IntroStage: FC = () => {
  const goNext = useWidgetStore((s) => s.goNext);
  const config = useWidgetStore((s) => s.config);

  // Use admin-configured content, fallback to i18n defaults
  const heading = config?.introTitle || t('intro.heading');
  const description = config?.introDescription || t('intro.description');
  const heroImage = config?.introImage && config.introImage !== '/widget-preview/intro-bg.png'
    ? config.introImage
    : assetUrl('intro-girl-new.webp');

  return (
    <div className="mml-intro">
      {/* Full-bleed hero image */}
      <img
        className="mml-intro__hero"
        src={heroImage}
        alt=""
        draggable={false}
      />

      {/* Bottom card */}
      <div className="mml-intro__card">
        <div className="mml-intro__text">
          <h2 className="mml-intro__heading">{heading}</h2>
          <p className="mml-intro__desc">{description}</p>
        </div>
        <button
          className="mml-intro__cta"
          onClick={goNext}
        >
          <span className="mml-intro__cta-text">{t('intro.start')}</span>
          <img className="mml-intro__cta-icon" src={assetUrl('ai-sparkle.svg')} alt="" />
        </button>
      </div>
    </div>
  );
};
