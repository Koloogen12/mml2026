import type { FC } from 'react';
import type { Gender } from '@/types';
import { t } from '@/i18n';

interface ZoneSwitcherProps {
  value: Gender;
  onChange: (gender: Gender) => void;
}

const FemaleIcon: FC = () => (
  <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
    <path
      d="M7 0C4.24 0 2 2.24 2 5C2 7.76 4.24 10 7 10C9.76 10 12 7.76 12 5C12 2.24 9.76 0 7 0ZM7 8C5.35 8 4 6.65 4 5C4 3.35 5.35 2 7 2C8.65 2 10 3.35 10 5C10 6.65 8.65 8 7 8Z"
      fill="currentColor"
    />
    <path d="M8 11H6V15H3V17H6H8H11V15H8V11Z" fill="currentColor" />
  </svg>
);

const MaleIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M10 0V2H12.59L9.35 5.24C8.34 4.46 7.08 4 5.7 4C2.55 4 0 6.55 0 9.7C0 12.85 2.55 15.4 5.7 15.4C8.85 15.4 11.4 12.85 11.4 9.7C11.4 8.32 10.94 7.06 10.17 6.05L13.41 2.81V5.4H15.41V0H10ZM5.7 13.4C3.66 13.4 2 11.74 2 9.7C2 7.66 3.66 6 5.7 6C7.74 6 9.4 7.66 9.4 9.7C9.4 11.74 7.74 13.4 5.7 13.4Z"
      fill="currentColor"
    />
  </svg>
);

export const ZoneSwitcher: FC<ZoneSwitcherProps> = ({ value, onChange }) => {
  return (
    <div className="mml-zone-switcher">
      <div
        className={`mml-zone-switcher__item ${value === 'female' ? 'active' : ''}`}
        onClick={() => onChange('female')}
      >
        <FemaleIcon />
        <span>{t('common.female')}</span>
      </div>
      <div
        className={`mml-zone-switcher__item ${value === 'male' ? 'active' : ''}`}
        onClick={() => onChange('male')}
      >
        <MaleIcon />
        <span>{t('common.male')}</span>
      </div>
    </div>
  );
};
