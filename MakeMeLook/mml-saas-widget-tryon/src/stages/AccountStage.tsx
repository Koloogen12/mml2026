import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { StageLayout } from '@/components/StageLayout';
import { t } from '@/i18n';

export const AccountStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const email = useWidgetStore((s) => s.email);
  const tryOnHistory = useWidgetStore((s) => s.tryOnHistory);
  const cart = useWidgetStore((s) => s.cart);

  return (
    <StageLayout heading={t('account.heading')} showBack>
      <div className="mml-settings__nav">
        <div
          className="mml-settings__nav-item"
          onClick={() => goToStage('accountEmail')}
        >
          {email || t('account.email')}
        </div>
        <div
          className={`mml-settings__nav-item ${tryOnHistory.length === 0 ? 'mml--disabled' : ''}`}
          onClick={
            tryOnHistory.length > 0 ? () => goToStage('history') : undefined
          }
        >
          {t('account.fittingHistory')}
        </div>
        <div
          className={`mml-settings__nav-item ${cart.length === 0 ? 'mml--disabled' : ''}`}
          onClick={cart.length > 0 ? () => goToStage('cart') : undefined}
        >
          {t('account.myPurchases')}
        </div>
      </div>
      <div className="mml-settings__nav mml-settings__nav--danger">
        <div
          className="mml-settings__nav-item mml-settings__nav-item--secondary"
          onClick={() => goToStage('deleteAccount')}
        >
          {t('account.deleteAccount')}
        </div>
      </div>
    </StageLayout>
  );
};
