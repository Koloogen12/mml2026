import { type FC, useState, useEffect } from 'react';
import { useWidgetStore } from '@/store';
import { listFavorites } from '@/api';
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

export const SettingsStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const sessionToken = useWidgetStore((s) => s.sessionToken);
  const [hasFavorites, setHasFavorites] = useState(false);

  useEffect(() => {
    if (!sessionToken) return;
    listFavorites(sessionToken)
      .then((items) => setHasFavorites(items.length > 0))
      .catch(() => setHasFavorites(false));
  }, [sessionToken]);

  return (
    <StageLayout heading={t('settings.heading')} showBack>
      <div className="mml-settings__nav">
        <NavItem
          label={t('settings.favorites')}
          onClick={() => goToStage('favorites')}
          disabled={!hasFavorites}
        />
        <NavItem
          label={t('settings.uploadPhoto')}
          onClick={() => goToStage('photoUpload', 'settings')}
        />
        <NavItem
          label={t('settings.basicParams')}
          onClick={() => goToStage('gender', 'settings')}
        />
        <NavItem
          label={t('settings.chestCirc')}
          onClick={() => goToStage('measurements', 'settings')}
        />
        <NavItem
          label={t('settings.bodyShape')}
          onClick={() => goToStage('bellyShape', 'settings')}
        />
        <NavItem
          label={t('settings.figureType')}
          onClick={() => goToStage('figureType', 'settings')}
        />
        <div className="mml-settings__separator" />
        <NavItem
          label={t('settings.account')}
          onClick={() => goToStage('account')}
          secondary
        />
        <NavItem
          label={t('settings.privacyPolicy')}
          onClick={() => goToStage('privacyPolicy', 'settings')}
          secondary
        />
      </div>
    </StageLayout>
  );
};
