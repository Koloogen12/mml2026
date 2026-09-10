import type { FC } from 'react';
import { t } from '@/i18n';

interface StageNavProps {
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  withBack?: boolean;
}

export const StageNav: FC<StageNavProps> = ({
  onBack,
  onNext,
  backLabel,
  nextLabel,
  nextDisabled = false,
  withBack = true,
}) => {
  const resolvedBack = backLabel ?? t('common.back');
  const resolvedNext = nextLabel ?? t('common.continue');

  // When navigating from settings (backTo), only show back button full-width
  if (withBack && onBack && !onNext) {
    return (
      <div className="mml-stage-buttons">
        <button className="mml-btn-primary" onClick={onBack}>
          {resolvedBack}
        </button>
      </div>
    );
  }

  return (
    <div className="mml-stage-buttons">
      {withBack && onBack && (
        <button className="mml-btn-secondary" onClick={onBack}>
          {resolvedBack}
        </button>
      )}
      {onNext && (
        <button
          className={`mml-btn-primary ${nextDisabled ? 'mml--disabled' : ''}`}
          onClick={nextDisabled ? undefined : onNext}
        >
          {resolvedNext}
        </button>
      )}
    </div>
  );
};
