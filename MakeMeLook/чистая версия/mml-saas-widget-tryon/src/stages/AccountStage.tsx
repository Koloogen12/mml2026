import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { StageLayout } from '@/components/StageLayout';
import { t } from '@/i18n';

interface NavItemProps {
  label: string;
  onClick: () => void;
  secondary?: boolean;
  disabled?: boolean;
}

const NavItem: FC<NavItemProps> = ({ label, onClick, secondary, disabled }) => (
  <div
    className={`mml-settings__nav-item ${secondary ? 'mml-settings__nav-item--secondary' : ''} ${disabled ? 'mml--disabled' : ''}`}
    onClick={disabled ? undefined : onClick}
  >
    {label}
  </div>
);

export const AccountStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const email = useWidgetStore((s) => s.email);
  const tryOnHistory = useWidgetStore((s) => s.tryOnHistory);
  const cart = useWidgetStore((s) => s.cart);
  const config = useWidgetStore((s) => s.config);

  const el = config?.elementsEnabled;
  const showHistory = el?.history ?? true;
  const showCart = el?.cart ?? true;

  return (
    <StageLayout heading={t('account.heading')} showBack>
      <div className="mml-settings__nav">
        <NavItem
          label={email || t('account.email')}
          onClick={() => goToStage('accountEmail')}
        />
        {showHistory && (
          <NavItem
            label={t('account.fittingHistory')}
            onClick={() => goToStage('history')}
            disabled={tryOnHistory.length === 0}
          />
        )}
        {showCart && (
          <NavItem
            label={t('account.myPurchases')}
            onClick={() => goToStage('cart')}
            disabled={cart.length === 0}
          />
        )}
        <div className="mml-settings__separator" />
        <NavItem
          label={t('account.deleteAccount')}
          onClick={() => goToStage('deleteAccount')}
          secondary
        />
      </div>
    </StageLayout>
  );
};
