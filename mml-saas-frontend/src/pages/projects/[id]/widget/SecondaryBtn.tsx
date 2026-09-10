import type { FC, ReactNode } from 'react';
import type { WidgetConfig } from './types';

interface SecondaryBtnProps {
  config: WidgetConfig;
  fontFamily: string;
  children: ReactNode;
}

export const SecondaryBtn: FC<SecondaryBtnProps> = ({
  config,
  fontFamily,
  children,
}) => (
  <button
    type="button"
    className="h-8 px-7 rounded-2xl text-xs font-medium border-none cursor-pointer transition-opacity hover:opacity-80"
    style={{
      backgroundColor: config.secondary_text_color + '20',
      color: config.secondary_text_color,
      fontFamily,
    }}
  >
    {children}
  </button>
);
