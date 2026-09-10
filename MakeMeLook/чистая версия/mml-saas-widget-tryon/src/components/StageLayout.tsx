import type { FC, ReactNode } from 'react';
import { useWidgetStore } from '@/store';
import { t } from '@/i18n';

interface StageLayoutProps {
  heading?: string;
  subheading?: string;
  showBack?: boolean;
  /** Step indicator: e.g. { current: 1, total: 4 } */
  step?: { current: number; total: number };
  /** Show "Skip" link on the right */
  showSkip?: boolean;
  /** Called when skip is clicked — defaults to goNext */
  onSkip?: () => void;
  children: ReactNode;
  className?: string;
}

export const StageLayout: FC<StageLayoutProps> = ({
  heading,
  subheading,
  showBack = false,
  step,
  showSkip = false,
  onSkip,
  children,
  className = '',
}) => {
  const goBack = useWidgetStore((s) => s.goBack);
  const goNext = useWidgetStore((s) => s.goNext);

  const hasNavBar = step || showSkip;

  return (
    <div className={`mml-stage-layout ${className}`}>
      {/* Header row: back + heading + skip/step */}
      {(showBack || heading) && (
        <div className="mml-stage-header">
          <div className="mml-stage-header__left">
            {showBack && (
              <button className="mml-back-btn" onClick={goBack} type="button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
          </div>
          <div className="mml-stage-header__center">
            {heading && <div className="mml-modal__heading">{heading}</div>}
          </div>
          <div className="mml-stage-header__right">
            {step && (
              <span className="mml-stage-nav-bar__step">
                {t('nav.step')} {step.current}/{step.total}
              </span>
            )}
            {showSkip && (
              <span
                className="mml-stage-nav-bar__link"
                onClick={onSkip ?? goNext}
              >
                {t('nav.skip')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Nav bar fallback for step/skip without heading */}
      {!showBack && !heading && hasNavBar && (
        <div className="mml-stage-nav-bar">
          <div className="mml-stage-nav-bar__left" />
          <div className="mml-stage-nav-bar__center">
            {step && (
              <span className="mml-stage-nav-bar__step">
                {t('nav.step')} {step.current}/{step.total}
              </span>
            )}
          </div>
          <div className="mml-stage-nav-bar__right">
            {showSkip && (
              <span className="mml-stage-nav-bar__link" onClick={onSkip ?? goNext}>
                {t('nav.skip')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Subheading */}
      {subheading && <div className="mml-modal__subheading">{subheading}</div>}

      {/* Content */}
      <div className="mml-stage-layout__content">{children}</div>
    </div>
  );
};
