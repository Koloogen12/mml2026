import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

const CloseIcon: FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="4" y1="4" x2="12" y2="12" />
    <line x1="12" y1="4" x2="4" y2="12" />
  </svg>
);

interface WidgetModalProps {
  children: React.ReactNode;
  hideChrome?: boolean;
}

export const WidgetModal: FC<WidgetModalProps> = ({
  children,
  hideChrome = false,
}) => {
  const isOpen = useWidgetStore((s) => s.isOpen);
  const config = useWidgetStore((s) => s.config);
  const close = useWidgetStore((s) => s.close);

  if (!config) return null;

  return (
    <div
      className={cn('mml-overlay', isOpen && 'mml-overlay--open')}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={cn('mml-modal', hideChrome && 'mml-modal--fullscreen')}>
        {!hideChrome && (
          <div className="mml-modal__header">
            <h2 className="mml-modal__title">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" style={{ height: 24 }} />
              ) : (
                'MakeMeLook'
              )}
            </h2>
            <button
              className="mml-modal__close"
              onClick={close}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {hideChrome && (
          <button
            className="mml-modal__close mml-modal__close--floating"
            onClick={close}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        )}

        <div className="mml-modal__body">{children}</div>

        {!hideChrome && config.poweredByEnabled && (
          <div className="mml-modal__footer">
            <span className="mml-modal__powered">{t('common.poweredBy')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
