import { type FC, useState } from 'react';
import { useWidgetStore } from '@/store';
import { t } from '@/i18n';
import { matchAvatars } from '@/api';
import { StageLayout } from '@/components/StageLayout';

export const PhotoChoiceStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const config = useWidgetStore((s) => s.config);
  const bodyParams = useWidgetStore((s) => s.bodyParams);
  const setModelPhoto = useWidgetStore((s) => s.setModelPhoto);

  const avatarsEnabled = config?.avatarsEnabled ?? false;
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);
  const [autoMatchError, setAutoMatchError] = useState<string | null>(null);

  const handleAutoMatch = async () => {
    setAutoMatchLoading(true);
    setAutoMatchError(null);
    try {
      const matched = await matchAvatars({
        gender: bodyParams.gender ?? 'female',
        height: bodyParams.height ?? 165,
        weight: bodyParams.weight ?? 60,
        figure_type: bodyParams.figureType ?? undefined,
      });
      if (matched.length > 0) {
        setModelPhoto(matched[0].public_id, matched[0].photo_url);
        goToStage('showroom');
      } else {
        setAutoMatchError(t('photoChoice.noMatch'));
      }
    } catch {
      setAutoMatchError(t('photoChoice.matchFailed'));
    } finally {
      setAutoMatchLoading(false);
    }
  };

  return (
    <StageLayout
      heading={t('photoChoice.heading')}
      subheading={t('photoChoice.subheading')}
      showBack
    >

      <div className="mml-photo-choice__options">
        <div
          className="mml-photo-choice__option"
          onClick={() => goToStage('photoUpload')}
        >
          <div className="mml-photo-choice__option-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div className="mml-photo-choice__option-title">{t('photoChoice.uploadTitle')}</div>
          <div className="mml-photo-choice__option-desc">
            {t('photoChoice.uploadDesc')}
          </div>
        </div>

        {avatarsEnabled && (
          <div
            className="mml-photo-choice__option"
            onClick={() => goToStage('avatarCollection')}
          >
            <div className="mml-photo-choice__option-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="mml-photo-choice__option-title">{t('photoChoice.avatarTitle')}</div>
            <div className="mml-photo-choice__option-desc">
              {t('photoChoice.avatarDesc')}
            </div>
          </div>
        )}

        {avatarsEnabled && (
          <div
            className={`mml-photo-choice__option ${autoMatchLoading ? 'mml-photo-choice__option--loading' : ''}`}
            onClick={autoMatchLoading ? undefined : handleAutoMatch}
          >
            <div className="mml-photo-choice__option-icon">
              {autoMatchLoading ? (
                <div className="mml-spinner" style={{ padding: 0 }}>
                  <div
                    className="mml-spinner__circle"
                    style={{ width: 32, height: 32 }}
                  />
                </div>
              ) : (
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              )}
            </div>
            <div className="mml-photo-choice__option-title">
              {autoMatchLoading ? t('photoChoice.autoMatchLoading') : t('photoChoice.autoMatchTitle')}
            </div>
            <div className="mml-photo-choice__option-desc">
              {t('photoChoice.autoMatchDesc')}
            </div>
          </div>
        )}
      </div>

      {autoMatchError && (
        <div className="mml-photo-choice__error">{autoMatchError}</div>
      )}
    </StageLayout>
  );
};
