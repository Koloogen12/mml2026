import type { FC, ReactNode } from 'react';
import { useWidgetStore } from '@/store';
import { t } from '@/i18n';
import { assetUrl } from '@/lib/utils';

interface OnboardingLayoutProps {
  step: { current: number; total: number };
  heading: string;
  subheading: string;
  ctaLabel: string;
  onCtaClick: () => void;
  ctaDisabled?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
  children: ReactNode;
}

export const OnboardingLayout: FC<OnboardingLayoutProps> = ({
  step,
  heading,
  subheading,
  ctaLabel,
  onCtaClick,
  ctaDisabled,
  showSkip = true,
  onSkip,
  children,
}) => {
  const goBack = useWidgetStore((s) => s.goBack);
  const goNext = useWidgetStore((s) => s.goNext);

  return (
    <div className="mml-onboarding">
      {/* Background */}
      <div className="mml-onboarding__bg">
        <img
          className="mml-onboarding__bg-img"
          src={assetUrl('intro-bg.jpg')}
          alt=""
          draggable={false}
        />
        <img
          className="mml-onboarding__bg-girl"
          src={assetUrl('intro-girl.png')}
          alt=""
          draggable={false}
        />
        <div className="mml-onboarding__bg-overlay" />
      </div>

      {/* White card */}
      <div className="mml-onboarding__card">
        {/* Nav bar */}
        <div className="mml-onboarding__nav">
          <div className="mml-onboarding__nav-left">
            <button className="mml-onboarding__nav-back" onClick={goBack}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 4L6 8L10 12" stroke="#005ff9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t('nav.back')}</span>
            </button>
          </div>
          <div className="mml-onboarding__nav-center">
            {t('nav.step')} {step.current} /{step.total}
          </div>
          <div className="mml-onboarding__nav-right">
            {showSkip && (
              <button
                className="mml-onboarding__nav-skip"
                onClick={onSkip ?? goNext}
              >
                {t('nav.skip')}
              </button>
            )}
          </div>
        </div>

        {/* Heading */}
        <div className="mml-onboarding__header">
          <h2 className="mml-onboarding__heading">{heading}</h2>
          <p className="mml-onboarding__subheading">{subheading}</p>
        </div>

        {/* Content */}
        <div className="mml-onboarding__content">
          {children}
        </div>

        {/* CTA */}
        <div className="mml-onboarding__cta-wrap">
          <button
            className={`mml-onboarding__cta ${ctaDisabled ? 'mml-onboarding__cta--disabled' : ''}`}
            onClick={ctaDisabled ? undefined : onCtaClick}
          >
            <span className="mml-onboarding__cta-text">{ctaLabel}</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 7.5L15 10L12.5 12.5" stroke="url(#cta-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 10H15" stroke="url(#cta-grad)" strokeWidth="1.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="cta-grad" x1="5" y1="7" x2="15" y2="13">
                  <stop offset="0%" stopColor="#f5bfd7" />
                  <stop offset="33%" stopColor="#f5ffe0" />
                  <stop offset="62%" stopColor="#caefd7" />
                  <stop offset="100%" stopColor="#abc9e9" />
                </linearGradient>
              </defs>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
