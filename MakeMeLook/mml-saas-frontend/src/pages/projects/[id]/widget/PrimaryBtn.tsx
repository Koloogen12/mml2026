import type { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { WidgetConfig } from './types';

interface PrimaryBtnProps {
  config: WidgetConfig;
  fontFamily: string;
  children: ReactNode;
  className?: string;
}

export const PrimaryBtn: FC<PrimaryBtnProps> = ({
  config,
  fontFamily,
  children,
  className,
}) => (
  <button
    type="button"
    className={cn(
      'h-8 px-7 rounded-2xl text-xs font-medium border-none cursor-pointer transition-opacity hover:opacity-80',
      className,
    )}
    style={{
      backgroundColor: config.accent_color,
      color: config.accent_text_color,
      fontFamily,
    }}
  >
    {children}
  </button>
);
