import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { cn } from '@/lib/utils';

const TryOnIcon: FC = () => (
  <svg
    className="mml-button__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

export const WidgetButton: FC = () => {
  const config = useWidgetStore((s) => s.config);
  const open = useWidgetStore((s) => s.open);

  if (!config) return null;

  const positionClass = `mml-button--${config.buttonPosition}`;
  const animationClass =
    config.buttonAnimation !== 'none'
      ? `mml-button--${config.buttonAnimation}`
      : '';
  const typeClass = config.buttonType !== 'circle' ? `mml-button--${config.buttonType}` : '';

  // Apply custom offsets via inline style
  const offsetStyle: React.CSSProperties = {};
  const pos = config.buttonPosition;
  if (pos.includes('right')) offsetStyle.right = `${config.buttonOffsetX}px`;
  if (pos.includes('left')) offsetStyle.left = `${config.buttonOffsetX}px`;
  if (pos.includes('bottom')) offsetStyle.bottom = `${config.buttonOffsetY}px`;
  // center-right/center-left keep top: 50%

  return (
    <button
      className={cn('mml-button', positionClass, animationClass, typeClass)}
      style={offsetStyle}
      onClick={open}
      aria-label={config.buttonText}
      title={config.buttonText}
    >
      <TryOnIcon />
      {config.buttonType === 'pill' && config.buttonText && (
        <span className="mml-button__text">{config.buttonText}</span>
      )}
    </button>
  );
};
